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
	type RemoteJumpForwardEvent,
	type RemoteJumpBackwardEvent,
	type RemoteSeekEvent,
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
const MIN_SEEK_POSITION = 0;

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

		// Remote control event listeners (notification/lock screen controls)
		const remotePlaySubscription = TrackPlayer.addEventListener(
			Event.RemotePlay,
			this.onRemotePlay.bind(this)
		);

		const remotePauseSubscription = TrackPlayer.addEventListener(
			Event.RemotePause,
			this.onRemotePause.bind(this)
		);

		const remoteStopSubscription = TrackPlayer.addEventListener(
			Event.RemoteStop,
			this.onRemoteStop.bind(this)
		);

		const remoteNextSubscription = TrackPlayer.addEventListener(
			Event.RemoteNext,
			this.onRemoteNext.bind(this)
		);

		const remotePreviousSubscription = TrackPlayer.addEventListener(
			Event.RemotePrevious,
			this.onRemotePrevious.bind(this)
		);

		const remoteSeekSubscription = TrackPlayer.addEventListener(
			Event.RemoteSeek,
			this.onRemoteSeek.bind(this)
		);

		const remoteJumpForwardSubscription = TrackPlayer.addEventListener(
			Event.RemoteJumpForward,
			this.onRemoteJumpForward.bind(this)
		);

		const remoteJumpBackwardSubscription = TrackPlayer.addEventListener(
			Event.RemoteJumpBackward,
			this.onRemoteJumpBackward.bind(this)
		);

		this.eventSubscriptions = [
			playbackStateSubscription.remove.bind(playbackStateSubscription),
			trackChangedSubscription.remove.bind(trackChangedSubscription),
			errorSubscription.remove.bind(errorSubscription),
			endSubscription.remove.bind(endSubscription),
			progressSubscription.remove.bind(progressSubscription),
			remotePlaySubscription.remove.bind(remotePlaySubscription),
			remotePauseSubscription.remove.bind(remotePauseSubscription),
			remoteStopSubscription.remove.bind(remoteStopSubscription),
			remoteNextSubscription.remove.bind(remoteNextSubscription),
			remotePreviousSubscription.remove.bind(remotePreviousSubscription),
			remoteSeekSubscription.remove.bind(remoteSeekSubscription),
			remoteJumpForwardSubscription.remove.bind(remoteJumpForwardSubscription),
			remoteJumpBackwardSubscription.remove.bind(remoteJumpBackwardSubscription),
		];

		logger.debug('Event listeners setup complete (including remote controls)');
	}

	removeEventListeners(): void {
		this.eventSubscriptions.forEach((unsubscribe) => {
			try {
				unsubscribe();
			} catch (error) {
				logger.debug('Event listener cleanup failed', error instanceof Error ? error : undefined);
			}
		});
		this.eventSubscriptions = [];
	}

	private onPlaybackState(event: RNTPPlaybackState): void {
		logger.debug('PlaybackState event:', event.state);
		const newStatus = mapRNTPStateToStatus(event.state);
		if (newStatus !== this.state.playbackStatus) {
			logger.debug('Status changing from', this.state.playbackStatus, 'to', newStatus);
			this.updateStatus(newStatus);
		}
	}

	private onTrackChanged(event: PlaybackActiveTrackChangedEvent): void {
		logger.debug('TrackChanged event:', event.track?.id);
		if (event.track) {
			const track = this.state.trackMap.get(event.track.id);
			if (track && track !== this.state.currentTrack) {
				this.state.currentTrack = track;
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
		if (this.state.repeatMode === 'all' && this.state.queue.length > 0) {
			logger.debug('Repeat mode is all, ignoring queue ended');
			return;
		}
		logger.debug('Emitting ended event');
		this.emitEvent({ type: 'ended', timestamp: Date.now() });
	}

	private onProgressUpdate(event: PlaybackProgressUpdatedEvent): void {
		this.progressTracker.handleProgressUpdate(event.position, event.duration);
	}

	// Remote control event handlers
	private async onRemotePlay(): Promise<void> {
		logger.debug('RemotePlay event received');
		try {
			await TrackPlayer.play();
			logger.debug('RemotePlay: TrackPlayer.play() completed');
		} catch (error) {
			logger.error('RemotePlay failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemotePause(): Promise<void> {
		logger.debug('RemotePause event received');
		try {
			await TrackPlayer.pause();
			logger.debug('RemotePause: TrackPlayer.pause() completed');
		} catch (error) {
			logger.error('RemotePause failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemoteStop(): Promise<void> {
		logger.debug('RemoteStop event received');
		try {
			await TrackPlayer.stop();
			logger.debug('RemoteStop: TrackPlayer.stop() completed');
		} catch (error) {
			logger.error('RemoteStop failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemoteNext(): Promise<void> {
		logger.debug('RemoteNext event received');
		try {
			await TrackPlayer.skipToNext();
			logger.debug('RemoteNext: TrackPlayer.skipToNext() completed');
		} catch (error) {
			logger.error('RemoteNext failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemotePrevious(): Promise<void> {
		logger.debug('RemotePrevious event received');
		try {
			await TrackPlayer.skipToPrevious();
			logger.debug('RemotePrevious: TrackPlayer.skipToPrevious() completed');
		} catch (error) {
			logger.error('RemotePrevious failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemoteSeek(event: RemoteSeekEvent): Promise<void> {
		logger.debug('RemoteSeek event received', { position: event.position });
		try {
			await TrackPlayer.seekTo(event.position);
			logger.debug('RemoteSeek: TrackPlayer.seekTo() completed');
		} catch (error) {
			logger.error('RemoteSeek failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemoteJumpForward(event: RemoteJumpForwardEvent): Promise<void> {
		logger.debug('RemoteJumpForward event received', { interval: event.interval });
		try {
			const position = await TrackPlayer.getPosition();
			await TrackPlayer.seekTo(position + event.interval);
			logger.debug('RemoteJumpForward: completed');
		} catch (error) {
			logger.error('RemoteJumpForward failed', error instanceof Error ? error : undefined);
		}
	}

	private async onRemoteJumpBackward(event: RemoteJumpBackwardEvent): Promise<void> {
		logger.debug('RemoteJumpBackward event received', { interval: event.interval });
		try {
			const position = await TrackPlayer.getPosition();
			await TrackPlayer.seekTo(Math.max(MIN_SEEK_POSITION, position - event.interval));
			logger.debug('RemoteJumpBackward: completed');
		} catch (error) {
			logger.error('RemoteJumpBackward failed', error instanceof Error ? error : undefined);
		}
	}
}
