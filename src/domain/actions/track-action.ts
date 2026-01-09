import type { Track } from '../entities/track';

/**
 * Action group for menu organization
 * Groups are displayed in order with separators between them
 */
export type TrackActionGroup = 'primary' | 'navigation' | 'source' | 'secondary';

/**
 * Action groups define the order and visual separation in the menu
 */
export const ACTION_GROUP_ORDER: readonly TrackActionGroup[] = [
  'primary',     // Add to Queue, Add to Playlist, Toggle Favorite
  'navigation',  // View Artist, View Album
  'source',      // Source-specific actions (YouTube Like, etc.)
  'secondary',   // Share, Download, etc.
] as const;

/**
 * Track action definition (domain type)
 * Pure TypeScript - no React dependencies
 */
export interface TrackAction {
  /** Unique identifier for the action */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Lucide icon name (e.g., 'ListPlus', 'Heart', 'User') */
  readonly icon: string;
  /** Group for menu organization */
  readonly group: TrackActionGroup;
  /** Sort priority within group (higher = first) */
  readonly priority: number;
  /** Whether this action is currently enabled */
  readonly enabled: boolean;
  /** Visual variant for styling */
  readonly variant?: 'default' | 'destructive';
  /** Show checkmark (for toggle states like favorites) */
  readonly checked?: boolean;
  /** Plugin ID that contributed this action (undefined for core actions) */
  readonly sourcePlugin?: string;
}

/**
 * Source location where track options menu was opened
 */
export type TrackActionSource = 'library' | 'search' | 'player' | 'queue';

/**
 * Context provided when fetching or executing a track action
 */
export interface TrackActionContext {
  /** The track to perform actions on */
  readonly track: Track;
  /** Where the action was initiated from */
  readonly source: TrackActionSource;
}

/**
 * Core action IDs for type safety
 */
export const CORE_ACTION_IDS = {
  ADD_TO_QUEUE: 'add-to-queue',
  ADD_TO_PLAYLIST: 'add-to-playlist',
  TOGGLE_FAVORITE: 'toggle-favorite',
  VIEW_ARTIST: 'view-artist',
  VIEW_ALBUM: 'view-album',
} as const;

export type CoreActionId = (typeof CORE_ACTION_IDS)[keyof typeof CORE_ACTION_IDS];
