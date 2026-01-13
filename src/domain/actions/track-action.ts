import type { Track } from '../entities/track';

export type TrackActionGroup = 'primary' | 'navigation' | 'source' | 'secondary';

export const ACTION_GROUP_ORDER: readonly TrackActionGroup[] = [
	'primary',
	'navigation',
	'source',
	'secondary',
] as const;

export interface TrackAction {
	readonly id: string;

	readonly label: string;

	readonly icon: string;

	readonly group: TrackActionGroup;

	readonly priority: number;

	readonly enabled: boolean;

	readonly variant?: 'default' | 'destructive';

	readonly checked?: boolean;

	readonly sourcePlugin?: string;
}

export type TrackActionSource = 'library' | 'search' | 'player' | 'queue' | 'playlist';

export interface TrackActionContext {
	readonly track: Track;

	readonly source: TrackActionSource;

	readonly playlistId?: string;

	readonly trackPosition?: number;
}

export const CORE_ACTION_IDS = {
	ADD_TO_LIBRARY: 'add-to-library',
	REMOVE_FROM_LIBRARY: 'remove-from-library',
	ADD_TO_QUEUE: 'add-to-queue',
	ADD_TO_PLAYLIST: 'add-to-playlist',
	REMOVE_FROM_PLAYLIST: 'remove-from-playlist',
	TOGGLE_FAVORITE: 'toggle-favorite',
	VIEW_ARTIST: 'view-artist',
	VIEW_ALBUM: 'view-album',
	VIEW_LYRICS: 'view-lyrics',
	DOWNLOAD: 'download',
	REMOVE_DOWNLOAD: 'remove-download',
	SLEEP_TIMER: 'sleep-timer',
	TOGGLE_LYRICS: 'toggle-lyrics',
} as const;

export type CoreActionId = (typeof CORE_ACTION_IDS)[keyof typeof CORE_ACTION_IDS];
