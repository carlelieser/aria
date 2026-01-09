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

export const TRACK_ACTION_EVENTS = {
	REQUEST_ACTIONS: 'track-actions:request',

	RESPOND_ACTIONS: 'track-actions:response',

	ACTION_EXECUTED: 'track-actions:executed',
} as const;

export type TrackActionEventName = (typeof TRACK_ACTION_EVENTS)[keyof typeof TRACK_ACTION_EVENTS];
