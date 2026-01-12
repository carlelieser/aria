import { ok, type AsyncResult } from '@shared/types/result';
import type { FolderInfo } from '../types';
import { useLocalLibraryStore } from '../storage/local-library-store';

export interface LibraryStats {
	readonly trackCount: number;
	readonly albumCount: number;
	readonly artistCount: number;
}

/**
 * Get library statistics.
 */
export function getLibraryStats(): LibraryStats {
	const state = useLocalLibraryStore.getState();
	return {
		trackCount: Object.keys(state.tracks).length,
		albumCount: Object.keys(state.albums).length,
		artistCount: Object.keys(state.artists).length,
	};
}

/**
 * Get all folders in the library.
 */
export function getFolders(): FolderInfo[] {
	return useLocalLibraryStore.getState().folders;
}

/**
 * Clear the entire library.
 */
export async function clearLibrary(): AsyncResult<void, Error> {
	try {
		const store = useLocalLibraryStore.getState();
		store.clearLibrary();
		return ok(undefined);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { success: false, error: new Error(`Failed to clear library: ${message}`) };
	}
}
