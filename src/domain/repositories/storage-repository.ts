import type { Result } from '../../shared/types';

/** Async result type for repository operations */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Generic key-value storage repository interface.
 * Used for settings, preferences, and cached data.
 */
export interface StorageRepository {
  /**
   * Get a value by key
   */
  get<T>(key: string): AsyncResult<T | null>;

  /**
   * Set a value by key
   */
  set<T>(key: string, value: T): AsyncResult<void>;

  /**
   * Remove a value by key
   */
  remove(key: string): AsyncResult<void>;

  /**
   * Check if a key exists
   */
  has(key: string): AsyncResult<boolean>;

  /**
   * Get multiple values by keys
   */
  getMany<T>(keys: string[]): AsyncResult<Map<string, T>>;

  /**
   * Set multiple values
   */
  setMany<T>(entries: Map<string, T>): AsyncResult<void>;

  /**
   * Remove multiple values by keys
   */
  removeMany(keys: string[]): AsyncResult<void>;

  /**
   * Get all keys matching a prefix
   */
  getKeys(prefix?: string): AsyncResult<string[]>;

  /**
   * Clear all stored data
   */
  clear(): AsyncResult<void>;
}

/**
 * Well-known storage keys
 */
export const StorageKeys = {
  // Settings
  SETTINGS: 'settings',
  THEME: 'settings:theme',
  VOLUME: 'settings:volume',
  QUALITY: 'settings:quality',

  // Library
  LIBRARY_TRACKS: 'library:tracks',
  LIBRARY_PLAYLISTS: 'library:playlists',
  LIBRARY_FAVORITES: 'library:favorites',
  LIBRARY_RECENT: 'library:recent',

  // Playback
  PLAYBACK_QUEUE: 'playback:queue',
  PLAYBACK_POSITION: 'playback:position',
  PLAYBACK_CURRENT: 'playback:current',

  // Cache
  CACHE_ARTWORK: 'cache:artwork',
  CACHE_SEARCH: 'cache:search',

  // Sync
  SYNC_LAST: 'sync:last',
  SYNC_TOKEN: 'sync:token',
} as const;
