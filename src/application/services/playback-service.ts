import type { AudioFormat, AudioStream, Track } from '@/src/domain';
import { createAudioStream, Duration, getPlaybackUri, isLocallyAvailable } from '@/src/domain';
import type { RepeatMode } from '@/src/domain/value-objects/playback-state';
import type {
	AudioSourceProvider,
	PlaybackEvent,
	PlaybackEventListener,
	PlaybackProvider,
} from '@plugins/core';
import { usePlayerStore } from '@/src/application';
import { err, ok, type Result } from '@/src/shared';
import { getLogger } from '@shared/services/logger';
import { playbackTimer } from '@shared/services/playback-timer';
import { downloadService } from './download-service';
import { getFileInfo } from '@infrastructure/filesystem';

const logger = getLogger('PlaybackService');

const STREAM_CACHE_TTL_MS = 5 * 60 * 1000;

interface CachedStream {
	readonly stream: AudioStream;
	readonly cachedAt: number;
}

export class PlaybackService {
	private playbackProviders: PlaybackProvider[] = [];
	private activeProvider: PlaybackProvider | null = null;
	private audioSourceProviders: AudioSourceProvider[] = [];
	private eventListener: PlaybackEventListener | null = null;
	private playLock: Promise<void> = Promise.resolve();
	private readonly _streamCache = new Map<string, CachedStream>();

	constructor() {
		this.setupEventListener();
	}

	/**
	 * Serialize play operations to prevent race conditions
	 * when rapidly switching tracks.
	 */
	private async withPlayLock<T>(operation: () => Promise<T>): Promise<T> {
		const previousLock = this.playLock;
		let resolve: () => void;
		this.playLock = new Promise<void>((r) => {
			resolve = r;
		});

		try {
			await previousLock;
			return await operation();
		} finally {
			resolve!();
		}
	}

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

	addPlaybackProvider(provider: PlaybackProvider): void {
		if (this.playbackProviders.some((p) => p.manifest.id === provider.manifest.id)) {
			return;
		}
		this.playbackProviders.push(provider);
		if (this.eventListener) {
			provider.addEventListener(this.eventListener);
		}
		logger.debug(`Added playback provider: ${provider.manifest.id}`);
	}

	removePlaybackProvider(providerId: string): void {
		const index = this.playbackProviders.findIndex((p) => p.manifest.id === providerId);
		if (index !== -1) {
			const provider = this.playbackProviders[index];
			if (this.eventListener) {
				provider.removeEventListener(this.eventListener);
			}
			this.playbackProviders.splice(index, 1);
			logger.debug(`Removed playback provider: ${providerId}`);
		}
	}

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

	setAudioSourceProviders(providers: AudioSourceProvider[]): void {
		this.audioSourceProviders = providers;
	}

	addAudioSourceProvider(provider: AudioSourceProvider): void {
		if (!this.audioSourceProviders.includes(provider)) {
			this.audioSourceProviders.push(provider);
		}
	}

	removeAudioSourceProvider(providerId: string): void {
		this.audioSourceProviders = this.audioSourceProviders.filter(
			(p) => p.manifest.id !== providerId
		);
	}

