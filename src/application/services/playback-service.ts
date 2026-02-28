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
import { useToastStore } from '@/src/application/state/toast-store';
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
		let resolve: () => void = () => {};
		this.playLock = new Promise<void>((r) => {
			resolve = r;
		});

		try {
			await previousLock;
			return await operation();
		} finally {
			resolve();
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
		this.playbackProviders = [...this.playbackProviders, provider];
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
			this.playbackProviders = this.playbackProviders.filter((_, i) => i !== index);
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
			this.audioSourceProviders = [...this.audioSourceProviders, provider];
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
			usePlayerStore.getState().play(track);

			const streamResult = await this._resolveStreamForTrack(track);
			if (!streamResult.success) {
				return this._handlePlayError(streamResult.error, track);
			}

			return this._startPlaybackWithProvider(track, streamResult.data);
		});
	}

	/**
	 * Stops the active provider and resolves the audio stream in parallel
	 * to reduce latency when switching tracks.
	 */
	private async _resolveStreamForTrack(track: Track): Promise<Result<AudioStream, Error>> {
		playbackTimer.beginPhase('stop+resolve');

		const stopPromise = this._stopActiveProvider();
		const streamPromise = this._getAudioStream(track);
		const [, streamResult] = await Promise.all([stopPromise, streamPromise]);

		playbackTimer.endPhase();
		return streamResult;
	}

	private async _startPlaybackWithProvider(
		track: Track,
		audioStream: AudioStream
	): Promise<Result<void, Error>> {
		const provider = this.getProviderForUrl(audioStream.url);
		if (!provider) {
			return this._handlePlayError(
				new Error('No playback provider available for this stream type'),
				track
			);
		}

		if (this.activeProvider && this.activeProvider !== provider) {
			logger.debug(
				`Provider switch: ${this.activeProvider.manifest.id} → ${provider.manifest.id}`
			);
			await this._stopProvider(this.activeProvider);
		}

		this.activeProvider = provider;

		try {
			return await this._invokeProviderPlay(track, audioStream, provider);
		} catch (error) {
			const wrapped = error instanceof Error ? error : new Error('Unknown error');
			return this._handlePlayError(wrapped, track);
		}
	}

	private async _invokeProviderPlay(
		track: Track,
		audioStream: AudioStream,
		provider: PlaybackProvider
	): Promise<Result<void, Error>> {
		playbackTimer.beginPhase('provider-play');
		const playResult = await provider.play(
			track,
			audioStream.url,
			undefined,
			audioStream.headers
		);
		playbackTimer.endPhase();

		if (!playResult.success) return this._handlePlayError(playResult.error, track);

		playbackTimer.finish();
		return ok(undefined);
	}

	private _handlePlayError(error: Error, track: Track): Result<void, Error> {
		playbackTimer.cancel();
		usePlayerStore.getState()._setError(error.message);
		this._streamCache.clear();
		logger.warn(`Playback failed for: ${track.title} — ${error.message}`);
		useToastStore.getState().show({
			title: 'Playback failed',
			description: 'Could not play this track.',
			variant: 'error',
			duration: 4000,
		});
		return err(error);
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

	private async _getAudioStream(track: Track): Promise<Result<AudioStream, Error>> {
		logger.debug('getAudioStream called for track:', track.title);

		const cachedStream = this._getCachedStream(track.id.value);
		if (cachedStream) return ok(cachedStream);

		const localResult = await this._tryLocalSource(track);
		if (localResult) return localResult;

		const providerResult = await this._tryAudioSourceProviders(track);
		if (providerResult) return providerResult;

		return err(new Error(`No audio source available for track: ${track.title}`));
	}

	private async _tryLocalSource(track: Track): Promise<Result<AudioStream, Error> | null> {
		const resolvedSource = downloadService.resolveTrackSource(track);
		logger.debug('Resolved source type:', resolvedSource.type);
		if (!isLocallyAvailable(resolvedSource)) return null;

		const filePath = getPlaybackUri(resolvedSource);
		if (!filePath) return null;

		const fileInfo = await getFileInfo(filePath);
		if (fileInfo.exists) return ok(this._createLocalStream(resolvedSource, filePath));

		if (resolvedSource.type === 'downloaded') {
			logger.warn(`Downloaded file missing, removing: ${filePath}`);
			await downloadService.removeDownload(track.id.value);
		}
		return null;
	}

	private _createLocalStream(
		resolvedSource: ReturnType<typeof downloadService.resolveTrackSource>,
		filePath: string
	): AudioStream {
		logger.debug(`Using local file: ${filePath}`);
		let format: AudioFormat = 'm4a';
		if (resolvedSource.type === 'downloaded') {
			format = resolvedSource.fileType as AudioFormat;
		} else if (resolvedSource.type === 'local' && resolvedSource.fileType) {
			format = resolvedSource.fileType as AudioFormat;
		}
		return createAudioStream({ url: filePath, format, quality: 'high' });
	}

	private async _tryAudioSourceProviders(
		track: Track
	): Promise<Result<AudioStream, Error> | null> {
		const preferred = this._findPreferredProvider(track);

		if (preferred) {
			const result = await this._tryProvider(preferred, track);
			if (result) return result;
		}

		return this._tryFallbackProviders(track, preferred);
	}

	private _findPreferredProvider(track: Track): AudioSourceProvider | undefined {
		return this.audioSourceProviders.find((p) => {
			const supports = p.supportsTrack(track);
			logger.debug(`Provider ${p.manifest.id} supportsTrack: ${supports}`);
			return supports;
		});
	}

	private async _tryProvider(
		provider: AudioSourceProvider,
		track: Track,
		allowRetry = true
	): Promise<Result<AudioStream, Error> | null> {
		logger.debug('Found supporting provider:', provider.manifest.id);
		const result = await provider.getStreamUrl(track);
		if (result.success) {
			logger.debug('Got audio stream successfully');
			this._cacheStream(track.id.value, result.data);
			return ok(result.data);
		}
		logger.debug('getStreamUrl failed:', result.error);

		if (allowRetry && provider.onStreamError) {
			logger.debug('Triggering onStreamError and retrying silently');
			await provider.onStreamError();
			return this._tryProvider(provider, track, false);
		}

		return null;
	}

	private async _tryFallbackProviders(
		track: Track,
		exclude?: AudioSourceProvider
	): Promise<Result<AudioStream, Error> | null> {
		for (const provider of this.audioSourceProviders) {
			if (provider === exclude) continue;
			try {
				if (!provider.supportsTrack(track)) continue;
				const result = await provider.getStreamUrl(track);
				if (result.success) {
					this._cacheStream(track.id.value, result.data);
					return ok(result.data);
				}
			} catch {}
		}
		return null;
	}

	private async _stopActiveProvider(): Promise<void> {
		if (!this.activeProvider) return;
		await this._stopProvider(this.activeProvider);
	}

	private async _stopProvider(provider: PlaybackProvider): Promise<void> {
		logger.debug(`Stopping provider: ${provider.manifest.id}`);
		try {
			await provider.stop();
		} catch (e) {
			logger.warn(
				`Error stopping provider ${provider.manifest.id}:`,
				e instanceof Error ? e : undefined
			);
		}
	}

	private setupEventListener(): void {
		this.eventListener = (event: PlaybackEvent) => {
			this._handlePlaybackEvent(event);
		};
	}

	private _handlePlaybackEvent(event: PlaybackEvent): void {
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
			case 'remote-skip-next':
				logger.debug(`${event.type} received - calling skipToNext`);
				setTimeout(() => this.skipToNext(), 0);
				break;
			case 'remote-skip-previous':
				logger.debug('Remote skip previous - calling skipToPrevious');
				setTimeout(() => this.skipToPrevious(), 0);
				break;
			case 'error':
				this._handlePlaybackErrorEvent(event, store);
				break;
		}
	}

	private _handlePlaybackErrorEvent(
		event: PlaybackEvent & { readonly type: 'error' },
		store: ReturnType<typeof usePlayerStore.getState>
	): void {
		logger.debug(`Error event: ${event.error.message}`);
		store._setError(event.error.message);
		this._streamCache.clear();
		useToastStore.getState().show({
			title: 'Playback failed',
			description: 'Could not play this track.',
			variant: 'error',
			duration: 4000,
		});
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
