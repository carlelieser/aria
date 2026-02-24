/**
 * Local Library Facade
 *
 * Application-layer facade for accessing local library state and operations.
 * Hooks and components access local library through this service
 * instead of importing from the plugins layer directly.
 */

import {
	useLocalLibraryStore,
	useFolders as _useFolders,
	useIsScanning as _useIsScanning,
	useScanProgress as _useScanProgress,
} from '@/src/plugins/metadata/local-library/storage/local-library-store';
import { pickFolder } from '@/src/plugins/metadata/local-library/scanner/folder-scanner';
import type {
	ScanProgress,
	FolderInfo,
	LocalTrack,
	LocalAlbum,
	LocalArtist,
} from '@shared/types/local-library-types';
import type { AsyncResult } from '@shared/types/result';

// Re-export types for consumers
export type { ScanProgress, FolderInfo, LocalTrack, LocalAlbum, LocalArtist };

// Re-export selector hooks for use by hooks/components
export const useFolders = _useFolders;
export const useIsScanning = _useIsScanning;
export const useScanProgress = _useScanProgress;

/**
 * Select local library tracks from the store.
 */
export function useLocalTracks(): Record<string, LocalTrack> {
	return useLocalLibraryStore((state) => state.tracks);
}

/**
 * Select local library albums from the store.
 */
export function useLocalAlbums(): Record<string, LocalAlbum> {
	return useLocalLibraryStore((state) => state.albums);
}

/**
 * Select local library artists from the store.
 */
export function useLocalArtists(): Record<string, LocalArtist> {
	return useLocalLibraryStore((state) => state.artists);
}

/**
 * Count of local library tracks.
 */
export function useLocalTrackCount(): number {
	return useLocalLibraryStore((state) => Object.keys(state.tracks).length);
}

/**
 * Wraps the folder picker for use by hooks/components.
 */
export async function pickLibraryFolder(): AsyncResult<{ uri: string; name: string }, Error> {
	return pickFolder();
}
