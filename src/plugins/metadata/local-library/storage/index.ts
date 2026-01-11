export {
	useLocalLibraryStore,
	useFolders,
	useIsScanning,
	useScanProgress,
	useTrackCount,
	useAlbumCount,
	useArtistCount,
	waitForLocalLibraryHydration,
	getLocalLibraryState,
	rebuildAlbumsAndArtists,
} from './local-library-store';

export {
	initializeDatabase,
	closeDatabase,
	indexTrack,
	indexTracks,
	removeTrack,
	removeTracksForFolder,
	searchTracks,
	getTrackCount,
	getAllTracks,
	clearDatabase,
	type SearchResult,
} from './database';
