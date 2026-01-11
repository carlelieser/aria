import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../../domain/entities/track';
import type { Playlist } from '../../domain/entities/playlist';

interface LibraryState {
	tracks: Track[];
	playlists: Playlist[];
	favorites: Set<string>;
	isLoading: boolean;
	lastSyncedAt: Date | null;

	addTrack: (track: Track) => void;
	addTracks: (tracks: Track[]) => void;
	removeTrack: (trackId: string) => void;
	toggleFavorite: (trackId: string) => void;
	isFavorite: (trackId: string) => boolean;

	setPlaylists: (playlists: Playlist[]) => void;
	addPlaylist: (playlist: Playlist) => void;
	removePlaylist: (playlistId: string) => void;
	updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;
	addTrackToPlaylist: (playlistId: string, track: Track) => void;
	removeTrackFromPlaylist: (playlistId: string, position: number) => void;
	renamePlaylist: (playlistId: string, name: string) => void;
	reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => void;

	setLoading: (isLoading: boolean) => void;
	setSyncedAt: (date: Date) => void;

	getFavoriteTracks: () => Track[];
	getTrackById: (trackId: string) => Track | undefined;
	getPlaylistById: (playlistId: string) => Playlist | undefined;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		const value = await AsyncStorage.getItem(name);
		return value;
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

export const useLibraryStore = create<LibraryState>()(
	persist(
		(set, get) => ({
			tracks: [],
			playlists: [],
			favorites: new Set<string>(),
			isLoading: false,
			lastSyncedAt: null,

			addTrack: (track: Track) => {
				set((state) => {
					const exists = state.tracks.some((t) => t.id.value === track.id.value);
					if (exists) {
						return state;
					}
					return { tracks: [...state.tracks, { ...track, addedAt: new Date() }] };
				});
			},

			addTracks: (tracks: Track[]) => {
				set((state) => {
					const existingIds = new Set(state.tracks.map((t) => t.id.value));
					const newTracks = tracks.filter((t) => !existingIds.has(t.id.value));

					if (newTracks.length === 0) {
						return state;
					}

					const now = new Date();
					const tracksWithAddedAt = newTracks.map((t) => ({ ...t, addedAt: now }));
					return { tracks: [...state.tracks, ...tracksWithAddedAt] };
				});
			},

			removeTrack: (trackId: string) => {
				set((state) => {
					// Optimized: Direct Set delete instead of Array.from + filter
					const newFavorites = new Set(state.favorites);
					newFavorites.delete(trackId);
					return {
						tracks: state.tracks.filter((t) => t.id.value !== trackId),
						favorites: newFavorites,
					};
				});
			},

			toggleFavorite: (trackId: string) => {
				set((state) => {
					const newFavorites = new Set(state.favorites);

					if (newFavorites.has(trackId)) {
						newFavorites.delete(trackId);
					} else {
						newFavorites.add(trackId);
					}

					return { favorites: newFavorites };
				});
			},

			isFavorite: (trackId: string) => {
				return get().favorites.has(trackId);
			},

			setPlaylists: (playlists: Playlist[]) => {
				set({ playlists });
			},

			addPlaylist: (playlist: Playlist) => {
				set((state) => {
					const exists = state.playlists.some((p) => p.id === playlist.id);
					if (exists) {
						return state;
					}
					return { playlists: [...state.playlists, playlist] };
				});
			},

			removePlaylist: (playlistId: string) => {
				set((state) => ({
					playlists: state.playlists.filter((p) => p.id !== playlistId),
				}));
			},

			updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => {
				set((state) => ({
					playlists: state.playlists.map((p) =>
						p.id === playlistId ? { ...p, ...updates } : p
					),
				}));
			},

			addTrackToPlaylist: (playlistId: string, track: Track) => {
				set((state) => ({
					playlists: state.playlists.map((p) => {
						if (p.id !== playlistId) return p;

						const exists = p.tracks.some((pt) => pt.track.id.value === track.id.value);
						if (exists) return p;

						return {
							...p,
							tracks: [
								...p.tracks,
								{
									track,
									addedAt: new Date(),
									position: p.tracks.length,
								},
							],
							updatedAt: new Date(),
						};
					}),
				}));
			},

			removeTrackFromPlaylist: (playlistId: string, position: number) => {
				set((state) => ({
					playlists: state.playlists.map((p) => {
						if (p.id !== playlistId) return p;

						const newTracks = p.tracks
							.filter((t) => t.position !== position)
							.map((t, index) => ({ ...t, position: index }));

						return {
							...p,
							tracks: newTracks,
							updatedAt: new Date(),
						};
					}),
				}));
			},

			renamePlaylist: (playlistId: string, name: string) => {
				set((state) => ({
					playlists: state.playlists.map((p) =>
						p.id === playlistId ? { ...p, name, updatedAt: new Date() } : p
					),
				}));
			},

			reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => {
				set((state) => ({
					playlists: state.playlists.map((p) => {
						if (p.id !== playlistId) return p;

						const tracks = [...p.tracks];
						const [moved] = tracks.splice(fromIndex, 1);
						tracks.splice(toIndex, 0, moved);

						const reorderedTracks = tracks.map((t, index) => ({
							...t,
							position: index,
						}));

						return {
							...p,
							tracks: reorderedTracks,
							updatedAt: new Date(),
						};
					}),
				}));
			},

			setLoading: (isLoading: boolean) => {
				set({ isLoading });
			},

			setSyncedAt: (date: Date) => {
				set({ lastSyncedAt: date });
			},

			getFavoriteTracks: () => {
				const state = get();
				const favoriteIds = Array.from(state.favorites);
				return state.tracks.filter((t) => favoriteIds.includes(t.id.value));
			},

			getTrackById: (trackId: string) => {
				return get().tracks.find((t) => t.id.value === trackId);
			},

			getPlaylistById: (playlistId: string) => {
				return get().playlists.find((p) => p.id === playlistId);
			},
		}),
		{
			name: 'aria-library-storage',
			storage: createJSONStorage(() => customStorage),

			partialize: (state) => ({
				favorites: Array.from(state.favorites),
				lastSyncedAt: state.lastSyncedAt,
			}),

			onRehydrateStorage: () => (state) => {
				if (state) {
					state.favorites = new Set(state.favorites as unknown as string[]);
				}
			},
		}
	)
);

export interface UniqueArtist {
	id: string;
	name: string;
	trackCount: number;
	artworkUrl?: string;
}

function extractUniqueArtists(tracks: Track[]): UniqueArtist[] {
	const artistMap = new Map<string, UniqueArtist>();

	for (const track of tracks) {
		for (const artist of track.artists) {
			const existing = artistMap.get(artist.id);
			if (existing) {
				existing.trackCount += 1;
			} else {
				artistMap.set(artist.id, {
					id: artist.id,
					name: artist.name,
					trackCount: 1,
					artworkUrl: track.artwork?.[0]?.url,
				});
			}
		}
	}

	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

let cachedArtists: UniqueArtist[] = [];
let cachedArtistsTracksRef: Track[] | null = null;

export const useTracks = () => useLibraryStore((state) => state.tracks);
export const usePlaylists = () => useLibraryStore((state) => state.playlists);
export const useFavorites = () => useLibraryStore((state) => state.favorites);
export const useIsLibraryLoading = () => useLibraryStore((state) => state.isLoading);

// Memoized favorite tracks selector - avoids creating new array on every render
let cachedFavoriteTracks: Track[] = [];
let cachedFavoritesSet: Set<string> | null = null;
let cachedFavoriteTracksArray: Track[] | null = null;

export const useFavoriteTracks = () =>
	useLibraryStore((state) => {
		// Return cached if underlying data hasn't changed (reference equality)
		if (state.favorites === cachedFavoritesSet && state.tracks === cachedFavoriteTracksArray) {
			return cachedFavoriteTracks;
		}

		// Recompute only when favorites or tracks change
		cachedFavoriteTracks = state.tracks.filter((t) => state.favorites.has(t.id.value));
		cachedFavoritesSet = state.favorites;
		cachedFavoriteTracksArray = state.tracks;

		return cachedFavoriteTracks;
	});
export const useTrack = (trackId: string) =>
	useLibraryStore((state) => state.getTrackById(trackId));
export const usePlaylist = (playlistId: string) =>
	useLibraryStore((state) => state.getPlaylistById(playlistId));
export const useIsFavorite = (trackId: string) =>
	useLibraryStore((state) => state.isFavorite(trackId));

export const useUniqueArtists = () =>
	useLibraryStore((state) => {
		// Use reference equality - tracks array only changes when modified
		if (state.tracks === cachedArtistsTracksRef) {
			return cachedArtists;
		}

		cachedArtists = extractUniqueArtists(state.tracks);
		cachedArtistsTracksRef = state.tracks;

		return cachedArtists;
	});

let cachedRecentlyAdded: Track[] = [];
let cachedRecentlyAddedTracksRef: Track[] | null = null;
let cachedRecentlyAddedLimit = -1;

export const useRecentlyAddedTracks = (limit = 10) =>
	useLibraryStore((state) => {
		// Use reference equality and check limit parameter
		if (state.tracks === cachedRecentlyAddedTracksRef && limit === cachedRecentlyAddedLimit) {
			return cachedRecentlyAdded;
		}

		// Sort by addedAt descending and take first `limit` tracks
		cachedRecentlyAdded = [...state.tracks]
			.sort((a, b) => {
				const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
				const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
				return dateB - dateA;
			})
			.slice(0, limit);

		cachedRecentlyAddedTracksRef = state.tracks;
		cachedRecentlyAddedLimit = limit;

		return cachedRecentlyAdded;
	});
