import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { LocalTrack, LocalAlbum, LocalArtist, ScanProgress, FolderInfo } from '../types';

interface LocalLibraryState {
	folders: FolderInfo[];
	tracks: Record<string, LocalTrack>;
	albums: Record<string, LocalAlbum>;
	artists: Record<string, LocalArtist>;

	isScanning: boolean;
	scanProgress: ScanProgress | null;
	lastScannedAt: number | null;

	// Folder actions
	addFolder: (folder: FolderInfo) => void;
	removeFolder: (folderUri: string) => void;
	updateFolderScanTime: (folderUri: string) => void;

	// Track actions
	addTrack: (track: LocalTrack) => void;
	addTracks: (tracks: LocalTrack[]) => void;
	removeTrack: (trackId: string) => void;
	removeTracksForFolder: (folderUri: string) => void;
	updateTrack: (trackId: string, updates: Partial<LocalTrack>) => void;

	// Album actions
	setAlbums: (albums: Record<string, LocalAlbum>) => void;
	removeAlbumsForFolder: (folderUri: string) => void;

	// Artist actions
	setArtists: (artists: Record<string, LocalArtist>) => void;
	removeArtistsForFolder: (folderUri: string) => void;

	// Scan state
	setScanProgress: (progress: ScanProgress | null) => void;
	setIsScanning: (isScanning: boolean) => void;

	// Library actions
	clearLibrary: () => void;

