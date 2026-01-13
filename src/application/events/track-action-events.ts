import type { Track } from '../../domain/entities/track';
import type { TrackAction, TrackActionSource } from '../../domain/actions/track-action';

export interface TrackActionsRequestEvent {
	readonly track: Track;

	readonly source: TrackActionSource;

	readonly requestId: string;
}

export interface TrackActionsResponseEvent {
	readonly requestId: string;

	readonly actions: TrackAction[];
}

export interface TrackActionExecutedEvent {
	readonly actionId: string;

	readonly track: Track;

	readonly source: TrackActionSource;

	readonly timestamp: number;
}

export interface ActionNavigationIntent {
	readonly pathname: string;
	readonly params?: Record<string, string>;
}

export interface ActionFeedback {
	readonly message: string;
	readonly description?: string;
	readonly type?: 'success' | 'error' | 'info';
}

export interface TrackActionResult {
	readonly handled: boolean;
	readonly success?: boolean;
	readonly feedback?: ActionFeedback;
	readonly navigation?: ActionNavigationIntent;
}

export interface TrackActionExecuteRequestEvent {
	readonly requestId: string;
	readonly actionId: string;
	readonly track: Track;
	readonly source: TrackActionSource;
	readonly playlistId?: string;
	readonly trackPosition?: number;
}

export interface TrackActionExecuteResponseEvent {
	readonly requestId: string;
	readonly result: TrackActionResult;
}

export const TRACK_ACTION_EVENTS = {
	REQUEST_ACTIONS: 'track-actions:request',

	RESPOND_ACTIONS: 'track-actions:response',

	ACTION_EXECUTED: 'track-actions:executed',

	EXECUTE_ACTION_REQUEST: 'track-actions:execute-request',

	EXECUTE_ACTION_RESPONSE: 'track-actions:execute-response',
} as const;

export type TrackActionEventName = (typeof TRACK_ACTION_EVENTS)[keyof typeof TRACK_ACTION_EVENTS];
