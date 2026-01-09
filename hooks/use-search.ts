import { useCallback, useEffect, useRef } from 'react';
import { useSearchStore } from '@/src/application/state/search-store';
import { searchService } from '@/src/application/services/search-service';

/**
 * Hook that combines search store with search service
 * Provides debounced search functionality for the UI
 */
export function useSearch(debounceMs: number = 500) {
  const store = useSearchStore();
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Update query immediately in store
    store.setQuery(query);

    // Debounce the actual search
    debounceTimerRef.current = setTimeout(async () => {
      if (query.trim()) {
        await searchService.search(query);
      } else {
        store.clearResults();
      }
    }, debounceMs);
  }, [store, debounceMs]);

  const searchImmediate = useCallback(async (query: string) => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    store.setQuery(query);

    if (query.trim()) {
      await searchService.search(query);
    } else {
      store.clearResults();
    }
  }, [store]);

  const getSuggestions = useCallback(async (query: string) => {
    await searchService.getSuggestions(query);
  }, []);

  const clearResults = useCallback(() => {
    // Clear any pending debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    store.clearResults();
  }, [store]);

  const addRecentSearch = useCallback((query: string) => {
    store.addRecentSearch(query);
  }, [store]);

  const removeRecentSearch = useCallback((query: string) => {
    store.removeRecentSearch(query);
  }, [store]);

  const clearRecentSearches = useCallback(() => {
    store.clearRecentSearches();
  }, [store]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    // State
    query: store.query,
    results: store.results,
    tracks: store.results.tracks,
    albums: store.results.albums,
    artists: store.results.artists,
    suggestions: store.suggestions,
    recentSearches: store.recentSearches,
    isSearching: store.isSearching,
    error: store.error,

    // Computed state
    hasResults:
      store.results.tracks.length > 0 ||
      store.results.albums.length > 0 ||
      store.results.artists.length > 0,

    // Actions
    search,
    searchImmediate,
    getSuggestions,
    clearResults,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
  };
}
