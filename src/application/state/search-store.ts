import { create } from 'zustand';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';

/**
 * Search results categorized by type
 */
export interface SearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}

/**
 * Search suggestion
 */
export interface SearchSuggestion {
  query: string;
  type: 'recent' | 'suggested';
}

/**
 * Search store state shape
 */
interface SearchState {
  // State
  query: string;
  results: SearchResults;
  suggestions: SearchSuggestion[];
  recentSearches: string[];
  isSearching: boolean;
  error: string | null;

  // Actions
  setQuery: (query: string) => void;
  search: (query: string) => Promise<void>;
  setResults: (results: SearchResults) => void;
  getSuggestions: (query: string) => Promise<void>;
  setSuggestions: (suggestions: SearchSuggestion[]) => void;
  clearResults: () => void;
  addRecentSearch: (query: string) => void;
  clearRecentSearches: () => void;
  removeRecentSearch: (query: string) => void;
  setSearching: (isSearching: boolean) => void;
  setError: (error: string | null) => void;
}

/**
 * Maximum number of recent searches to keep
 */
const MAX_RECENT_SEARCHES = 10;

/**
 * Empty search results
 */
const emptyResults: SearchResults = {
  tracks: [],
  albums: [],
  artists: [],
};

/**
 * Search store for managing search state and results
 */
export const useSearchStore = create<SearchState>((set, get) => ({
  // Initial state
  query: '',
  results: emptyResults,
  suggestions: [],
  recentSearches: [],
  isSearching: false,
  error: null,

  // Actions
  setQuery: (query: string) => {
    set({ query });
  },

  search: async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      set({
        query: '',
        results: emptyResults,
        error: null,
      });
      return;
    }

    set({
      query: trimmedQuery,
      isSearching: true,
      error: null,
    });

    // The actual search will be performed by the search service
    // This is just a state management method
    // The service will call setResults when done
  },

  setResults: (results: SearchResults) => {
    set({
      results,
      isSearching: false,
      error: null,
    });
  },

  getSuggestions: async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      set({ suggestions: [] });
      return;
    }

    // The actual suggestions will be fetched by the search service
    // This is just a state management method
  },

  setSuggestions: (suggestions: SearchSuggestion[]) => {
    set({ suggestions });
  },

  clearResults: () => {
    set({
      query: '',
      results: emptyResults,
      suggestions: [],
      error: null,
    });
  },

  addRecentSearch: (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return;
    }

    set((state) => {
      // Remove the query if it already exists
      const filtered = state.recentSearches.filter((q) => q !== trimmedQuery);

      // Add to the beginning
      const updated = [trimmedQuery, ...filtered];

      // Keep only the most recent MAX_RECENT_SEARCHES
      const trimmed = updated.slice(0, MAX_RECENT_SEARCHES);

      return { recentSearches: trimmed };
    });
  },

  clearRecentSearches: () => {
    set({ recentSearches: [] });
  },

  removeRecentSearch: (query: string) => {
    set((state) => ({
      recentSearches: state.recentSearches.filter((q) => q !== query),
    }));
  },

  setSearching: (isSearching: boolean) => {
    set({ isSearching });
  },

  setError: (error: string | null) => {
    set({ error, isSearching: false });
  },
}));

/**
 * Selector hooks for common search queries
 */
export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useSearchTracks = () => useSearchStore((state) => state.results.tracks);
export const useSearchAlbums = () => useSearchStore((state) => state.results.albums);
export const useSearchArtists = () => useSearchStore((state) => state.results.artists);
export const useSearchSuggestions = () => useSearchStore((state) => state.suggestions);
export const useRecentSearches = () => useSearchStore((state) => state.recentSearches);
export const useIsSearching = () => useSearchStore((state) => state.isSearching);
export const useSearchError = () => useSearchStore((state) => state.error);

/**
 * Check if there are any search results
 */
export const useHasSearchResults = () =>
  useSearchStore(
    (state) =>
      state.results.tracks.length > 0 ||
      state.results.albums.length > 0 ||
      state.results.artists.length > 0
  );

/**
 * Get total number of search results
 */
export const useSearchResultCount = () =>
  useSearchStore(
    (state) =>
      state.results.tracks.length +
      state.results.albums.length +
      state.results.artists.length
  );