	async play(track: Track): Promise<Result<void, Error>> {
		return this.withPlayLock(async () => {
			playbackTimer.start(track.title);

			// Update UI state immediately so the user sees loading state
			usePlayerStore.getState().play(track);

			// Run stop and stream resolution in parallel to reduce latency.
			// Stream resolution is the slowest part; overlapping it with
			// stopping the previous track saves significant time.
			playbackTimer.beginPhase('stop+resolve');

			const stopPromise = this._stopActiveProvider();
			const streamPromise = this.getAudioStream(track);

			const [, streamResult] = await Promise.all([stopPromise, streamPromise]);

			playbackTimer.endPhase();

			if (!streamResult.success) {
				playbackTimer.cancel();
				usePlayerStore.getState()._setError(streamResult.error.message);
				return err(streamResult.error);
			}

			try {
				const audioStream = streamResult.data;
				const provider = this.getProviderForUrl(audioStream.url);

				if (!provider) {
					playbackTimer.cancel();
					const error = new Error('No playback provider available for this stream type');
					usePlayerStore.getState()._setError(error.message);
					return err(error);
				}

				this.activeProvider = provider;

				playbackTimer.beginPhase('provider-play');

				const playResult = await provider.play(
					track,
					audioStream.url,
					undefined,
					audioStream.headers
				);

				playbackTimer.endPhase();

				if (!playResult.success) {
					playbackTimer.cancel();
					usePlayerStore.getState()._setError(playResult.error.message);
					return err(playResult.error);
				}

				playbackTimer.finish();

				// Preload next track's stream URL in background
				this._preloadNextTrackStream();

				return ok(undefined);
			} catch (error) {
				playbackTimer.cancel();
				const errorMessage = error instanceof Error ? error.message : 'Unknown error';
				usePlayerStore.getState()._setError(errorMessage);
				return err(error instanceof Error ? error : new Error(errorMessage));
			}
		});
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

		// If only one track in queue or position > 3s, just seek to start
		if (state.queue.length <= 1 || state.position.totalSeconds > 3) {
			return this.seekTo(Duration.ZERO);
		}

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

	setRepeatMode(mode: RepeatMode): void {
		if (this.activeProvider) {
			this.activeProvider.setRepeatMode(mode);
		}
	}

	async setVolume(volume: number): Promise<Result<void, Error>> {
		if (!this.activeProvider) {
			return err(new Error('No playback provider available'));
		}
		usePlayerStore.getState().setVolume(volume);
		return this.activeProvider.setVolume(volume);
	}

	private _getCachedStream(trackId: string): AudioStream | null {
		const cached = this._streamCache.get(trackId);
		if (!cached) return null;

		const age = Date.now() - cached.cachedAt;
		if (age > STREAM_CACHE_TTL_MS) {
			this._streamCache.delete(trackId);
			return null;
		}

		logger.debug(`Stream cache hit for track: ${trackId}`);
		return cached.stream;
	}

	private _cacheStream(trackId: string, stream: AudioStream): void {
		this._streamCache.set(trackId, {
			stream,
			cachedAt: Date.now(),
		});

		// Evict stale entries when cache grows beyond reasonable size
		if (this._streamCache.size > 50) {
			this._evictStaleEntries();
		}
	}

	private _evictStaleEntries(): void {
		const now = Date.now();
		for (const [key, value] of this._streamCache) {
			if (now - value.cachedAt > STREAM_CACHE_TTL_MS) {
				this._streamCache.delete(key);
			}
		}
	}

	private async getAudioStream(track: Track): Promise<Result<AudioStream, Error>> {
		logger.debug('getAudioStream called for track:', track.title);

		// Check stream cache first for instant resolution
		const cachedStream = this._getCachedStream(track.id.value);
		if (cachedStream) {
			return ok(cachedStream);
		}

		const resolvedSource = downloadService.resolveTrackSource(track);
		logger.debug('Resolved source type:', resolvedSource.type);

		if (isLocallyAvailable(resolvedSource)) {
			const filePath = getPlaybackUri(resolvedSource);
			if (filePath) {
				const fileInfo = await getFileInfo(filePath);
				if (fileInfo.exists) {
					logger.debug(`Using local file: ${filePath}`);
					let format: AudioFormat = 'm4a';
					if (resolvedSource.type === 'downloaded') {
						format = resolvedSource.fileType as AudioFormat;
					} else if (resolvedSource.type === 'local' && resolvedSource.fileType) {
						format = resolvedSource.fileType as AudioFormat;
					}
					const stream = createAudioStream({
						url: filePath,
						format,
						quality: 'high',
					});
					return ok(stream);
				} else if (resolvedSource.type === 'downloaded') {
					logger.warn(`Downloaded file missing, removing: ${filePath}`);
					await downloadService.removeDownload(track.id.value);
				}
			}
		}

		const supportingProvider = this.audioSourceProviders.find((p) => {
			const supports = p.supportsTrack(track);
			logger.debug(`Provider ${p.manifest.id} supportsTrack: ${supports}`);
			return supports;
		});

		if (supportingProvider) {
			logger.debug('Found supporting provider:', supportingProvider.manifest.id);
			const result = await supportingProvider.getStreamUrl(track);
			if (result.success) {
				logger.debug('Got audio stream successfully');
				this._cacheStream(track.id.value, result.data);
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
					const result = await provider.getStreamUrl(track);
					if (result.success) {
						this._cacheStream(track.id.value, result.data);
						return ok(result.data);
					}
				}
			} catch {}
		}

		return err(new Error(`No audio source available for track: ${track.title}`));
	}

	private async _stopActiveProvider(): Promise<void> {
		if (!this.activeProvider) return;

		logger.debug('Stopping current playback before starting new track...');
		try {
			await this.activeProvider.stop();
		} catch (e) {
			logger.warn('Error stopping previous playback:', e instanceof Error ? e : undefined);
		}
	}

	/**
	 * Preload the next track's stream URL in the background so that
	 * skipping to it is near-instant.
	 */
	private _preloadNextTrackStream(): void {
		const state = usePlayerStore.getState();
		const nextIndex = state.queueIndex + 1;

		if (nextIndex >= state.queue.length) return;

		const nextTrack = state.queue[nextIndex];
		if (!nextTrack) return;

		// Skip if already cached
		if (this._getCachedStream(nextTrack.id.value)) return;

		// Resolve in background without blocking current playback
		this.getAudioStream(nextTrack)
			.then((result) => {
				if (result.success) {
					logger.debug(`Preloaded stream for next track: ${nextTrack.title}`);
				}
			})
			.catch(() => {
				// Preload failures are non-critical
			});
	}

	private setupEventListener(): void {
		this.eventListener = (event: PlaybackEvent) => {
			const store = usePlayerStore.getState();

			switch (event.type) {
				case 'status-change':
					logger.debug(`Status change: ${event.status}`);
					store._setStatus(event.status);
					break;
				case 'position-change':
					store._setPosition(event.position);
					break;
				case 'duration-change':
					store._setDuration(event.duration);
					break;
				case 'ended':
					logger.debug('Ended event received - calling skipToNext');
					// Defer to next tick to avoid threading issues on Android
					// The callback may fire on a background thread, and ExoPlayer
					// requires all operations to happen on the main thread
					setTimeout(() => this.skipToNext(), 0);
					break;
				case 'remote-skip-next':
					logger.debug('Remote skip next received - calling skipToNext');
					setTimeout(() => this.skipToNext(), 0);
					break;
				case 'remote-skip-previous':
					logger.debug('Remote skip previous received - calling skipToPrevious');
					setTimeout(() => this.skipToPrevious(), 0);
					break;
				case 'error':
					logger.debug(`Error event: ${event.error.message}`);
					store._setError(event.error.message);
					this._streamCache.clear();
					for (const provider of this.audioSourceProviders) {
						provider.onStreamError?.();
					}
					break;
			}
		};
	}

	async dispose(): Promise<void> {
		this._streamCache.clear();
		if (this.activeProvider) {
			if (this.eventListener) {
				this.activeProvider.removeEventListener(this.eventListener);
			}
			await this.activeProvider.onDestroy();
		}
	}
}

export const playbackService = new PlaybackService();
