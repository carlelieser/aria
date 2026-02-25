/**
 * Event Handler
 *
 * Manages RNTP event subscriptions and handles native player events,
 * translating them to app-level PlaybackEvents.
 */

import TrackPlayer, {
	Event,
	type PlaybackState as RNTPPlaybackState,
	type PlaybackActiveTrackChangedEvent,
	type PlaybackErrorEvent,
	type PlaybackProgressUpdatedEvent,
} from 'react-native-track-player';
import type {
	PlaybackEvent,
	PlaybackEventListener,
} from '@plugins/core/interfaces/playback-provider';
import type { PlaybackStatus } from '@domain/value-objects/playback-state';
import { getLogger } from '@shared/services/logger';
import type { PlaybackState } from './playback-state';
import type { ProgressTracker } from './progress-tracker';
import { mapRNTPStateToStatus } from './event-mapper';

const logger = getLogger('RNTPEventHandler');

export class EventHandler {
	private readonly _listeners: Set<PlaybackEventListener> = new Set();
	private _eventSubscriptions: (() => void)[] = [];

	constructor(
		private readonly _state: PlaybackState,
		private readonly _progressTracker: ProgressTracker,
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

	setupEventListeners(): void {
		const playbackStateSubscription = TrackPlayer.addEventListener(
			Event.PlaybackState,
			this._onPlaybackState.bind(this)
		);

		const trackChangedSubscription = TrackPlayer.addEventListener(
			Event.PlaybackActiveTrackChanged,
			this._onTrackChanged.bind(this)
		);

		const errorSubscription = TrackPlayer.addEventListener(
			Event.PlaybackError,
			this._onPlaybackError.bind(this)
		);

		const endSubscription = TrackPlayer.addEventListener(
			Event.PlaybackQueueEnded,
			this._onQueueEnded.bind(this)
		);

		const progressSubscription = TrackPlayer.addEventListener(
			Event.PlaybackProgressUpdated,
			this._onProgressUpdate.bind(this)
		);

		const remoteNextSubscription = TrackPlayer.addEventListener(
			Event.RemoteNext,
			this._onRemoteNext.bind(this)
		);

		const remotePreviousSubscription = TrackPlayer.addEventListener(
			Event.RemotePrevious,
			this._onRemotePrevious.bind(this)
		);

		this._eventSubscriptions = [
			playbackStateSubscription.remove.bind(playbackStateSubscription),
			trackChangedSubscription.remove.bind(trackChangedSubscription),
			errorSubscription.remove.bind(errorSubscription),
			endSubscription.remove.bind(endSubscription),
			progressSubscription.remove.bind(progressSubscription),
			remoteNextSubscription.remove.bind(remoteNextSubscription),
			remotePreviousSubscription.remove.bind(remotePreviousSubscription),
		];
	}

	removeEventListeners(): void {
		this._eventSubscriptions.forEach((unsubscribe) => {
			try {
				unsubscribe();
			} catch (error) {
				logger.debug(
					'Event listener cleanup failed',
					error instanceof Error ? error : undefined
				);
			}
		});
		this._eventSubscriptions = [];
	}

	private _onPlaybackState(event: RNTPPlaybackState): void {
		const newStatus = mapRNTPStateToStatus(event.state);
		if (newStatus === this._state.playbackStatus) return;

		this._updateStatus(newStatus);
	}

	private _onTrackChanged(event: PlaybackActiveTrackChangedEvent): void {
		if (event.track) {
			const track = this._state.trackMap.get(event.track.id);
			if (track && track !== this._state.currentTrack) {
				this._state.currentTrack = track;
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });
			}
		}
	}

	private _onPlaybackError(event: PlaybackErrorEvent): void {
		logger.error(`PlaybackError: ${event.message} (code: ${event.code})`);
		const error = new Error(event.message || 'Playback error');
		this._updateStatus('error');
		this.emitEvent({ type: 'error', error, timestamp: Date.now() });
	}

	private _onQueueEnded(): void {
		if (this._state.repeatMode !== 'all') {
			this.emitEvent({ type: 'ended', timestamp: Date.now() });
		}
	}

	private _onProgressUpdate(event: PlaybackProgressUpdatedEvent): void {
		this._progressTracker.handleProgressUpdate(event.position, event.duration);
	}

	private _onRemoteNext(): void {
		logger.debug('RemoteNext received - emitting remote-skip-next event');
		this.emitEvent({ type: 'remote-skip-next', timestamp: Date.now() });
	}

	private _onRemotePrevious(): void {
		logger.debug('RemotePrevious received - emitting remote-skip-previous event');
		this.emitEvent({ type: 'remote-skip-previous', timestamp: Date.now() });
	}
}
