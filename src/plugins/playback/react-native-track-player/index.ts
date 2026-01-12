import TrackPlayer, {
	Capability,
	RepeatMode as RNTPRepeatMode,
	Event,
	type PlaybackState,
	type PlaybackActiveTrackChangedEvent,
	type PlaybackErrorEvent,
	type PlaybackProgressUpdatedEvent,
} from 'react-native-track-player';
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
import type {
	PluginManifest,
	PluginStatus,
	PluginInitContext,
} from '@plugins/core/interfaces/base-plugin';
import { ok, err, type Result, type AsyncResult } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { PLUGIN_MANIFEST, PLAYBACK_CAPABILITIES } from './config';
import { mapToRNTPTrack } from './track-mapper';
import { mapRNTPStateToStatus } from './event-mapper';

const logger = getLogger('RNTPProvider');

const PROGRESS_UPDATE_INTERVAL_SECONDS = 1;
const PROGRESS_POLL_INTERVAL_MS = 250;
const MIN_PLAYBACK_RATE = 0.5;
const MAX_PLAYBACK_RATE = 2.0;
const MIN_VOLUME = 0;
const MAX_VOLUME = 1;
const SKIP_PREVIOUS_THRESHOLD_SECONDS = 3;

export class RNTPPlaybackProvider implements PlaybackProvider {
	readonly manifest: PluginManifest = PLUGIN_MANIFEST;
	readonly capabilities: Set<PlaybackCapability> = new Set(PLAYBACK_CAPABILITIES);
	readonly configSchema = [];

	status: PluginStatus = 'uninitialized';

	private isSetup: boolean = false;
	private playbackStatus: PlaybackStatus = 'idle';
	private currentTrack: Track | null = null;
	private trackMap: Map<string, Track> = new Map();
	private position: Duration = Duration.ZERO;
	private duration: Duration = Duration.ZERO;
	private _volume: number = 1.0;
	private repeatMode: RepeatMode = 'off';
	private isShuffled: boolean = false;
	private queue: Track[] = [];
	private currentIndex: number = -1;
	private listeners: Set<PlaybackEventListener> = new Set();
	private eventSubscriptions: (() => void)[] = [];
	private operationLock: Promise<void> = Promise.resolve();
	private progressInterval: ReturnType<typeof setInterval> | null = null;

	private async withLock<T>(operation: () => Promise<T>): Promise<T> {
		const previousLock = this.operationLock;
		let resolve: (() => void) | undefined;
		this.operationLock = new Promise((r) => {
			resolve = r;
		});
		try {
			await previousLock;
			return await operation();
		} finally {
			if (resolve) {
				resolve();
			}
		}
	}

	async onInit(_context?: PluginInitContext): AsyncResult<void, Error> {
		if (this.isSetup) {
			this.status = 'ready';
			return ok(undefined);
		}

		try {
			this.status = 'initializing';

			await TrackPlayer.setupPlayer({
				autoHandleInterruptions: true,
			});

			await TrackPlayer.updateOptions({
				capabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.Stop,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
					Capability.SeekTo,
				],
				compactCapabilities: [
					Capability.Play,
					Capability.Pause,
					Capability.SkipToNext,
					Capability.SkipToPrevious,
				],
				progressUpdateEventInterval: PROGRESS_UPDATE_INTERVAL_SECONDS,
			});

			this.setupEventListeners();
			this.startProgressPolling();

			// Set initial volume (TrackPlayer defaults to 0 on some devices)
			await TrackPlayer.setVolume(this._volume);

			this.isSetup = true;
			this.status = 'ready';
			logger.debug('RNTP setup complete');
			return ok(undefined);
		} catch (error) {
			logger.error('Failed to setup RNTP', error instanceof Error ? error : undefined);
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
		this.stopProgressPolling();
		this.removeEventListeners();
		await this.stop();
		this.listeners.clear();
		this.trackMap.clear();
		this.isSetup = false;
		this.status = 'disabled';
		return ok(undefined);
	}

	hasCapability(capability: PlaybackCapability): boolean {
		return this.capabilities.has(capability);
	}

