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

function isHlsUrl(url: string): boolean {
	return url.includes('/manifest/hls') || url.endsWith('.m3u8');
}

function canHandleUrl(url: string): boolean {
	return isDashUrl(url) || isHlsUrl(url);
}

export class DashPlaybackProvider implements PlaybackProvider {
	readonly manifest: PluginManifest = PLUGIN_MANIFEST;

	readonly capabilities: Set<PlaybackCapability> = new Set(PLAYBACK_CAPABILITIES);

	readonly configSchema = [];
	status: PluginStatus = 'uninitialized';

	private _player: VideoPlayer | null = null;
	private _playbackStatus: PlaybackStatus = 'idle';
	private _currentTrack: Track | null = null;
	private _position: Duration = Duration.ZERO;
	private _duration: Duration = Duration.ZERO;
	private _volume: number = 1.0;
	private _repeatMode: RepeatMode = 'off';
	private _isShuffled: boolean = false;
	private _queue: Track[] = [];
	private _currentIndex: number = -1;
	private _listeners: Set<PlaybackEventListener> = new Set();
	private _positionUpdateInterval: ReturnType<typeof setInterval> | null = null;
	private _isInitialized: boolean = false;
	private _statusSubscription: { remove: () => void } | null = null;

	canHandle(url: string): boolean {
		return canHandleUrl(url);
	}

	async onInit(context?: PluginInitContext): AsyncResult<void, Error> {
		if (this._isInitialized) {
			this.status = 'ready';
			return ok(undefined);
		}
		try {
			this.status = 'initializing';
			this._isInitialized = true;
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
		this._stopPositionUpdates();
		this._listeners.clear();
		this._isInitialized = false;
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
			logger.debug(
				'Stream URL type:',
				isDashUrl(streamUrl) ? 'DASH' : isHlsUrl(streamUrl) ? 'HLS' : 'unknown'
			);

			if (this._player) {
				logger.debug('Stopping and releasing previous player...');
				try {
					this._player.pause();
				} catch {}
				this._statusSubscription?.remove();
				this._player.release();
				this._player = null;
			}

			this._currentTrack = track;
			this._position = Duration.ZERO;
			this._duration = Duration.ZERO;
			this._updateStatus('loading');

			const contentType = isHlsUrl(streamUrl) ? 'hls' : 'dash';
			logger.debug(`Creating video player with ${contentType.toUpperCase()} source...`);
			this._player = createVideoPlayer({
				uri: streamUrl,
				contentType,
				...(headers && Object.keys(headers).length > 0 ? { headers } : {}),
			});
			this._player.volume = this._volume;

			this._player.staysActiveInBackground = true;
			this._player.showNowPlayingNotification = true;

			this._statusSubscription = this._player.addListener('statusChange', (payload) => {
				logger.debug('Status changed:', payload.status);
				this._handleStatusChange(payload.status);
			});

			if (startPosition) {
				this._player.currentTime = startPosition.totalSeconds;
			}
			this._player.play();

			this._startPositionUpdates();
			this._emitEvent({ type: 'track-change', track, timestamp: Date.now() });

			return ok(undefined);
		} catch (error) {
			logger.error('Error during playback', error instanceof Error ? error : undefined);
			this._updateStatus('error');
			const errorObj = error instanceof Error ? error : new Error(String(error));
			this._emitEvent({ type: 'error', error: errorObj, timestamp: Date.now() });
			return err(errorObj);
		}
	}

	private _handleStatusChange(status: string): void {
		switch (status) {
			case 'readyToPlay':
				if (this._player) {
					const durationSec = this._player.duration;
					if (durationSec && durationSec > 0) {
						this._duration = Duration.fromSeconds(durationSec);
						this._emitEvent({
							type: 'duration-change',
							duration: this._duration,
							timestamp: Date.now(),
						});
					}
				}
				if (this._playbackStatus !== 'paused') {
					this._updateStatus('playing');
				}
				break;
			case 'loading':
				this._updateStatus('loading');
				break;
			case 'error':
				this._updateStatus('error');
				this._emitEvent({
					type: 'error',
					error: new Error('Playback failed: video player entered error state'),
					timestamp: Date.now(),
				});
				break;
			case 'idle':
				if (this._player && this._position.totalSeconds >= this._duration.totalSeconds - 1) {
					this._handleTrackCompletion();
				}
				break;
		}
	}

	async pause(): AsyncResult<void, Error> {
		if (this._player && this._playbackStatus === 'playing') {
			this._player.pause();
			this._updateStatus('paused');
			this._stopPositionUpdates();
		}
		return ok(undefined);
	}

	async resume(): AsyncResult<void, Error> {
		if (this._player && this._playbackStatus === 'paused') {
			this._player.play();
			this._updateStatus('playing');
			this._startPositionUpdates();
		}
		return ok(undefined);
	}

	async stop(): AsyncResult<void, Error> {
		if (this._player) {
			try {
				this._player.pause();
				this._statusSubscription?.remove();
				this._player.release();
			} catch {}
			this._player = null;
			this._statusSubscription = null;
		}
		this._stopPositionUpdates();
		this._currentTrack = null;
		this._position = Duration.ZERO;
		this._duration = Duration.ZERO;
		this._updateStatus('idle');
		return ok(undefined);
	}

