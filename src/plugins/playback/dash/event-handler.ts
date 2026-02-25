/**
 * Event Handler
 *
 * Manages expo-video player event subscriptions and translates them
 * to app-level PlaybackEvents. Uses native timeUpdate events instead
 * of setInterval polling for position tracking.
 */

import type { VideoPlayer, VideoPlayerStatus, PlayerError } from 'expo-video';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackStatus } from '@domain/value-objects/playback-state';
import type {
	PlaybackEvent,
	PlaybackEventListener,
} from '@plugins/core/interfaces/playback-provider';
import { getLogger } from '@shared/services/logger';
import type { PlaybackState } from './playback-state';
import { TIME_UPDATE_INTERVAL_SECONDS } from './constants';

const logger = getLogger('DashEventHandler');

export class EventHandler {
	private readonly _listeners: Set<PlaybackEventListener> = new Set();
	private _eventSubscriptions: { remove: () => void }[] = [];

	constructor(
		private readonly _state: PlaybackState,
		private readonly _updateStatus: (status: PlaybackStatus) => void
	) {}

	addEventListener(listener: PlaybackEventListener): () => void {
		this._listeners.add(listener);
		return () => this.removeEventListener(listener);
	}

	removeEventListener(listener: PlaybackEventListener): void {
		this._listeners.delete(listener);
	}

	clearListeners(): void {
		this._listeners.clear();
	}

	emitEvent(event: PlaybackEvent): void {
		this._listeners.forEach((listener) => {
			try {
				listener(event);
			} catch (error) {
				logger.warn('Event listener error', error instanceof Error ? error : undefined);
			}
		});
	}

	setupEventListeners(player: VideoPlayer): void {
		this.removeEventListeners();

		player.timeUpdateEventInterval = TIME_UPDATE_INTERVAL_SECONDS;

		this._eventSubscriptions = [
			player.addListener('statusChange', (payload) => {
				this._onStatusChange(payload);
			}),
			player.addListener('playingChange', (payload) => {
				this._onPlayingChange(payload.isPlaying);
			}),
			player.addListener('playToEnd', () => {
				this._onPlayToEnd();
			}),
			player.addListener('sourceLoad', (payload) => {
				this._onSourceLoad(payload.duration);
			}),
			player.addListener('timeUpdate', (payload) => {
				this._onTimeUpdate(payload.currentTime);
			}),
		];
	}

	removeEventListeners(): void {
		for (const sub of this._eventSubscriptions) {
			try {
				sub.remove();
			} catch (error) {
				logger.debug(
					'Event listener cleanup failed',
					error instanceof Error ? error : undefined
				);
			}
		}
		this._eventSubscriptions = [];
	}

	private _onStatusChange(payload: { status: VideoPlayerStatus; error?: PlayerError }): void {
		logger.debug('Status changed', payload.status);

		switch (payload.status) {
			case 'loading':
				this._updateStatus('loading');
				break;
			case 'error': {
				const playerError = payload.error;
				logger.error(
					'Player error:',
					playerError ? new Error(playerError.message) : undefined
				);
				this._updateStatus('error');
				this.emitEvent({
					type: 'error',
					error: new Error(playerError?.message ?? 'Playback failed: video player entered error state'),
					timestamp: Date.now(),
				});
				break;
			}
		}
	}

	private _onPlayingChange(isPlaying: boolean): void {
		this._updateStatus(isPlaying ? 'playing' : 'paused');
	}

	private _onPlayToEnd(): void {
		this.emitEvent({ type: 'ended', timestamp: Date.now() });
	}

	private _onSourceLoad(durationSeconds: number): void {
		if (durationSeconds <= 0) return;

		const duration = Duration.fromSeconds(durationSeconds);
		if (duration.totalMilliseconds === this._state.duration.totalMilliseconds) return;

		this._state.duration = duration;
		this.emitEvent({
			type: 'duration-change',
			duration,
			timestamp: Date.now(),
		});
	}

	private _onTimeUpdate(currentTime: number): void {
		this._state.position = Duration.fromSeconds(currentTime);
		this.emitEvent({
			type: 'position-change',
			position: this._state.position,
			timestamp: Date.now(),
		});
	}
}
