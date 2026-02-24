/**
 * useLocalLibrary Hook
 *
 * Presentation-layer bridge for accessing local library state.
 * Components use this hook; it delegates to the application-layer facade.
 */

import {
	useFolders,
	useIsScanning,
	useScanProgress,
	useLocalTracks,
	useLocalAlbums,
	useLocalArtists,
	useLocalTrackCount,
	pickLibraryFolder,
} from '@/src/application/services/local-library-facade';
import type {
	ScanProgress,
	FolderInfo,
	LocalTrack,
	LocalAlbum,
	LocalArtist,
} from '@shared/types/local-library-types';

// Re-export hooks for direct use by components
export {
	useFolders,
	useIsScanning,
	useScanProgress,
	useLocalTracks,
	useLocalAlbums,
	useLocalArtists,
	useLocalTrackCount,
	pickLibraryFolder,
};

// Re-export types for consumers
export type { ScanProgress, FolderInfo, LocalTrack, LocalAlbum, LocalArtist };
