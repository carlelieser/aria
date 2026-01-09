import type { BasePlugin } from './base-plugin';
import type { Result, AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Playlist } from '@domain/entities/playlist';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';

/**
 * Sync provider capabilities
 */
export type SyncCapability =
  | 'sync-library'      // Can sync entire library
  | 'sync-playlists'    // Can sync playlists
  | 'sync-favorites'    // Can sync favorites/liked tracks
  | 'sync-playback'     // Can sync playback state
  | 'sync-settings'     // Can sync app settings
  | 'conflict-resolution' // Supports conflict resolution
  | 'incremental-sync'  // Supports incremental/delta sync
  | 'real-time-sync'    // Supports real-time synchronization
  | 'offline-queue';    // Supports offline change queue

/**
 * Sync entity type
 */
export type SyncEntityType = 'track' | 'playlist' | 'album' | 'artist' | 'playback-state' | 'settings';

/**
 * Sync operation type
 */
export type SyncOperation = 'create' | 'update' | 'delete';

/**
 * Sync direction
 */
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

/**
 * Sync conflict strategy
 */
export type ConflictStrategy =
  | 'local-wins'      // Local changes take precedence
  | 'remote-wins'     // Remote changes take precedence
  | 'newest-wins'     // Most recently modified wins
  | 'manual'          // Require manual resolution
  | 'merge';          // Attempt to merge changes

/**
 * Sync change record
 */
export interface SyncChange {
  /** Unique change ID */
  readonly id: string;
  /** Entity type being changed */
  readonly entityType: SyncEntityType;
  /** Entity ID */
  readonly entityId: string;
  /** Operation type */
  readonly operation: SyncOperation;
  /** Timestamp of the change */
  readonly timestamp: number;
  /** Entity data (for create/update) */
  readonly data?: unknown;
  /** Hash of the entity for conflict detection */
  readonly hash?: string;
  /** Source device/client ID */
  readonly sourceId?: string;
}

/**
 * Sync conflict information
 */
export interface SyncConflict {
  /** Conflict ID */
  readonly id: string;
  /** Entity type with conflict */
  readonly entityType: SyncEntityType;
  /** Entity ID with conflict */
  readonly entityId: string;
  /** Local change */
  readonly localChange: SyncChange;
  /** Remote change */
  readonly remoteChange: SyncChange;
  /** Conflict detection timestamp */
  readonly detectedAt: number;
}

/**
 * Conflict resolution decision
 */
export interface ConflictResolution {
  /** Conflict ID being resolved */
  readonly conflictId: string;
  /** Resolution strategy used */
  readonly strategy: ConflictStrategy;
  /** Chosen change (if manual resolution) */
  readonly chosenChange?: 'local' | 'remote';
  /** Merged data (if merge strategy) */
  readonly mergedData?: unknown;
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  /** Sync session ID */
  readonly sessionId: string;
  /** Sync phase */
  readonly phase: 'preparing' | 'pulling' | 'pushing' | 'resolving-conflicts' | 'finalizing' | 'complete' | 'error';
  /** Total items to sync */
  readonly totalItems: number;
  /** Items synced so far */
  readonly syncedItems: number;
  /** Current item being synced */
  readonly currentItem?: string;
  /** Percentage complete (0-100) */
  readonly percentComplete: number;
  /** Estimated time remaining (ms) */
  readonly estimatedTimeRemaining?: number;
  /** Sync errors encountered */
  readonly errors: Array<{ entityId: string; error: string }>;
  /** Conflicts detected */
  readonly conflicts: SyncConflict[];
  /** Timestamp when sync started */
  readonly startedAt: number;
  /** Timestamp when sync completed (if complete) */
  readonly completedAt?: number;
}

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Sync direction */
  readonly direction: SyncDirection;
  /** Entity types to sync */
  readonly entityTypes: SyncEntityType[];
  /** Conflict resolution strategy */
  readonly conflictStrategy: ConflictStrategy;
  /** Enable real-time sync */
  readonly realTimeSync?: boolean;
  /** Sync interval in milliseconds (for periodic sync) */
  readonly syncInterval?: number;
  /** Only sync over WiFi */
  readonly wifiOnly?: boolean;
  /** Maximum sync batch size */
  readonly batchSize?: number;
}

/**
 * Sync statistics
 */
export interface SyncStats {
  /** Last successful sync timestamp */
  readonly lastSyncAt?: number;
  /** Total syncs performed */
  readonly totalSyncs: number;
  /** Total items synced */
  readonly totalItemsSynced: number;
  /** Total conflicts encountered */
  readonly totalConflicts: number;
  /** Total errors encountered */
  readonly totalErrors: number;
  /** Average sync duration (ms) */
  readonly avgSyncDuration?: number;
}

