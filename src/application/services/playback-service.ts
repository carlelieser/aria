import type { Track } from '../../domain/entities/track';
import type { Duration } from '../../domain/value-objects/duration';
import type { AudioStream } from '../../domain/value-objects/audio-stream';
import type {
  PlaybackProvider,
  PlaybackEvent,
  PlaybackEventListener,
} from '../../plugins/core/interfaces/playback-provider';
import type { AudioSourceProvider } from '../../plugins/core/interfaces/audio-source-provider';
import { usePlayerStore } from '../state/player-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('PlaybackService');

/**
 * Playback service coordinates between audio source providers and playback providers.
 */
export class PlaybackService {
  private playbackProviders: PlaybackProvider[] = [];
  private activeProvider: PlaybackProvider | null = null;
  private audioSourceProviders: AudioSourceProvider[] = [];
  private eventListener: PlaybackEventListener | null = null;

  constructor() {
    this.setupEventListener();
  }

  /**
   * Register playback providers.
   */
  setPlaybackProviders(providers: PlaybackProvider[]): void {
    for (const provider of this.playbackProviders) {
      if (this.eventListener) {
        provider.removeEventListener(this.eventListener);
      }
    }

    this.playbackProviders = providers;

    if (this.eventListener) {
      for (const provider of this.playbackProviders) {
        provider.addEventListener(this.eventListener);
      }
    }

    logger.debug(`Registered ${providers.length} playback provider(s)`);
  }

  /**
   * Get the appropriate playback provider for a URL.
   */
  private getProviderForUrl(url: string): PlaybackProvider | null {
    for (const provider of this.playbackProviders) {
      if (provider.canHandle && provider.canHandle(url)) {
        logger.debug(`Using provider: ${provider.manifest.id}`);
        return provider;
      }
    }

    if (this.playbackProviders.length > 0) {
      const fallback = this.playbackProviders[this.playbackProviders.length - 1];
      logger.debug(`Using fallback provider: ${fallback.manifest.id}`);
      return fallback;
    }

    return null;
  }

  /**
   * Register audio source providers
   */
  setAudioSourceProviders(providers: AudioSourceProvider[]): void {
    this.audioSourceProviders = providers;
  }

  /**
   * Add an audio source provider
   */
  addAudioSourceProvider(provider: AudioSourceProvider): void {
    if (!this.audioSourceProviders.includes(provider)) {
      this.audioSourceProviders.push(provider);
    }
  }

  /**
   * Play a track
   */
  async play(track: Track): Promise<Result<void, Error>> {
    usePlayerStore.getState().play(track);

    try {
      const streamResult = await this.getAudioStream(track);

      if (!streamResult.success) {
        usePlayerStore.getState()._setError(streamResult.error.message);
        return err(streamResult.error);
      }

      const audioStream = streamResult.data;
      const provider = this.getProviderForUrl(audioStream.url);

      if (!provider) {
        const error = new Error('No playback provider available for this stream type');
        usePlayerStore.getState()._setError(error.message);
        return err(error);
      }

      if (this.activeProvider && this.activeProvider !== provider) {
        logger.debug('Switching playback providers, stopping previous...');
        await this.activeProvider.stop();
      }
      this.activeProvider = provider;

      const playResult = await provider.play(
        track,
        audioStream.url,
        undefined,
        audioStream.headers
      );

      if (!playResult.success) {
        usePlayerStore.getState()._setError(playResult.error.message);
        return err(playResult.error);
      }

      return ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      usePlayerStore.getState()._setError(errorMessage);
      return err(error instanceof Error ? error : new Error(errorMessage));
    }
  }

  async pause(): Promise<Result<void, Error>> {
    if (!this.activeProvider) {
      return err(new Error('No playback provider available'));
    }
    usePlayerStore.getState().pause();
    return this.activeProvider.pause();
  }

  async resume(): Promise<Result<void, Error>> {
    if (!this.activeProvider) {
      return err(new Error('No playback provider available'));
    }
    usePlayerStore.getState().resume();
    return this.activeProvider.resume();
  }

  async stop(): Promise<Result<void, Error>> {
    if (!this.activeProvider) {
      return err(new Error('No playback provider available'));
    }
    usePlayerStore.getState().stop();
    return this.activeProvider.stop();
  }

  async seekTo(position: Duration): Promise<Result<void, Error>> {
    if (!this.activeProvider) {
      return err(new Error('No playback provider available'));
    }
    usePlayerStore.getState().seekTo(position);
    return this.activeProvider.seek(position);
  }

  async skipToNext(): Promise<Result<void, Error>> {
    const state = usePlayerStore.getState();
    state.skipToNext();
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack) {
      return this.play(currentTrack);
    }
    return ok(undefined);
  }

  async skipToPrevious(): Promise<Result<void, Error>> {
    const state = usePlayerStore.getState();
    state.skipToPrevious();
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack) {
      return this.play(currentTrack);
    }
    return ok(undefined);
  }

  setQueue(tracks: Track[], startIndex = 0): void {
    usePlayerStore.getState().setQueue(tracks, startIndex);
    const currentTrack = usePlayerStore.getState().currentTrack;
    if (currentTrack) {
      this.play(currentTrack);
    }
  }

  async setVolume(volume: number): Promise<Result<void, Error>> {
    if (!this.activeProvider) {
      return err(new Error('No playback provider available'));
    }
    usePlayerStore.getState().setVolume(volume);
    return this.activeProvider.setVolume(volume);
  }

  /**
   * Get audio stream for a track with provider fallback
   */
  private async getAudioStream(track: Track): Promise<Result<AudioStream, Error>> {
    logger.debug('getAudioStream called for track:', track.title);
    logger.debug('Track source:', JSON.stringify(track.source));
    logger.debug('Available providers:', this.audioSourceProviders.length);

    const supportingProvider = this.audioSourceProviders.find((p) => {
      const supports = p.supportsTrack(track);
      logger.debug(`Provider ${p.manifest.id} supportsTrack: ${supports}`);
      return supports;
    });

    if (supportingProvider) {
      logger.debug('Found supporting provider:', supportingProvider.manifest.id);
      const result = await supportingProvider.getStreamUrl(track.id);
      if (result.success) {
        logger.debug('Got audio stream successfully');
        return ok(result.data);
      } else {
        logger.debug('getStreamUrl failed:', result.error);
      }
    } else {
      logger.debug('No supporting provider found');
    }

    for (const provider of this.audioSourceProviders) {
      if (provider === supportingProvider) continue;
      try {
        if (provider.supportsTrack(track)) {
          const result = await provider.getStreamUrl(track.id);
          if (result.success) {
            return ok(result.data);
          }
        }
      } catch {
        // Continue to next provider
      }
    }

    return err(new Error(`No audio source available for track: ${track.title}`));
  }

  private setupEventListener(): void {
    this.eventListener = (event: PlaybackEvent) => {
      const store = usePlayerStore.getState();

      switch (event.type) {
        case 'status-change':
          store._setStatus(event.status);
          break;
        case 'position-change':
          store._setPosition(event.position);
          break;
        case 'duration-change':
          store._setDuration(event.duration);
          break;
        case 'ended':
          this.skipToNext();
          break;
        case 'error':
          store._setError(event.error.message);
          break;
      }
    };
  }

  async dispose(): Promise<void> {
    if (this.activeProvider) {
      if (this.eventListener) {
        this.activeProvider.removeEventListener(this.eventListener);
      }
      await this.activeProvider.onDestroy();
    }
  }
}

export const playbackService = new PlaybackService();
