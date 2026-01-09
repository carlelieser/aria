import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../../domain/entities/track';
import type { Playlist } from '../../domain/entities/playlist';

/**
 * Library store state shape
 */
interface LibraryState {
  // State
  tracks: Track[];
  playlists: Playlist[];
  favorites: Set<string>;
  isLoading: boolean;
  lastSyncedAt: Date | null;

  // Actions
  addTrack: (track: Track) => void;
  addTracks: (tracks: Track[]) => void;
  removeTrack: (trackId: string) => void;
  toggleFavorite: (trackId: string) => void;
  isFavorite: (trackId: string) => boolean;

  setPlaylists: (playlists: Playlist[]) => void;
  addPlaylist: (playlist: Playlist) => void;
  removePlaylist: (playlistId: string) => void;
  updatePlaylist: (playlistId: string, updates: Partial<Playlist>) => void;

  setLoading: (isLoading: boolean) => void;
  setSyncedAt: (date: Date) => void;

  // Queries
  getFavoriteTracks: () => Track[];
  getTrackById: (trackId: string) => Track | undefined;
  getPlaylistById: (playlistId: string) => Playlist | undefined;
}

/**
 * Custom storage for persisting favorites as an array (Set is not JSON serializable)
 */
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

/**
 * Library store with persistence for favorites
 */
export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      // Initial state
      tracks: [],
      playlists: [],
      favorites: new Set<string>(),
      isLoading: false,
      lastSyncedAt: null,

      // Track management
      addTrack: (track: Track) => {
        set((state) => {
          const exists = state.tracks.some((t) => t.id.value === track.id.value);
          if (exists) {
            return state;
          }
          return { tracks: [...state.tracks, track] };
        });
      },

      addTracks: (tracks: Track[]) => {
        set((state) => {
          const existingIds = new Set(state.tracks.map((t) => t.id.value));
          const newTracks = tracks.filter((t) => !existingIds.has(t.id.value));

          if (newTracks.length === 0) {
            return state;
          }

          return { tracks: [...state.tracks, ...newTracks] };
        });
      },

      removeTrack: (trackId: string) => {
        set((state) => ({
          tracks: state.tracks.filter((t) => t.id.value !== trackId),
          favorites: new Set(
            Array.from(state.favorites).filter((id) => id !== trackId)
          ),
        }));
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

      // Playlist management
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

      // State management
      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      setSyncedAt: (date: Date) => {
        set({ lastSyncedAt: date });
      },

      // Queries
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
      // Only persist favorites and lastSyncedAt
      partialize: (state) => ({
        favorites: Array.from(state.favorites),
        lastSyncedAt: state.lastSyncedAt,
      }),
      // Restore Set from Array
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.favorites = new Set(state.favorites as unknown as string[]);
        }
      },
    }
  )
);

/**
 * Selector hooks for common library queries
 */
export const useTracks = () => useLibraryStore((state) => state.tracks);
export const usePlaylists = () => useLibraryStore((state) => state.playlists);
export const useFavorites = () => useLibraryStore((state) => state.favorites);
export const useFavoriteTracks = () => useLibraryStore((state) => state.getFavoriteTracks());
export const useIsLibraryLoading = () => useLibraryStore((state) => state.isLoading);
export const useTrack = (trackId: string) =>
  useLibraryStore((state) => state.getTrackById(trackId));
export const usePlaylist = (playlistId: string) =>
  useLibraryStore((state) => state.getPlaylistById(playlistId));
export const useIsFavorite = (trackId: string) =>
  useLibraryStore((state) => state.isFavorite(trackId));
