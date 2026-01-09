import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Track } from '../../domain/entities/track';

/**
 * History entry with timestamp
 */
interface HistoryEntry {
  track: Track;
  playedAt: number;
}

/**
 * History store state shape
 */
interface HistoryState {
  // State
  recentlyPlayed: HistoryEntry[];

  // Actions
  addToHistory: (track: Track) => void;
  clearHistory: () => void;
  removeFromHistory: (trackId: string) => void;

  // Queries
  getRecentTracks: (limit?: number) => Track[];
}

/**
 * Maximum number of tracks to keep in history
 */
const MAX_HISTORY_SIZE = 50;

/**
 * History store for tracking recently played tracks
 */
export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      recentlyPlayed: [],

      // Actions
      addToHistory: (track: Track) => {
        set((state) => {
          // Remove existing entry for this track if present
          const filtered = state.recentlyPlayed.filter(
            (entry) => entry.track.id.value !== track.id.value
          );

          // Add new entry at the beginning
          const newEntry: HistoryEntry = {
            track,
            playedAt: Date.now(),
          };

          const updated = [newEntry, ...filtered];

          // Keep only the most recent MAX_HISTORY_SIZE entries
          return { recentlyPlayed: updated.slice(0, MAX_HISTORY_SIZE) };
        });
      },

      clearHistory: () => {
        set({ recentlyPlayed: [] });
      },

      removeFromHistory: (trackId: string) => {
        set((state) => ({
          recentlyPlayed: state.recentlyPlayed.filter(
            (entry) => entry.track.id.value !== trackId
          ),
        }));
      },

      // Queries
      getRecentTracks: (limit = 10) => {
        const state = get();
        return state.recentlyPlayed.slice(0, limit).map((entry) => entry.track);
      },
    }),
    {
      name: 'aria-history-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

/**
 * Selector hooks for common history queries
 */
export const useRecentlyPlayed = (limit = 10) =>
  useHistoryStore((state) => state.recentlyPlayed.slice(0, limit).map((e) => e.track));

export const useRecentlyPlayedEntries = (limit = 10) =>
  useHistoryStore((state) => state.recentlyPlayed.slice(0, limit));

export const useHasHistory = () =>
  useHistoryStore((state) => state.recentlyPlayed.length > 0);
