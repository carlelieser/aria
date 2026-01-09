import { useCallback, useEffect, useRef } from 'react';
import { useSearchStore } from '@/src/application/state/search-store';
import { searchService } from '@/src/application/services/search-service';

export function useSearch(debounceMs: number = 500) {
	const store = useSearchStore();
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const search = useCallback(
		(query: string) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			store.setQuery(query);

			debounceTimerRef.current = setTimeout(async () => {
				if (query.trim()) {
					await searchService.search(query);
				} else {
					store.clearResults();
				}
			}, debounceMs);
		},
		[store, debounceMs]
	);

	const searchImmediate = useCallback(
		async (query: string) => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			store.setQuery(query);

			if (query.trim()) {
				await searchService.search(query);
			} else {
				store.clearResults();
			}
		},
		[store]
	);

	const getSuggestions = useCallback(async (query: string) => {
		await searchService.getSuggestions(query);
	}, []);

	const clearResults = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		store.clearResults();
	}, [store]);

	const addRecentSearch = useCallback(
		(query: string) => {
			store.addRecentSearch(query);
		},
		[store]
	);

	const removeRecentSearch = useCallback(
		(query: string) => {
			store.removeRecentSearch(query);
		},
		[store]
	);

	const clearRecentSearches = useCallback(() => {
		store.clearRecentSearches();
	}, [store]);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	return {
		query: store.query,
		results: store.results,
		tracks: store.results.tracks,
		albums: store.results.albums,
		artists: store.results.artists,
		suggestions: store.suggestions,
		recentSearches: store.recentSearches,
		isSearching: store.isSearching,
		error: store.error,

		hasResults:
			store.results.tracks.length > 0 ||
			store.results.albums.length > 0 ||
			store.results.artists.length > 0,

		search,
		searchImmediate,
		getSuggestions,
		clearResults,
		addRecentSearch,
		removeRecentSearch,
		clearRecentSearches,
	};
}
