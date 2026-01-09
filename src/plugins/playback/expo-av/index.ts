/**
 * Expo AV Playback Provider Plugin
 * Handles standard audio URLs using expo-av
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import type { Track } from '@domain/entities/track';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus, RepeatMode } from '@domain/value-objects/playback-state';
import type {
  PlaybackProvider,
  PlaybackEvent,
  PlaybackEventListener,
  PlaybackCapability,
  QueueItem,
} from '@plugins/core/interfaces/playback-provider';
import type { PluginManifest, PluginStatus, PluginInitContext } from '@plugins/core/interfaces/base-plugin';
import { ok, err, type Result, type AsyncResult } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('ExpoAudio');

export class ExpoAudioPlaybackProvider implements PlaybackProvider {
  readonly manifest: PluginManifest = {
    id: 'expo-audio',
    name: 'Expo Audio Playback',
    version: '2.0.0',
    description: 'Audio playback using Expo AV',
    author: 'Aria',
    category: 'playback-provider',
    capabilities: ['play', 'pause', 'seek', 'volume-control', 'queue-management', 'background-play'],
  };

  readonly capabilities: Set<PlaybackCapability> = new Set([
    'play', 'pause', 'seek', 'volume-control', 'queue-management', 'background-play',
  ]);

  readonly configSchema = [];
  status: PluginStatus = 'uninitialized';

  private sound: Audio.Sound | null = null;
  private playbackStatus: PlaybackStatus = 'idle';
  private currentTrack: Track | null = null;
  private position: Duration = Duration.ZERO;
  private duration: Duration = Duration.ZERO;
  private volume: number = 1.0;
  private repeatMode: RepeatMode = 'off';
  private isShuffled: boolean = false;
  private queue: Track[] = [];
  private currentIndex: number = -1;
  private listeners: Set<PlaybackEventListener> = new Set();
  private positionUpdateInterval: ReturnType<typeof setInterval> | null = null;
  private isInitialized: boolean = false;

  async onInit(context?: PluginInitContext): AsyncResult<void, Error> {
    if (this.isInitialized) {
      this.status = 'ready';
      return ok(undefined);
    }
    try {
      this.status = 'initializing';
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.isInitialized = true;
      this.status = 'ready';
      return ok(undefined);
    } catch (error) {
      this.status = 'error';
      return err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async onActivate(): AsyncResult<void, Error> {
    this.status = 'active';
    return ok(undefined);
  }

  async onDeactivate(): AsyncResult<void, Error> {
    this.status = 'ready';
    return ok(undefined);
  }

  async onDestroy(): AsyncResult<void, Error> {
    await this.stop();
    this.stopPositionUpdates();
    this.listeners.clear();
    this.isInitialized = false;
    this.status = 'disabled';
    return ok(undefined);
  }

  hasCapability(capability: PlaybackCapability): boolean {
    return this.capabilities.has(capability);
  }

  async play(track: Track, streamUrl: string, startPosition?: Duration, headers?: Record<string, string>): AsyncResult<void, Error> {
    try {
      logger.debug('play called for track:', track.title);
      logger.debug('Stream URL length:', streamUrl.length);
      logger.debug('Headers:', headers ? JSON.stringify(headers) : 'none');

      if (this.sound) {
        logger.debug('Unloading previous sound...');
        await this.sound.unloadAsync();
        this.sound = null;
      }

      this.currentTrack = track;
      this.position = Duration.ZERO;
      this.duration = Duration.ZERO;
      this.updateStatus('loading');

      const source: { uri: string; headers?: Record<string, string> } = { uri: streamUrl };
      if (headers) source.headers = headers;

      logger.debug('Creating sound...');
      const { sound } = await Audio.Sound.createAsync(
        source,
        {
          shouldPlay: true,
          volume: this.volume,
          positionMillis: startPosition?.totalMilliseconds ?? 0,
        },
        this.onPlaybackStatusUpdate.bind(this)
      );

      logger.debug('Sound created successfully');
      this.sound = sound;
      this.updateStatus('playing');
      this.startPositionUpdates();
      this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });

      return ok(undefined);
    } catch (error) {
      logger.error('Error during playback', error instanceof Error ? error : undefined);
      this.updateStatus('error');
      const errorObj = error instanceof Error ? error : new Error(String(error));
      this.emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
      return err(errorObj);
    }
  }

  async pause(): AsyncResult<void, Error> {
    if (this.sound && this.playbackStatus === 'playing') {
      await this.sound.pauseAsync();
      this.updateStatus('paused');
      this.stopPositionUpdates();
    }
    return ok(undefined);
  }

  async resume(): AsyncResult<void, Error> {
    if (this.sound && this.playbackStatus === 'paused') {
      await this.sound.playAsync();
      this.updateStatus('playing');
      this.startPositionUpdates();
    }
    return ok(undefined);
  }

  async stop(): AsyncResult<void, Error> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (e) {}
      this.sound = null;
    }
    this.stopPositionUpdates();
    this.currentTrack = null;
    this.position = Duration.ZERO;
    this.duration = Duration.ZERO;
    this.updateStatus('idle');
    return ok(undefined);
  }

  async seek(position: Duration): AsyncResult<void, Error> {
    if (this.sound) {
      await this.sound.setPositionAsync(position.totalMilliseconds);
      this.position = position;
      this.emitEvent({ type: 'position-change', position, timestamp: Date.now() });
    }
    return ok(undefined);
  }

  async setPlaybackRate(rate: number): AsyncResult<void, Error> {
    if (this.sound) {
      await this.sound.setRateAsync(Math.max(0.5, Math.min(2.0, rate)), true);
    }
    return ok(undefined);
  }

  async setVolume(volume: number): AsyncResult<void, Error> {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.sound) {
      await this.sound.setVolumeAsync(this.volume);
    }
    return ok(undefined);
  }

  getVolume(): number { return this.volume; }
  getStatus(): PlaybackStatus { return this.playbackStatus; }
  getPosition(): Duration { return this.position; }
  getDuration(): Duration { return this.duration; }
  getCurrentTrack(): Track | null { return this.currentTrack; }

  getQueue(): QueueItem[] {
    return this.queue.map((track, index) => ({
      track, isActive: index === this.currentIndex, position: index,
    }));
  }

  async setQueue(tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> {
    this.queue = [...tracks];
    this.currentIndex = startIndex;
    this.emitEvent({ type: 'queue-change', tracks: this.queue, currentIndex: this.currentIndex, timestamp: Date.now() });
    return ok(undefined);
  }

  addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
    if (atIndex !== undefined && atIndex >= 0 && atIndex <= this.queue.length) {
      this.queue.splice(atIndex, 0, ...tracks);
      if (this.currentIndex >= atIndex) this.currentIndex += tracks.length;
    } else {
      this.queue.push(...tracks);
    }
    this.emitEvent({ type: 'queue-change', tracks: this.queue, currentIndex: this.currentIndex, timestamp: Date.now() });
    return ok(undefined);
  }

  removeFromQueue(index: number): Result<void, Error> {
    if (index >= 0 && index < this.queue.length) {
      this.queue.splice(index, 1);
      if (index < this.currentIndex) this.currentIndex--;
      else if (index === this.currentIndex) this.stop();
      this.emitEvent({ type: 'queue-change', tracks: this.queue, currentIndex: this.currentIndex, timestamp: Date.now() });
    }
    return ok(undefined);
  }

  clearQueue(): Result<void, Error> {
    this.queue = [];
    this.currentIndex = -1;
    this.emitEvent({ type: 'queue-change', tracks: [], currentIndex: -1, timestamp: Date.now() });
    return ok(undefined);
  }

  async skipToNext(): AsyncResult<void, Error> {
    if (this.currentIndex < this.queue.length - 1) {
      this.currentIndex++;
      return ok(undefined);
    }
    return err(new Error('No next track'));
  }

  async skipToPrevious(): AsyncResult<void, Error> {
    if (this.position.totalSeconds > 3) {
      return this.seek(Duration.ZERO);
    } else if (this.currentIndex > 0) {
      this.currentIndex--;
      return ok(undefined);
    }
    return err(new Error('No previous track'));
  }

  setRepeatMode(mode: RepeatMode): Result<void, Error> {
    this.repeatMode = mode;
    return ok(undefined);
  }

  getRepeatMode(): RepeatMode { return this.repeatMode; }

  setShuffle(enabled: boolean): Result<void, Error> {
    this.isShuffled = enabled;
    return ok(undefined);
  }

  isShuffle(): boolean { return this.isShuffled; }

  addEventListener(listener: PlaybackEventListener): () => void {
    this.listeners.add(listener);
    return () => this.removeEventListener(listener);
  }

  removeEventListener(listener: PlaybackEventListener): void {
    this.listeners.delete(listener);
  }

  private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
    if (!status.isLoaded) return;

    if (status.positionMillis !== undefined) {
      this.position = Duration.fromMilliseconds(status.positionMillis);
    }
    if (status.durationMillis !== undefined) {
      const newDuration = Duration.fromMilliseconds(status.durationMillis);
      if (newDuration.totalMilliseconds !== this.duration.totalMilliseconds) {
        this.duration = newDuration;
        this.emitEvent({ type: 'duration-change', duration: newDuration, timestamp: Date.now() });
      }
    }

    if (status.isBuffering) {
      this.updateStatus('buffering');
    } else if (status.isPlaying) {
      this.updateStatus('playing');
    } else if (this.playbackStatus !== 'idle' && this.playbackStatus !== 'loading') {
      this.updateStatus('paused');
    }

    if (status.didJustFinish && !status.isLooping) {
      this.handleTrackCompletion();
    }
  }

  private async handleTrackCompletion(): Promise<void> {
    if (this.currentIndex < this.queue.length - 1) {
      await this.skipToNext();
    } else {
      await this.stop();
      this.emitEvent({ type: 'ended', timestamp: Date.now() });
    }
  }

  private updateStatus(newStatus: PlaybackStatus): void {
    if (this.playbackStatus !== newStatus) {
      this.playbackStatus = newStatus;
      this.emitEvent({ type: 'status-change', status: newStatus, timestamp: Date.now() });
    }
  }

  private emitEvent(event: PlaybackEvent): void {
    this.listeners.forEach(listener => {
      try { listener(event); } catch (e) {}
    });
  }

  private startPositionUpdates(): void {
    this.stopPositionUpdates();
    this.positionUpdateInterval = setInterval(async () => {
      if (this.sound && this.playbackStatus === 'playing') {
        const status = await this.sound.getStatusAsync();
        if (status.isLoaded && status.positionMillis !== undefined) {
          this.position = Duration.fromMilliseconds(status.positionMillis);
          this.emitEvent({ type: 'position-change', position: this.position, timestamp: Date.now() });
        }
      }
    }, 1000);
  }

  private stopPositionUpdates(): void {
    if (this.positionUpdateInterval) {
      clearInterval(this.positionUpdateInterval);
      this.positionUpdateInterval = null;
    }
  }
}

export const expoAudioPlaybackProvider = new ExpoAudioPlaybackProvider();