	canHandle(url: string): boolean {
		if (url.startsWith('data:application/dash+xml')) {
			return false;
		}

		if (url.includes('.m3u8') || url.includes('manifest/hls')) {
			return true;
		}

		if (
			url.endsWith('.mp3') ||
			url.endsWith('.m4a') ||
			url.endsWith('.aac') ||
			url.endsWith('.wav') ||
			url.endsWith('.ogg') ||
			url.endsWith('.flac')
		) {
			return true;
		}

		if (url.startsWith('file://') || url.startsWith('/')) {
			return true;
		}

		if (url.startsWith('http://') || url.startsWith('https://')) {
			return true;
		}

		return false;
	}

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		logger.debug('play() called for track:', track.title);
		logger.debug('play() call stack:', new Error().stack);
		logger.debug('Stream URL:', streamUrl.substring(0, 100) + '...');
		logger.debug('Headers present:', headers ? Object.keys(headers).join(', ') : 'none');
		logger.debug('isSetup:', this.isSetup, 'status:', this.status);

		if (!this.isSetup) {
			logger.debug('Player not initialized, calling onInit...');
			const initResult = await this.onInit();
			if (!initResult.success) {
				logger.error('Failed to initialize player');
				return initResult;
			}
		}

		return this.withLock(async () => {
			try {
				logger.debug('Acquired lock, resetting player...');

				await TrackPlayer.reset();
				logger.debug('Player reset complete');

				const rntpTrack = mapToRNTPTrack(track, streamUrl, headers);
				this.trackMap.set(rntpTrack.id, track);
				logger.debug('Adding track to player...');

				await TrackPlayer.add(rntpTrack);
				logger.debug('Track added successfully');

				this.currentTrack = track;
				this.position = Duration.ZERO;
				this.duration = track.duration;
				this.updateStatus('loading');

				if (startPosition && startPosition.totalMilliseconds > 0) {
					await TrackPlayer.seekTo(startPosition.totalSeconds);
				}

				logger.debug('Calling TrackPlayer.play()...');
				await TrackPlayer.play();
				logger.debug('TrackPlayer.play() returned');

				const state = await TrackPlayer.getPlaybackState();
				logger.debug('Actual playback state after play():', state.state);
				const activeTrack = await TrackPlayer.getActiveTrack();
				logger.debug('Active track:', activeTrack?.id, activeTrack?.url?.substring(0, 50));

				this.updateStatus('playing');
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });
				this.emitEvent({
					type: 'duration-change',
					duration: track.duration,
					timestamp: Date.now(),
				});

				return ok(undefined);
			} catch (error) {
				logger.error('Error during playback', error instanceof Error ? error : undefined);
				this.updateStatus('error');
				const errorObj = error instanceof Error ? error : new Error(String(error));
				this.emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
				return err(errorObj);
			}
		});
	}

	async pause(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.playbackStatus === 'playing') {
				await TrackPlayer.pause();
				this.updateStatus('paused');
			}
			return ok(undefined);
		});
	}

	async resume(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.playbackStatus === 'paused') {
				await TrackPlayer.play();
				this.updateStatus('playing');
			}
			return ok(undefined);
		});
	}

	async stop(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			try {
				await TrackPlayer.reset();
			} catch (error) {
				logger.debug('Reset failed during stop', error instanceof Error ? error : undefined);
			}
			this.currentTrack = null;
			this.position = Duration.ZERO;
			this.duration = Duration.ZERO;
			this.updateStatus('idle');
			return ok(undefined);
		});
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		return this.withLock(async () => {
			const targetSeconds = position.totalSeconds;
			logger.debug(`seek() called: target=${targetSeconds}s`);

			await TrackPlayer.seekTo(targetSeconds);
			this.position = position;

			return ok(undefined);
		});
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			const clampedRate = Math.max(MIN_PLAYBACK_RATE, Math.min(MAX_PLAYBACK_RATE, rate));
			await TrackPlayer.setRate(clampedRate);
			return ok(undefined);
		});
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			this._volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));
			await TrackPlayer.setVolume(this._volume);
			return ok(undefined);
		});
	}

	getVolume(): number {
		return this._volume;
	}

	getStatus(): PlaybackStatus {
		return this.playbackStatus;
	}

	getPosition(): Duration {
		return this.position;
	}

	getDuration(): Duration {
		return this.duration;
	}

	getCurrentTrack(): Track | null {
		return this.currentTrack;
	}

	getQueue(): QueueItem[] {
		return this.queue.map((track, index) => ({
			track,
			isActive: index === this.currentIndex,
			position: index,
		}));
	}

	async setQueue(tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> {
		this.queue = [...tracks];
		this.currentIndex = startIndex;
		this.emitEvent({
			type: 'queue-change',
			tracks: this.queue,
			currentIndex: this.currentIndex,
			timestamp: Date.now(),
		});
		return ok(undefined);
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		if (atIndex !== undefined && atIndex >= 0 && atIndex <= this.queue.length) {
			this.queue.splice(atIndex, 0, ...tracks);
			if (this.currentIndex >= atIndex) this.currentIndex += tracks.length;
		} else {
			this.queue.push(...tracks);
		}
		this.emitEvent({
			type: 'queue-change',
			tracks: this.queue,
			currentIndex: this.currentIndex,
			timestamp: Date.now(),
		});
		return ok(undefined);
	}

	removeFromQueue(index: number): Result<void, Error> {
		if (index >= 0 && index < this.queue.length) {
			this.queue.splice(index, 1);
			if (index < this.currentIndex) {
				this.currentIndex--;
			} else if (index === this.currentIndex) {
				this.stop();
			}
			this.emitEvent({
				type: 'queue-change',
				tracks: this.queue,
				currentIndex: this.currentIndex,
				timestamp: Date.now(),
			});
		}
		return ok(undefined);
	}

	clearQueue(): Result<void, Error> {
		this.queue = [];
		this.currentIndex = -1;
		this.emitEvent({
			type: 'queue-change',
			tracks: [],
			currentIndex: -1,
			timestamp: Date.now(),
		});
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
		if (this.position.totalSeconds > SKIP_PREVIOUS_THRESHOLD_SECONDS) {
			return this.seek(Duration.ZERO);
		} else if (this.currentIndex > 0) {
			this.currentIndex--;
			return ok(undefined);
		}
		return err(new Error('No previous track'));
	}

	setRepeatMode(mode: RepeatMode): Result<void, Error> {
		this.repeatMode = mode;
		const rntpMode = this.mapRepeatMode(mode);
		TrackPlayer.setRepeatMode(rntpMode);
		return ok(undefined);
	}

	getRepeatMode(): RepeatMode {
		return this.repeatMode;
	}

	setShuffle(enabled: boolean): Result<void, Error> {
		this.isShuffled = enabled;
		return ok(undefined);
	}

	isShuffle(): boolean {
		return this.isShuffled;
	}

	addEventListener(listener: PlaybackEventListener): () => void {
		this.listeners.add(listener);
		return () => this.removeEventListener(listener);
	}

	removeEventListener(listener: PlaybackEventListener): void {
		this.listeners.delete(listener);
	}

	private setupEventListeners(): void {
		const playbackStateSubscription = TrackPlayer.addEventListener(
			Event.PlaybackState,
			this.onPlaybackState.bind(this)
		);

		const trackChangedSubscription = TrackPlayer.addEventListener(
			Event.PlaybackActiveTrackChanged,
			this.onTrackChanged.bind(this)
		);

		const errorSubscription = TrackPlayer.addEventListener(
			Event.PlaybackError,
			this.onPlaybackError.bind(this)
		);

		const endSubscription = TrackPlayer.addEventListener(
			Event.PlaybackQueueEnded,
			this.onQueueEnded.bind(this)
		);

		const progressSubscription = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			this.onProgressUpdate.bind(this)
		);

		this.eventSubscriptions = [
			playbackStateSubscription.remove.bind(playbackStateSubscription),
			trackChangedSubscription.remove.bind(trackChangedSubscription),
			errorSubscription.remove.bind(errorSubscription),
			endSubscription.remove.bind(endSubscription),
			progressSubscription.remove.bind(progressSubscription),
		];
	}

	private removeEventListeners(): void {
		this.eventSubscriptions.forEach((unsubscribe) => {
			try {
				unsubscribe();
			} catch (error) {
				logger.debug('Event listener cleanup failed', error instanceof Error ? error : undefined);
			}
		});
		this.eventSubscriptions = [];
	}

	private startProgressPolling(): void {
		this.progressInterval = setInterval(async () => {
			try {
				const progress = await TrackPlayer.getProgress();
				this.handleProgressUpdate(progress.position, progress.duration);
			} catch {
				// Ignore polling errors
			}
		}, PROGRESS_POLL_INTERVAL_MS);
	}

	private stopProgressPolling(): void {
		if (this.progressInterval) {
			clearInterval(this.progressInterval);
			this.progressInterval = null;
		}
	}

	private handleProgressUpdate(position: number, duration: number): void {
		this.position = Duration.fromSeconds(position);
		this.emitEvent({
			type: 'position-change',
			position: this.position,
			timestamp: Date.now(),
		});

		if (duration > 0) {
			const newDuration = Duration.fromSeconds(duration);
			if (newDuration.totalMilliseconds !== this.duration.totalMilliseconds) {
				this.duration = newDuration;
				this.emitEvent({
					type: 'duration-change',
					duration: newDuration,
					timestamp: Date.now(),
				});
			}
		}
	}

	private onProgressUpdate(event: PlaybackProgressUpdatedEvent): void {
		// Event-based updates (may not fire reliably on all platforms)
		this.handleProgressUpdate(event.position, event.duration);
	}

	private onPlaybackState(event: PlaybackState): void {
		logger.debug('PlaybackState event:', event.state);
		const newStatus = mapRNTPStateToStatus(event.state);
		if (newStatus !== this.playbackStatus) {
			logger.debug('Status changing from', this.playbackStatus, 'to', newStatus);
			this.updateStatus(newStatus);
		}
	}

	private onTrackChanged(event: PlaybackActiveTrackChangedEvent): void {
		logger.debug('TrackChanged event:', event.track?.id);
		if (event.track) {
			const track = this.trackMap.get(event.track.id);
			if (track && track !== this.currentTrack) {
				this.currentTrack = track;
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });
			}
		}
	}

	private onPlaybackError(event: PlaybackErrorEvent): void {
		logger.error(`PlaybackError event: ${event.message} (code: ${event.code})`);
		const error = new Error(event.message || 'Playback error');
		this.updateStatus('error');
		this.emitEvent({ type: 'error', error, timestamp: Date.now() });
	}

	private onQueueEnded(): void {
		logger.debug('onQueueEnded called - native PlaybackQueueEnded event received');
		if (this.repeatMode === 'all' && this.queue.length > 0) {
			logger.debug('Repeat mode is all, ignoring queue ended');
			return;
		}
		logger.debug('Emitting ended event');
		this.emitEvent({ type: 'ended', timestamp: Date.now() });
	}

	private mapRepeatMode(mode: RepeatMode): RNTPRepeatMode {
		switch (mode) {
			case 'one':
				return RNTPRepeatMode.Track;
			case 'all':
				return RNTPRepeatMode.Queue;
			case 'off':
			default:
				return RNTPRepeatMode.Off;
		}
	}

	private updateStatus(newStatus: PlaybackStatus): void {
		if (this.playbackStatus !== newStatus) {
			this.playbackStatus = newStatus;
			this.emitEvent({ type: 'status-change', status: newStatus, timestamp: Date.now() });
		}
	}

	private emitEvent(event: PlaybackEvent): void {
		this.listeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				logger.warn('Event listener error', error instanceof Error ? error : undefined);
			}
		});
	}
}

export const rntpPlaybackProvider = new RNTPPlaybackProvider();

export { PLUGIN_MANIFEST as RNTP_MANIFEST } from './config';