/**
 * Sync provider callback for progress updates
 */
export type SyncProgressCallback = (progress: SyncProgress) => void;

/**
 * Sync provider plugin interface
 * Extends BasePlugin with synchronization operations
 */
export interface SyncProvider extends BasePlugin {
  /**
   * Get provider capabilities
   */
  readonly capabilities: Set<SyncCapability>;

  /**
   * Start a sync operation
   * @param config - Sync configuration
   * @param onProgress - Optional progress callback
   */
  startSync(
    config?: Partial<SyncConfig>,
    onProgress?: SyncProgressCallback
  ): AsyncResult<SyncProgress, Error>;

  /**
   * Cancel an ongoing sync operation
   * @param sessionId - Sync session ID
   */
  cancelSync(sessionId: string): AsyncResult<void, Error>;

  /**
   * Get sync status for current or last sync
   */
  getSyncStatus(): AsyncResult<SyncProgress | null, Error>;

  /**
   * Get pending sync changes
   * Returns changes that haven't been synced yet
   */
  getPendingChanges(): AsyncResult<SyncChange[], Error>;

  /**
   * Get detected conflicts
   */
  getConflicts(): AsyncResult<SyncConflict[], Error>;

  /**
   * Resolve a sync conflict
   * @param resolution - Conflict resolution decision
   */
  resolveConflict(resolution: ConflictResolution): AsyncResult<void, Error>;

  /**
   * Resolve all conflicts using a strategy
   * @param strategy - Strategy to apply to all conflicts
   */
  resolveAllConflicts(strategy: ConflictStrategy): AsyncResult<void, Error>;

  /**
   * Push local changes to remote
   * @param changes - Changes to push (if empty, pushes all pending)
   */
  pushChanges(changes?: SyncChange[]): AsyncResult<SyncProgress, Error>;

  /**
   * Pull remote changes to local
   * @param entityTypes - Entity types to pull (if empty, pulls all)
   */
  pullChanges(entityTypes?: SyncEntityType[]): AsyncResult<SyncProgress, Error>;

  /**
   * Record a local change for later sync
   * Used when offline or real-time sync is disabled
   * @param change - Change to record
   */
  recordChange(change: Omit<SyncChange, 'id' | 'timestamp'>): Result<void, Error>;

  /**
   * Get sync configuration
   */
  getConfig(): SyncConfig;

  /**
   * Update sync configuration
   * @param config - New configuration (partial update)
   */
  updateConfig(config: Partial<SyncConfig>): Result<void, Error>;

  /**
   * Get sync statistics
   */
  getStats(): SyncStats;

  /**
   * Clear sync history and statistics
   */
  clearSyncHistory(): AsyncResult<void, Error>;

  /**
   * Enable or disable real-time sync
   * @param enabled - Whether real-time sync should be enabled
   */
  setRealTimeSync?(enabled: boolean): AsyncResult<void, Error>;

  /**
   * Manually trigger a full sync
   * Resyncs everything from scratch
   */
  fullSync?(onProgress?: SyncProgressCallback): AsyncResult<SyncProgress, Error>;

  /**
   * Check if a capability is supported
   */
  hasCapability(capability: SyncCapability): boolean;
}

/**
 * Helper to create a sync change record
 */
export function createSyncChange(
  params: Omit<SyncChange, 'id' | 'timestamp'>
): SyncChange {
  return {
    id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    ...params,
  };
}

/**
 * Helper to create initial sync progress
 */
export function createSyncProgress(
  sessionId: string,
  totalItems: number
): SyncProgress {
  return {
    sessionId,
    phase: 'preparing',
    totalItems,
    syncedItems: 0,
    percentComplete: 0,
    errors: [],
    conflicts: [],
    startedAt: Date.now(),
  };
}

/**
 * Helper to calculate sync progress percentage
 */
export function calculateSyncProgress(progress: SyncProgress): number {
  if (progress.totalItems === 0) return 100;
  return Math.min(100, Math.round((progress.syncedItems / progress.totalItems) * 100));
}

/**
 * Type guard to check if a plugin is a sync provider
 */
export function isSyncProvider(plugin: BasePlugin): plugin is SyncProvider {
  return (
    plugin.manifest.category === 'sync-provider' &&
    'startSync' in plugin &&
    'getPendingChanges' in plugin &&
    'resolveConflict' in plugin
  );
}

/**
 * Default sync configuration
 */
export const defaultSyncConfig: SyncConfig = {
  direction: 'bidirectional',
  entityTypes: ['track', 'playlist', 'playback-state'],
  conflictStrategy: 'newest-wins',
  realTimeSync: false,
  syncInterval: 300000, // 5 minutes
  wifiOnly: true,
  batchSize: 100,
};
