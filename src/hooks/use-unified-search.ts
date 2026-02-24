/**
 * useUnifiedSearch Hook
 *
 * Orchestrator that composes library search, explore search, and filter state
 * into a single unified search interface.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/src/application/state/search-store';
import { searchService } from '@/src/application/services/search-service';
import { useSearchFilterStore } from '@/src/application/state/search-filter-store';
import {
	hasActiveUnifiedFilters,
	countActiveUnifiedFilters,
} from '@/src/domain/utils/search-filtering';
import { toLibrarySortField, toExploreSortField } from './utils/unified-search-utils';
import { useSearchLibraryResults } from './use-search-library-results';
import { useSearchExploreResults } from './use-search-explore-results';

const DEBOUNCE_MS = 300;

export function useUnifiedSearch() {
	const [localQuery, setLocalQuery] = useState('');
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const filterState = useSearchFilterStore(
		useShallow((s) => ({
			sortField: s.sortField,
			sortDirection: s.sortDirection,
			activeFilters: s.activeFilters,
			setSortField: s.setSortField,
			toggleSortDirection: s.toggleSortDirection,
			setContentType: s.setContentType,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleProviderFilter: s.toggleProviderFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			toggleDownloadedOnly: s.toggleDownloadedOnly,
			clearAll: s.clearAll,
		}))
	);

	const librarySortField = toLibrarySortField(filterState.sortField);
	const exploreSortField = toExploreSortField(filterState.sortField);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
			searchService.cancelSearch();
		};
	}, []);

	const query = localQuery.trim();
	const hasQuery = query.length > 0;

	const {
		libraryBaseTracks,
		libraryTracks,
		libraryPlaylists,
		libraryAlbumsFiltered,
		libraryArtistsFiltered,
		downloadsTracks,
	} = useSearchLibraryResults(
		query,
		hasQuery,
		librarySortField,
		filterState.sortDirection,
		filterState.activeFilters
	);

	const {
		isSearching,
		searchError,
		exploreTracks,
		exploreAlbums,
		exploreArtists,
		mergedFilterArtists,
		mergedFilterAlbums,
		mergedFilterProviders,
	} = useSearchExploreResults(
		exploreSortField,
		filterState.sortDirection,
		filterState.activeFilters,
		libraryBaseTracks
	);

	const search = useCallback((newQuery: string) => {
		setLocalQuery(newQuery);

		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}

		const trimmed = newQuery.trim();
		if (!trimmed) {
			searchService.cancelSearch();
			useSearchStore.getState().clearResults();
			return;
		}

		useSearchStore.getState().setSearching(true);

		debounceTimerRef.current = setTimeout(async () => {
			await searchService.search(trimmed);
		}, DEBOUNCE_MS);
	}, []);

	const clearSearch = useCallback(() => {
		setLocalQuery('');
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		searchService.cancelSearch();
		useSearchStore.getState().clearResults();
	}, []);

	const hasLibraryResults =
		libraryTracks.length > 0 ||
		libraryPlaylists.length > 0 ||
		libraryAlbumsFiltered.length > 0 ||
		libraryArtistsFiltered.length > 0;

	const hasExploreResults =
		exploreTracks.length > 0 || exploreAlbums.length > 0 || exploreArtists.length > 0;

	const hasDownloadsResults = downloadsTracks.length > 0;
	const hasAnyResults = hasLibraryResults || hasExploreResults || hasDownloadsResults;

	const hasFilters = hasActiveUnifiedFilters(filterState.activeFilters);
	const filterCount = countActiveUnifiedFilters(filterState.activeFilters);

	return {
		query: localQuery,
		hasQuery,
		search,
		clearSearch,

		isSearching,
		error: searchError,

		hasLibraryResults,
		hasExploreResults,
		hasDownloadsResults,
		hasAnyResults,

		libraryTracks,
		libraryPlaylists,
		libraryAlbums: libraryAlbumsFiltered,
		libraryArtists: libraryArtistsFiltered,

		downloadsTracks,

		exploreTracks,
		exploreAlbums,
		exploreArtists,

		hasFilters,
		filterCount,

		filterState: {
			sortField: filterState.sortField,
			sortDirection: filterState.sortDirection,
			activeFilters: filterState.activeFilters,
			artists: mergedFilterArtists,
			albums: mergedFilterAlbums,
			providers: mergedFilterProviders,
			setSortField: filterState.setSortField,
			toggleSortDirection: filterState.toggleSortDirection,
			setContentType: filterState.setContentType,
			toggleArtistFilter: filterState.toggleArtistFilter,
			toggleAlbumFilter: filterState.toggleAlbumFilter,
			toggleProviderFilter: filterState.toggleProviderFilter,
			toggleFavoritesOnly: filterState.toggleFavoritesOnly,
			toggleDownloadedOnly: filterState.toggleDownloadedOnly,
			clearAll: filterState.clearAll,
		},
	};
}
