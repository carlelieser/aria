import type { Result } from '../../shared/types';

type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

export interface StorageRepository {
	get<T>(key: string): AsyncResult<T | null>;

	set<T>(key: string, value: T): AsyncResult<void>;

	remove(key: string): AsyncResult<void>;

	has(key: string): AsyncResult<boolean>;

	getMany<T>(keys: string[]): AsyncResult<Map<string, T>>;

	setMany<T>(entries: Map<string, T>): AsyncResult<void>;

	removeMany(keys: string[]): AsyncResult<void>;

	getKeys(prefix?: string): AsyncResult<string[]>;

	clear(): AsyncResult<void>;
}

export const StorageKeys = {
	SETTINGS: 'settings',
	THEME: 'settings:theme',
	VOLUME: 'settings:volume',
	QUALITY: 'settings:quality',

	LIBRARY_TRACKS: 'library:tracks',
	LIBRARY_PLAYLISTS: 'library:playlists',
	LIBRARY_FAVORITES: 'library:favorites',
	LIBRARY_RECENT: 'library:recent',

	PLAYBACK_QUEUE: 'playback:queue',
	PLAYBACK_POSITION: 'playback:position',
	PLAYBACK_CURRENT: 'playback:current',

	CACHE_ARTWORK: 'cache:artwork',
	CACHE_SEARCH: 'cache:search',

	SYNC_LAST: 'sync:last',
	SYNC_TOKEN: 'sync:token',

	DOWNLOADS_METADATA: 'downloads:metadata',
} as const;
