import { createVideoPlayer, VideoPlayer } from 'expo-video';
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

const logger = getLogger('DashPlayback');

function isDashUrl(url: string): boolean {
	return url.startsWith('data:application/dash+xml');
}

export class DashPlaybackProvider implements PlaybackProvider {
	readonly manifest: PluginManifest = PLUGIN_MANIFEST;

	readonly capabilities: Set<PlaybackCapability> = new Set(PLAYBACK_CAPABILITIES);

	readonly configSchema = [];
	status: PluginStatus = 'uninitialized';

	private player: VideoPlayer | null = null;
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
	private statusSubscription: { remove: () => void } | null = null;

	canHandle(url: string): boolean {
		return isDashUrl(url);
	}

	async onInit(context?: PluginInitContext): AsyncResult<void, Error> {
		if (this.isInitialized) {
			this.status = 'ready';
			return ok(undefined);
		}
		try {
			this.status = 'initializing';
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
		try {
			logger.debug('play called for track:', track.title);
			logger.debug('Stream URL is DASH:', isDashUrl(streamUrl));

			if (this.player) {
				logger.debug('Releasing previous player...');
				this.statusSubscription?.remove();
				this.player.release();
				this.player = null;
			}

			this.currentTrack = track;
			this.position = Duration.ZERO;
			this.duration = Duration.ZERO;
			this.updateStatus('loading');

			logger.debug('Creating video player with DASH source...');
			this.player = createVideoPlayer({
				uri: streamUrl,
				contentType: 'dash',
			});
			this.player.volume = this.volume;

			this.player.staysActiveInBackground = true;
			this.player.showNowPlayingNotification = true;

			this.statusSubscription = this.player.addListener('statusChange', (payload) => {
				logger.debug('Status changed:', payload.status);
				this.handleStatusChange(payload.status);
			});

			if (startPosition) {
				this.player.currentTime = startPosition.totalSeconds;
			}
			this.player.play();

			logger.debug('Playback started');
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

	private handleStatusChange(status: string): void {
		switch (status) {
			case 'readyToPlay':
				if (this.player) {
					const durationSec = this.player.duration;
					if (durationSec && durationSec > 0) {
						this.duration = Duration.fromSeconds(durationSec);
						this.emitEvent({
							type: 'duration-change',
							duration: this.duration,
							timestamp: Date.now(),
						});
					}
				}
				this.updateStatus('playing');
				break;
			case 'loading':
				this.updateStatus('loading');
				break;
			case 'error':
				this.updateStatus('error');
				break;
			case 'idle':
				if (this.player && this.position.totalSeconds >= this.duration.totalSeconds - 1) {
					this.handleTrackCompletion();
				}
				break;
		}
	}

	async pause(): AsyncResult<void, Error> {
		if (this.player && this.playbackStatus === 'playing') {
			this.player.pause();
			this.updateStatus('paused');
			this.stopPositionUpdates();
		}
		return ok(undefined);
	}

	async resume(): AsyncResult<void, Error> {
		if (this.player && this.playbackStatus === 'paused') {
			this.player.play();
			this.updateStatus('playing');
			this.startPositionUpdates();
		}
		return ok(undefined);
	}

	async stop(): AsyncResult<void, Error> {
		if (this.player) {
			try {
				this.player.pause();
				this.statusSubscription?.remove();
				this.player.release();
			} catch {}
			this.player = null;
			this.statusSubscription = null;
		}
		this.stopPositionUpdates();
		this.currentTrack = null;
		this.position = Duration.ZERO;
		this.duration = Duration.ZERO;
		this.updateStatus('idle');
		return ok(undefined);
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		if (this.player) {
			this.player.currentTime = position.totalSeconds;
			this.position = position;
			this.emitEvent({ type: 'position-change', position, timestamp: Date.now() });
		}
		return ok(undefined);
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		if (this.player) {
			this.player.playbackRate = Math.max(0.5, Math.min(2.0, rate));
		}
		return ok(undefined);
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		this.volume = Math.max(0, Math.min(1, volume));
		if (this.player) {
			this.player.volume = this.volume;
		}
		return ok(undefined);
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
		this.listeners.forEach((listener) => {
			try {
				listener(event);
			} catch {}
		});
	}

	private startPositionUpdates(): void {
		this.stopPositionUpdates();
		this.positionUpdateInterval = setInterval(() => {
			if (this.player && this.playbackStatus === 'playing') {
				const currentTime = this.player.currentTime;
				if (currentTime !== undefined) {
					this.position = Duration.fromSeconds(currentTime);
					this.emitEvent({
						type: 'position-change',
						position: this.position,
						timestamp: Date.now(),
					});
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

export const dashPlaybackProvider = new DashPlaybackProvider();

export { DashPlaybackPluginModule } from './plugin-module';
export { PLUGIN_MANIFEST as DASH_MANIFEST } from './config';
