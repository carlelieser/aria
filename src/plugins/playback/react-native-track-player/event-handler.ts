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
	private readonly listeners: Set<PlaybackEventListener> = new Set();
	private eventSubscriptions: (() => void)[] = [];

	constructor(
		private readonly state: PlaybackState,
		private readonly progressTracker: ProgressTracker,
		private readonly updateStatus: (status: PlaybackStatus) => void
	) {}

	addEventListener(listener: PlaybackEventListener): () => void {
		this.listeners.add(listener);
		return () => this.removeEventListener(listener);
	}

	removeEventListener(listener: PlaybackEventListener): void {
		this.listeners.delete(listener);
	}

	clearListeners(): void {
		this.listeners.clear();
	}

	emitEvent(event: PlaybackEvent): void {
		this.listeners.forEach((listener) => {
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

		const remoteNextSubscription = TrackPlayer.addEventListener(
			Event.RemoteNext,
			this.onRemoteNext.bind(this)
		);

		const remotePreviousSubscription = TrackPlayer.addEventListener(
			Event.RemotePrevious,
			this.onRemotePrevious.bind(this)
		);

		this.eventSubscriptions = [
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
		this.eventSubscriptions.forEach((unsubscribe) => {
			try {
				unsubscribe();
			} catch (error) {
				logger.debug(
					'Event listener cleanup failed',
					error instanceof Error ? error : undefined
				);
			}
		});
		this.eventSubscriptions = [];
	}

	private onPlaybackState(event: RNTPPlaybackState): void {
		const newStatus = mapRNTPStateToStatus(event.state);
		if (newStatus !== this.state.playbackStatus) {
			this.updateStatus(newStatus);
		}
	}

	private onTrackChanged(event: PlaybackActiveTrackChangedEvent): void {
		if (event.track) {
			const track = this.state.trackMap.get(event.track.id);
			if (track && track !== this.state.currentTrack) {
				this.state.currentTrack = track;
				this.emitEvent({ type: 'track-change', track, timestamp: Date.now() });
			}
		}
	}

	private onPlaybackError(event: PlaybackErrorEvent): void {
		logger.error(`PlaybackError: ${event.message} (code: ${event.code})`);
		const error = new Error(event.message || 'Playback error');
		this.updateStatus('error');
		this.emitEvent({ type: 'error', error, timestamp: Date.now() });
	}

	private onQueueEnded(): void {
		if (this.state.repeatMode === 'all' && this.state.queue.length > 0) {
			return;
		}
		this.emitEvent({ type: 'ended', timestamp: Date.now() });
	}

	private onProgressUpdate(event: PlaybackProgressUpdatedEvent): void {
		this.progressTracker.handleProgressUpdate(event.position, event.duration);
	}

	private onRemoteNext(): void {
		logger.debug('RemoteNext received - emitting remote-skip-next event');
		this.emitEvent({ type: 'remote-skip-next', timestamp: Date.now() });
	}

	private onRemotePrevious(): void {
		logger.debug('RemotePrevious received - emitting remote-skip-previous event');
		this.emitEvent({ type: 'remote-skip-previous', timestamp: Date.now() });
	}
}
