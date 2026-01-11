export { LocalLibraryProvider } from './local-library-provider';
export { LocalLibraryPluginModule } from './plugin-module';
export { PLUGIN_MANIFEST, CONFIG_SCHEMA, DEFAULT_CONFIG } from './config';
export type { LocalLibraryConfig } from './config';
export type {
	ScannedFile,
	ParsedMetadata,
	EmbeddedArtwork,
	LocalTrack,
	LocalAlbum,
	LocalArtist,
	ScanProgress,
	FolderInfo,
} from './types';

// Re-export storage hooks for UI
export {
	useLocalLibraryStore,
	useFolders,
	useIsScanning,
	useScanProgress,
	useTrackCount,
	useAlbumCount,
	useArtistCount,
} from './storage/local-library-store';

// Re-export mappers for external use
export { localTrackToTrack, localAlbumToAlbum, localArtistToArtist } from './mappers';
