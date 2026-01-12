/**
 * Event Mapper
 *
 * Maps react-native-track-player events and states to app's PlaybackEvent types.
 */

import { State, type PlaybackState } from 'react-native-track-player';
import type { PlaybackStatus } from '@domain/value-objects/playback-state';

/**
 * Maps RNTP State to app's PlaybackStatus
 */
export function mapRNTPStateToStatus(state: State): PlaybackStatus {
	switch (state) {
		case State.Playing:
			return 'playing';
		case State.Paused:
			return 'paused';
		case State.Stopped:
		case State.None:
		case State.Ready:
		case State.Ended:
			return 'idle';
		case State.Loading:
		case State.Buffering:
			return 'loading';
		case State.Error:
			return 'error';
		default:
			return 'idle';
	}
}

/**
 * Maps RNTP PlaybackState event to app's PlaybackStatus
 */
export function mapPlaybackStateToStatus(playbackState: PlaybackState): PlaybackStatus {
	return mapRNTPStateToStatus(playbackState.state);
}

/**
 * Checks if RNTP state indicates active playback
 */
export function isActiveState(state: State): boolean {
	return state === State.Playing || state === State.Buffering || state === State.Loading;
}

/**
 * Checks if RNTP state indicates the player is ready to receive commands
 */
export function isReadyState(state: State): boolean {
	return (
		state === State.Playing ||
		state === State.Paused ||
		state === State.Ready ||
		state === State.Buffering
	);
}
