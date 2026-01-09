import type { BasePlugin } from './base-plugin';
import type { Result, AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Playlist } from '@domain/entities/playlist';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';

export type SyncCapability =
	| 'sync-library'
	| 'sync-playlists'
	| 'sync-favorites'
	| 'sync-playback'
	| 'sync-settings'
	| 'conflict-resolution'
	| 'incremental-sync'
	| 'real-time-sync'
	| 'offline-queue';

export type SyncEntityType =
	| 'track'
	| 'playlist'
	| 'album'
	| 'artist'
	| 'playback-state'
	| 'settings';

export type SyncOperation = 'create' | 'update' | 'delete';

export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export type ConflictStrategy = 'local-wins' | 'remote-wins' | 'newest-wins' | 'manual' | 'merge';

export interface SyncChange {
	readonly id: string;

	readonly entityType: SyncEntityType;

	readonly entityId: string;

	readonly operation: SyncOperation;

	readonly timestamp: number;

	readonly data?: unknown;

	readonly hash?: string;

	readonly sourceId?: string;
}

export interface SyncConflict {
	readonly id: string;

	readonly entityType: SyncEntityType;

	readonly entityId: string;

	readonly localChange: SyncChange;

	readonly remoteChange: SyncChange;

	readonly detectedAt: number;
}

export interface ConflictResolution {
	readonly conflictId: string;

	readonly strategy: ConflictStrategy;

	readonly chosenChange?: 'local' | 'remote';

	readonly mergedData?: unknown;
}

export interface SyncProgress {
	readonly sessionId: string;

	readonly phase:
		| 'preparing'
		| 'pulling'
		| 'pushing'
		| 'resolving-conflicts'
		| 'finalizing'
		| 'complete'
		| 'error';

	readonly totalItems: number;

	readonly syncedItems: number;

	readonly currentItem?: string;

	readonly percentComplete: number;

	readonly estimatedTimeRemaining?: number;

	readonly errors: Array<{ entityId: string; error: string }>;

	readonly conflicts: SyncConflict[];

	readonly startedAt: number;

	readonly completedAt?: number;
}

export interface SyncConfig {
	readonly direction: SyncDirection;

	readonly entityTypes: SyncEntityType[];

	readonly conflictStrategy: ConflictStrategy;

	readonly realTimeSync?: boolean;

	readonly syncInterval?: number;

	readonly wifiOnly?: boolean;

	readonly batchSize?: number;
}

export interface SyncStats {
	readonly lastSyncAt?: number;

	readonly totalSyncs: number;

	readonly totalItemsSynced: number;

	readonly totalConflicts: number;

	readonly totalErrors: number;

	readonly avgSyncDuration?: number;
}

export type SyncProgressCallback = (progress: SyncProgress) => void;

export interface SyncProvider extends BasePlugin {
	readonly capabilities: Set<SyncCapability>;

	startSync(
		config?: Partial<SyncConfig>,
		onProgress?: SyncProgressCallback
	): AsyncResult<SyncProgress, Error>;

	cancelSync(sessionId: string): AsyncResult<void, Error>;

	getSyncStatus(): AsyncResult<SyncProgress | null, Error>;

	getPendingChanges(): AsyncResult<SyncChange[], Error>;

	getConflicts(): AsyncResult<SyncConflict[], Error>;

	resolveConflict(resolution: ConflictResolution): AsyncResult<void, Error>;

	resolveAllConflicts(strategy: ConflictStrategy): AsyncResult<void, Error>;

	pushChanges(changes?: SyncChange[]): AsyncResult<SyncProgress, Error>;

	pullChanges(entityTypes?: SyncEntityType[]): AsyncResult<SyncProgress, Error>;

	recordChange(change: Omit<SyncChange, 'id' | 'timestamp'>): Result<void, Error>;

	getConfig(): SyncConfig;

	updateConfig(config: Partial<SyncConfig>): Result<void, Error>;

	getStats(): SyncStats;

	clearSyncHistory(): AsyncResult<void, Error>;

	setRealTimeSync?(enabled: boolean): AsyncResult<void, Error>;

	fullSync?(onProgress?: SyncProgressCallback): AsyncResult<SyncProgress, Error>;

	hasCapability(capability: SyncCapability): boolean;
}

export function createSyncChange(params: Omit<SyncChange, 'id' | 'timestamp'>): SyncChange {
	return {
		id: `sync_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		timestamp: Date.now(),
		...params,
	};
}

export function createSyncProgress(sessionId: string, totalItems: number): SyncProgress {
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

export function calculateSyncProgress(progress: SyncProgress): number {
	if (progress.totalItems === 0) return 100;
	return Math.min(100, Math.round((progress.syncedItems / progress.totalItems) * 100));
}

export function isSyncProvider(plugin: BasePlugin): plugin is SyncProvider {
	return (
		plugin.manifest.category === 'sync-provider' &&
		'startSync' in plugin &&
		'getPendingChanges' in plugin &&
		'resolveConflict' in plugin
	);
}

export const defaultSyncConfig: SyncConfig = {
	direction: 'bidirectional',
	entityTypes: ['track', 'playlist', 'playback-state'],
	conflictStrategy: 'newest-wins',
	realTimeSync: false,
	syncInterval: 300000,
	wifiOnly: true,
	batchSize: 100,
};