	// Queries
	getTrack: (trackId: string) => LocalTrack | undefined;
	getAlbum: (albumId: string) => LocalAlbum | undefined;
	getArtist: (artistId: string) => LocalArtist | undefined;
	getTracksByAlbum: (albumId: string) => LocalTrack[];
	getAlbumsByArtist: (artistId: string) => LocalAlbum[];
	searchTracks: (query: string, limit?: number) => LocalTrack[];
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		return AsyncStorage.getItem(name);
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

let resolveHydration: (() => void) | null = null;
const hydrationPromise = new Promise<void>((resolve) => {
	resolveHydration = resolve;
});

export const useLocalLibraryStore = create<LocalLibraryState>()(
	persist(
		(set, get) => ({
			folders: [],
			tracks: {},
			albums: {},
			artists: {},
			isScanning: false,
			scanProgress: null,
			lastScannedAt: null,

			// Folder actions
			addFolder: (folder) => {
				const { folders } = get();
				if (!folders.some((f) => f.uri === folder.uri)) {
					set({ folders: [...folders, folder] });
				}
			},

			removeFolder: (folderUri) => {
				const { folders } = get();
				set({ folders: folders.filter((f) => f.uri !== folderUri) });
			},

			updateFolderScanTime: (folderUri) => {
				const { folders } = get();
				set({
					folders: folders.map((f) =>
						f.uri === folderUri ? { ...f, lastScannedAt: Date.now() } : f
					),
				});
			},

			// Track actions
			addTrack: (track) => {
				const { tracks } = get();
				set({ tracks: { ...tracks, [track.id]: track } });
			},

			addTracks: (newTracks) => {
				const { tracks } = get();
				const updated = { ...tracks };
				for (const track of newTracks) {
					updated[track.id] = track;
				}
				set({ tracks: updated });
			},

			removeTrack: (trackId) => {
				const { tracks } = get();
				const { [trackId]: _, ...rest } = tracks;
				set({ tracks: rest });
			},

			removeTracksForFolder: (folderUri) => {
				const { tracks } = get();
				const filtered: Record<string, LocalTrack> = {};
				for (const [id, track] of Object.entries(tracks)) {
					if (!track.filePath.startsWith(folderUri)) {
						filtered[id] = track;
					}
				}
				set({ tracks: filtered });
			},

			updateTrack: (trackId, updates) => {
				const { tracks } = get();
				const existing = tracks[trackId];
				if (existing) {
					set({
						tracks: {
							...tracks,
							[trackId]: { ...existing, ...updates },
						},
					});
				}
			},

			// Album actions
			setAlbums: (albums) => {
				set({ albums });
			},

			removeAlbumsForFolder: (_folderUri) => {
				// Albums are derived from tracks, so we rebuild after track removal
				const { tracks } = get();
				const albumMap = _buildAlbumsFromTracks(Object.values(tracks));
				set({ albums: albumMap });
			},

			// Artist actions
			setArtists: (artists) => {
				set({ artists });
			},

			removeArtistsForFolder: (_folderUri) => {
				// Artists are derived from tracks, so we rebuild after track removal
				const { tracks, albums } = get();
				const artistMap = _buildArtistsFromTracks(
					Object.values(tracks),
					Object.values(albums)
				);
				set({ artists: artistMap });
			},

			// Scan state
			setScanProgress: (progress) => {
				set({ scanProgress: progress });
			},

			setIsScanning: (isScanning) => {
				set({
					isScanning,
					lastScannedAt: isScanning ? get().lastScannedAt : Date.now(),
				});
			},

			// Library actions
			clearLibrary: () => {
				set({
					folders: [],
					tracks: {},
					albums: {},
					artists: {},
					scanProgress: null,
					lastScannedAt: null,
				});
			},

			// Queries
			getTrack: (trackId) => get().tracks[trackId],
			getAlbum: (albumId) => get().albums[albumId],
			getArtist: (artistId) => get().artists[artistId],

			getTracksByAlbum: (albumId) => {
				const { tracks } = get();
				return Object.values(tracks).filter((t) => t.albumId === albumId);
			},

			getAlbumsByArtist: (artistId) => {
				const { albums } = get();
				return Object.values(albums).filter((a) => a.artistId === artistId);
			},

			searchTracks: (query, limit = 50) => {
				const { tracks } = get();
				const lowerQuery = query.toLowerCase();
				const results: LocalTrack[] = [];

				for (const track of Object.values(tracks)) {
					if (
						track.title.toLowerCase().includes(lowerQuery) ||
						track.artistName.toLowerCase().includes(lowerQuery) ||
						(track.albumName?.toLowerCase().includes(lowerQuery) ?? false)
					) {
						results.push(track);
						if (results.length >= limit) break;
					}
				}

				return results;
			},
		}),
		{
			name: 'aria-local-library',
			storage: createJSONStorage(() => customStorage),
			partialize: (state) => ({
				folders: state.folders,
				tracks: state.tracks,
				albums: state.albums,
				artists: state.artists,
				lastScannedAt: state.lastScannedAt,
			}),
			onRehydrateStorage: () => {
				return () => {
					resolveHydration?.();
				};
			},
		}
	)
);

function _buildAlbumsFromTracks(tracks: LocalTrack[]): Record<string, LocalAlbum> {
	const albums: Record<string, LocalAlbum> = {};

	for (const track of tracks) {
		if (!track.albumId || !track.albumName) continue;

		const existing = albums[track.albumId];
		if (existing) {
			albums[track.albumId] = {
				...existing,
				trackCount: existing.trackCount + 1,
				totalDuration: existing.totalDuration + track.duration,
			};
		} else {
			albums[track.albumId] = {
				id: track.albumId,
				name: track.albumName,
				artistId: track.artistId,
				artistName: track.artistName,
				year: track.year,
				trackCount: 1,
				totalDuration: track.duration,
				artworkPath: track.artworkPath,
			};
		}
	}

	return albums;
}

function _buildArtistsFromTracks(
	tracks: LocalTrack[],
	albums: LocalAlbum[]
): Record<string, LocalArtist> {
	const artists: Record<string, LocalArtist> = {};
	const albumsByArtist: Record<string, Set<string>> = {};

	for (const track of tracks) {
		const existing = artists[track.artistId];
		if (existing) {
			artists[track.artistId] = {
				...existing,
				trackCount: existing.trackCount + 1,
			};
		} else {
			artists[track.artistId] = {
				id: track.artistId,
				name: track.artistName,
				albumCount: 0,
				trackCount: 1,
			};
		}

		if (track.albumId) {
			if (!albumsByArtist[track.artistId]) {
				albumsByArtist[track.artistId] = new Set();
			}
			albumsByArtist[track.artistId].add(track.albumId);
		}
	}

	// Update album counts
	for (const [artistId, albumSet] of Object.entries(albumsByArtist)) {
		if (artists[artistId]) {
			artists[artistId] = {
				...artists[artistId],
				albumCount: albumSet.size,
			};
		}
	}

	return artists;
}

// Selector hooks
export const useFolders = () => useLocalLibraryStore((state) => state.folders);
export const useIsScanning = () => useLocalLibraryStore((state) => state.isScanning);
export const useScanProgress = () => useLocalLibraryStore((state) => state.scanProgress);
export const useTrackCount = () =>
	useLocalLibraryStore((state) => Object.keys(state.tracks).length);
export const useAlbumCount = () =>
	useLocalLibraryStore((state) => Object.keys(state.albums).length);
export const useArtistCount = () =>
	useLocalLibraryStore((state) => Object.keys(state.artists).length);

export function waitForLocalLibraryHydration(): Promise<void> {
	return hydrationPromise;
}

export function getLocalLibraryState(): LocalLibraryState {
	return useLocalLibraryStore.getState();
}

export function rebuildAlbumsAndArtists(): void {
	const state = useLocalLibraryStore.getState();
	const tracks = Object.values(state.tracks);
	const albums = _buildAlbumsFromTracks(tracks);
	const artists = _buildArtistsFromTracks(tracks, Object.values(albums));
	useLocalLibraryStore.setState({ albums, artists });
}
