import { AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';
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
		version: '3.0.0',
		description: 'Audio playback using expo-audio',
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

	private player: AudioPlayer | null = null;
	private statusSubscription: { remove: () => void } | null = null;
	private playbackStatus: PlaybackStatus = 'idle';
	private currentTrack: Track | null = null;
	private position: Duration = Duration.ZERO;
	private duration: Duration = Duration.ZERO;
	private _volume: number = 1.0;
	private repeatMode: RepeatMode = 'off';
	private isShuffled: boolean = false;
	private queue: Track[] = [];
	private currentIndex: number = -1;
	private listeners: Set<PlaybackEventListener> = new Set();
	private isInitialized: boolean = false;
	private operationLock: Promise<void> = Promise.resolve();

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
			await setAudioModeAsync({
				playsInSilentMode: true,
				shouldPlayInBackground: true,
				shouldRouteThroughEarpiece: false,
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
		this.listeners.clear();
		this.isInitialized = false;
		this.status = 'disabled';
		return ok(undefined);
	}

	hasCapability(capability: PlaybackCapability): boolean {
		return this.capabilities.has(capability);
	}

	canHandle(url: string): boolean {
		// Handle HLS streams, direct audio URLs, and local files
		// Do NOT handle DASH streams (data:application/dash+xml)
		if (url.startsWith('data:application/dash+xml')) {
			return false;
		}

		// Handle HLS manifests
		if (url.includes('.m3u8') || url.includes('manifest/hls')) {
			return true;
		}

		// Handle direct audio files
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

		// Handle local files
		if (url.startsWith('file://') || url.startsWith('/')) {
			return true;
		}

		// Handle HTTP(S) URLs that aren't DASH
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
		return this.withLock(async () => {
			try {
				logger.debug('play called for track:', track.title);
				logger.debug('Stream URL length:', streamUrl.length);
				logger.debug('Headers:', headers ? JSON.stringify(headers) : 'none');

				if (this.player) {
					logger.debug('Stopping and removing previous player...');
					try {
						this.player.pause();
					} catch {}
					this.statusSubscription?.remove();
					this.statusSubscription = null;
					this.player.remove();
					this.player = null;
				}

				this.currentTrack = track;
				this.position = Duration.ZERO;
				this.duration = Duration.ZERO;
				this.updateStatus('loading');

				const { createAudioPlayer } = await import('expo-audio');

				const source: { uri: string; headers?: Record<string, string> } = {
					uri: streamUrl,
				};
				if (headers) source.headers = headers;

				logger.debug('Creating audio player...');
				this.player = createAudioPlayer(source);
				this.player.volume = this._volume;

				this.statusSubscription = this.player.addListener(
					'playbackStatusUpdate',
					this.onPlaybackStatusUpdate.bind(this)
				);

				if (startPosition && startPosition.totalMilliseconds > 0) {
					await this.player.seekTo(startPosition.totalSeconds);
				}

				this.player.play();

				logger.debug('Player created and started successfully');
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
			if (this.player && this.playbackStatus === 'playing') {
				this.player.pause();
				this.updateStatus('paused');
			}
			return ok(undefined);
		});
	}

	async resume(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.player && this.playbackStatus === 'paused') {
				this.player.play();
				this.updateStatus('playing');
			}
			return ok(undefined);
		});
	}

	async stop(): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.player) {
				try {
					this.player.pause();
					this.statusSubscription?.remove();
					this.statusSubscription = null;
					this.player.remove();
				} catch {}
				this.player = null;
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
			if (this.player) {
				await this.player.seekTo(position.totalSeconds);
				this.position = position;
				this.emitEvent({ type: 'position-change', position, timestamp: Date.now() });
			}
			return ok(undefined);
		});
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			if (this.player) {
				this.player.setPlaybackRate(Math.max(0.5, Math.min(2.0, rate)));
			}
			return ok(undefined);
		});
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		return this.withLock(async () => {
			this._volume = Math.max(0, Math.min(1, volume));
			if (this.player) {
				this.player.volume = this._volume;
			}
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
		if (this.player) {
			this.player.loop = mode === 'one';
		}
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

	private onPlaybackStatusUpdate(status: AudioStatus): void {
		if (!status.isLoaded) return;

		if (status.currentTime !== undefined) {
			const newPosition = Duration.fromSeconds(status.currentTime);
			if (Math.abs(newPosition.totalMilliseconds - this.position.totalMilliseconds) >= 500) {
				this.position = newPosition;
				this.emitEvent({
					type: 'position-change',
					position: this.position,
					timestamp: Date.now(),
				});
			}
		}

		if (status.duration !== undefined && status.duration > 0) {
			const newDuration = Duration.fromSeconds(status.duration);
			if (newDuration.totalMilliseconds !== this.duration.totalMilliseconds) {
				this.duration = newDuration;
				this.emitEvent({
					type: 'duration-change',
					duration: newDuration,
					timestamp: Date.now(),
				});
			}
		}

		if (status.didJustFinish && !this.player?.loop) {
			this.handleTrackCompletion();
		}
	}

	private handleTrackCompletion(): void {
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
			} catch {}
		});
	}
}

export const expoAudioPlaybackProvider = new ExpoAudioPlaybackProvider();

export { ExpoAudioPluginModule } from './plugin-module';
export { PLUGIN_MANIFEST as EXPO_AUDIO_MANIFEST } from './config';