	async seek(position: Duration): AsyncResult<void, Error> {
		if (this._player) {
			this._player.currentTime = position.totalSeconds;
			this._position = position;
			this._emitEvent({ type: 'position-change', position, timestamp: Date.now() });
		}
		return ok(undefined);
	}

	async setPlaybackRate(rate: number): AsyncResult<void, Error> {
		if (this._player) {
			this._player.playbackRate = Math.max(0.5, Math.min(2.0, rate));
		}
		return ok(undefined);
	}

	async setVolume(volume: number): AsyncResult<void, Error> {
		this._volume = Math.max(0, Math.min(1, volume));
		if (this._player) {
			this._player.volume = this._volume;
		}
		return ok(undefined);
	}

	getVolume(): number {
		return this._volume;
	}
	getStatus(): PlaybackStatus {
		return this._playbackStatus;
	}
	getPosition(): Duration {
		return this._position;
	}
	getDuration(): Duration {
		return this._duration;
	}
	getCurrentTrack(): Track | null {
		return this._currentTrack;
	}

	getQueue(): QueueItem[] {
		return this._queue.map((track, index) => ({
			track,
			isActive: index === this._currentIndex,
			position: index,
		}));
	}

	async setQueue(tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> {
		this._queue = [...tracks];
		this._currentIndex = startIndex;
		this._emitEvent({
			type: 'queue-change',
			tracks: this._queue,
			currentIndex: this._currentIndex,
			timestamp: Date.now(),
		});
		return ok(undefined);
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		if (atIndex !== undefined && atIndex >= 0 && atIndex <= this._queue.length) {
			this._queue.splice(atIndex, 0, ...tracks);
			if (this._currentIndex >= atIndex) this._currentIndex += tracks.length;
		} else {
			this._queue.push(...tracks);
		}
		this._emitEvent({
			type: 'queue-change',
			tracks: this._queue,
			currentIndex: this._currentIndex,
			timestamp: Date.now(),
		});
		return ok(undefined);
	}

	removeFromQueue(index: number): Result<void, Error> {
		if (index >= 0 && index < this._queue.length) {
			this._queue.splice(index, 1);
			if (index < this._currentIndex) this._currentIndex--;
			else if (index === this._currentIndex) this.stop();
			this._emitEvent({
				type: 'queue-change',
				tracks: this._queue,
				currentIndex: this._currentIndex,
				timestamp: Date.now(),
			});
		}
		return ok(undefined);
	}

	clearQueue(): Result<void, Error> {
		this._queue = [];
		this._currentIndex = -1;
		this._emitEvent({
			type: 'queue-change',
			tracks: [],
			currentIndex: -1,
			timestamp: Date.now(),
		});
		return ok(undefined);
	}

	async skipToNext(): AsyncResult<void, Error> {
		if (this._currentIndex < this._queue.length - 1) {
			this._currentIndex++;
			return ok(undefined);
		}
		return err(new Error('No next track'));
	}

	async skipToPrevious(): AsyncResult<void, Error> {
		if (this._position.totalSeconds > 3) {
			return this.seek(Duration.ZERO);
		} else if (this._currentIndex > 0) {
			this._currentIndex--;
			return ok(undefined);
		}
		return err(new Error('No previous track'));
	}

	setRepeatMode(mode: RepeatMode): Result<void, Error> {
		this._repeatMode = mode;
		if (this._player) {
			this._player.loop = mode === 'one';
		}
		return ok(undefined);
	}

	getRepeatMode(): RepeatMode {
		return this._repeatMode;
	}

	setShuffle(enabled: boolean): Result<void, Error> {
		this._isShuffled = enabled;
		return ok(undefined);
	}

	isShuffle(): boolean {
		return this._isShuffled;
	}

	addEventListener(listener: PlaybackEventListener): () => void {
		this._listeners.add(listener);
		return () => this.removeEventListener(listener);
	}

	removeEventListener(listener: PlaybackEventListener): void {
		this._listeners.delete(listener);
	}

	private async _handleTrackCompletion(): Promise<void> {
		if (this._currentIndex < this._queue.length - 1) {
			await this.skipToNext();
		} else {
			await this.stop();
			this._emitEvent({ type: 'ended', timestamp: Date.now() });
		}
	}

	private _updateStatus(newStatus: PlaybackStatus): void {
		if (this._playbackStatus !== newStatus) {
			this._playbackStatus = newStatus;
			this._emitEvent({ type: 'status-change', status: newStatus, timestamp: Date.now() });
		}
	}

	private _emitEvent(event: PlaybackEvent): void {
		this._listeners.forEach((listener) => {
			try {
				listener(event);
			} catch {}
		});
	}

	private _startPositionUpdates(): void {
		this._stopPositionUpdates();
		this._positionUpdateInterval = setInterval(() => {
			if (this._player && this._playbackStatus === 'playing') {
				const currentTime = this._player.currentTime;
				if (currentTime !== undefined) {
					this._position = Duration.fromSeconds(currentTime);
					this._emitEvent({
						type: 'position-change',
						position: this._position,
						timestamp: Date.now(),
					});
				}
			}
		}, 1000);
	}

	private _stopPositionUpdates(): void {
		if (this._positionUpdateInterval) {
			clearInterval(this._positionUpdateInterval);
			this._positionUpdateInterval = null;
		}
	}
}

export { PLUGIN_MANIFEST as DASH_MANIFEST } from './config';
