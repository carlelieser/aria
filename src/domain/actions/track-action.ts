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

export type TrackActionSource = 'library' | 'search' | 'player' | 'queue';

export interface TrackActionContext {
	readonly track: Track;

	readonly source: TrackActionSource;
}

export const CORE_ACTION_IDS = {
	ADD_TO_LIBRARY: 'add-to-library',
	REMOVE_FROM_LIBRARY: 'remove-from-library',
	ADD_TO_QUEUE: 'add-to-queue',
	ADD_TO_PLAYLIST: 'add-to-playlist',
	TOGGLE_FAVORITE: 'toggle-favorite',
	VIEW_ARTIST: 'view-artist',
	VIEW_ALBUM: 'view-album',
	DOWNLOAD: 'download',
	REMOVE_DOWNLOAD: 'remove-download',
} as const;

export type CoreActionId = (typeof CORE_ACTION_IDS)[keyof typeof CORE_ACTION_IDS];
