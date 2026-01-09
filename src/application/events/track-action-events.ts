import type { Track } from '../../domain/entities/track';
import type { TrackAction, TrackActionSource } from '../../domain/actions/track-action';

/**
 * Event emitted to request track actions from plugins
 */
export interface TrackActionsRequestEvent {
  /** The track to get actions for */
  readonly track: Track;
  /** Where the menu was opened from */
  readonly source: TrackActionSource;
  /** Unique request ID for correlating responses */
  readonly requestId: string;
}

/**
 * Event emitted by plugins to contribute actions
 */
export interface TrackActionsResponseEvent {
  /** Request ID to correlate with the request */
  readonly requestId: string;
  /** Actions contributed by the plugin */
  readonly actions: TrackAction[];
}

/**
 * Event emitted when a track action is executed
 * Plugins can listen to this to handle their custom actions
 */
export interface TrackActionExecutedEvent {
  /** The action ID that was executed */
  readonly actionId: string;
  /** The track the action was performed on */
  readonly track: Track;
  /** Where the action was initiated from */
  readonly source: TrackActionSource;
  /** Timestamp when the action was executed */
  readonly timestamp: number;
}

/**
 * Event names for track actions
 * Used for EventBus communication between service and plugins
 */
export const TRACK_ACTION_EVENTS = {
  /** Request actions from all plugins */
  REQUEST_ACTIONS: 'track-actions:request',
  /** Plugin response with contributed actions */
  RESPOND_ACTIONS: 'track-actions:response',
  /** Notification when an action is executed */
  ACTION_EXECUTED: 'track-actions:executed',
} as const;

export type TrackActionEventName = (typeof TRACK_ACTION_EVENTS)[keyof typeof TRACK_ACTION_EVENTS];
