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
import type {
	PluginManifest,
	PluginStatus,
	PluginInitContext,
} from '@plugins/core/interfaces/base-plugin';
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
		capabilities: [
			'play',
			'pause',
			'seek',
			'volume-control',
			'queue-management',
			'background-play',
		],
	};

	readonly capabilities: Set<PlaybackCapability> = new Set([
		'play',
		'pause',
		'seek',
		'volume-control',
		'queue-management',
		'background-play',
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
	private operationLock: Promise<void> = Promise.resolve();

	// Ensures sound operations are serialized to avoid threading issues on Android
	private async withLock<T>(operation: () => Promise<T>): Promise<T> {
		const previousLock = this.operationLock;
		let resolve: () => void;
		this.operationLock = new Promise((r) => {
			resolve = r;
		});
		try {
			await previousLock;
			return await operation();
		} finally {
			resolve!();
		}
	}

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

	async play(
		track: Track,
		streamUrl: string,
		startPosition?: Duration,
		headers?: Record<string, string>
	): AsyncResult<void, Error> {
		return this.withLock(async () => {
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
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });

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
			if (this.sound && this.playbackStatus === 'playing') {
				await this.sound.pauseAsync();
				this.updateStatus('paused');
			}
			return ok(undefined);
		});
	}

	async resume(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.sound && this.playbackStatus === 'paused') {
				await this.sound.playAsync();
				this.updateStatus('playing');
			}
			return ok(undefined);
		});
	}

	async stop(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.sound) {
				try {
					await this.sound.stopAsync();
					await this.sound.unloadAsync();
				} catch (e) {}
				this.sound = null;
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
			if (this.sound) {
				await this.sound.setPositionAsync(position.totalMilliseconds);
				this.position = position;
				this.emitEvent({ type: 'position-change', position, timestamp: Date.now() });
			}
			return ok(undefined);
		});
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.sound) {
				await this.sound.setRateAsync(Math.max(0.5, Math.min(2.0, rate)), true);
			}
			return ok(undefined);
		});
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			this.volume = Math.max(0, Math.min(1, volume));
			if (this.sound) {
				await this.sound.setVolumeAsync(this.volume);
			}
			return ok(undefined);
		});
	}

	getVolume(): number {
		return this.volume;
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
			if (index < this.currentIndex) this.currentIndex--;
			else if (index === this.currentIndex) this.stop();
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

	private onPlaybackStatusUpdate(status: AVPlaybackStatus): void {
		if (!status.isLoaded) return;

		if (status.positionMillis !== undefined) {
			const newPosition = Duration.fromMilliseconds(status.positionMillis);
			// Only emit if position changed by at least 500ms to reduce event spam
			if (Math.abs(newPosition.totalMilliseconds - this.position.totalMilliseconds) >= 500) {
				this.position = newPosition;
				this.emitEvent({
					type: 'position-change',
					position: this.position,
					timestamp: Date.now(),
				});
			}
		}
		if (status.durationMillis !== undefined) {
			const newDuration = Duration.fromMilliseconds(status.durationMillis);
			if (newDuration.totalMilliseconds !== this.duration.totalMilliseconds) {
				this.duration = newDuration;
				this.emitEvent({
					type: 'duration-change',
					duration: newDuration,
					timestamp: Date.now(),
				});
			}
		}

		// NOTE: We intentionally do NOT update playback status here based on
		// status.isPlaying/isBuffering. The status is already set explicitly in
		// pause(), resume(), play(), and stop() methods. Updating it here causes
		// race conditions where native callbacks fire with stale state and
		// overwrite the UI, causing random play/pause flickering.

		if (status.didJustFinish && !status.isLooping) {
			this.handleTrackCompletion();
		}
	}

	private handleTrackCompletion(): void {
		// Defer to next tick to avoid threading issues on Android
		// This callback may fire on a background thread, and ExoPlayer
		// requires all operations to happen on the main thread
		setTimeout(async () => {
			if (this.currentIndex < this.queue.length - 1) {
				await this.skipToNext();
			} else {
				await this.stop();
				this.emitEvent({ type: 'ended', timestamp: Date.now() });
			}
		}, 0);
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
			} catch (e) {}
		});
	}

	private stopPositionUpdates(): void {
		if (this.positionUpdateInterval) {
			clearInterval(this.positionUpdateInterval);
			this.positionUpdateInterval = null;
		}
	}
}

export const expoAudioPlaybackProvider = new ExpoAudioPlaybackProvider();
