/**
 * useExploreFilter Hook
 *
 * Integration hook for explore screen filtering and sorting.
 * Returns filtered tracks, albums, and artists based on content type.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/src/application/state/search-store';
import { useFavorites } from '@/src/application/state/library-store';
import { useExploreFilterStore } from '@/src/application/state/explore-filter-store';
import {
	filterSearchResults,
	sortSearchResults,
	hasActiveSearchFilters,
	countActiveSearchFilters,
	extractSearchArtists,
	extractSearchAlbums,
	createRelevanceOrderMap,
} from '@/src/domain/utils/search-filtering';
import type { Track } from '@/src/domain/entities/track';
import type { Album } from '@/src/domain/entities/album';
import type { Artist } from '@/src/domain/entities/artist';

export function useExploreFilter() {
	const searchResults = useSearchStore((s) => s.results);
	const favorites = useFavorites();

	const relevanceOrderRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		relevanceOrderRef.current = createRelevanceOrderMap(searchResults.tracks);
	}, [searchResults.tracks]);

	const {
		sortField,
		sortDirection,
		activeFilters,
		isFilterSheetOpen,
		setSortField,
		setSortDirection,
		toggleSortDirection,
		setContentType,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		clearFilters,
		clearAll,
		setFilterSheetOpen,
	} = useExploreFilterStore(
		useShallow((s) => ({
			sortField: s.sortField,
			sortDirection: s.sortDirection,
			activeFilters: s.activeFilters,
			isFilterSheetOpen: s.isFilterSheetOpen,
			setSortField: s.setSortField,
			setSortDirection: s.setSortDirection,
			toggleSortDirection: s.toggleSortDirection,
			setContentType: s.setContentType,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			clearFilters: s.clearFilters,
			clearAll: s.clearAll,
			setFilterSheetOpen: s.setFilterSheetOpen,
		}))
	);

	const filteredTracks = useMemo(() => {
		return filterSearchResults(searchResults.tracks, activeFilters, favorites);
	}, [searchResults.tracks, activeFilters, favorites]);

	const tracks = useMemo((): Track[] => {
		const contentType = activeFilters.contentType;
		if (contentType === 'albums' || contentType === 'artists') {
			return [];
		}
		return sortSearchResults(
			filteredTracks,
			sortField,
			sortDirection,
			relevanceOrderRef.current
		);
	}, [filteredTracks, sortField, sortDirection, activeFilters.contentType]);

	const albums = useMemo((): Album[] => {
		const contentType = activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'artists') {
			return [];
		}
		return searchResults.albums;
	}, [searchResults.albums, activeFilters.contentType]);

	const artists = useMemo((): Artist[] => {
		const contentType = activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'albums') {
			return [];
		}
		return searchResults.artists;
	}, [searchResults.artists, activeFilters.contentType]);

	const hasFilters = useMemo(() => {
		return hasActiveSearchFilters(activeFilters);
	}, [activeFilters]);

	const filterCount = useMemo(() => {
		return countActiveSearchFilters(activeFilters);
	}, [activeFilters]);

	const filterArtists = useMemo(() => {
		return extractSearchArtists(searchResults.tracks);
	}, [searchResults.tracks]);

	const filterAlbums = useMemo(() => {
		return extractSearchAlbums(searchResults.tracks);
	}, [searchResults.tracks]);

	const hasResults = tracks.length > 0 || albums.length > 0 || artists.length > 0;

	const totalCount =
		searchResults.tracks.length + searchResults.albums.length + searchResults.artists.length;

	const filteredCount = tracks.length + albums.length + artists.length;

	return {
		tracks,
		albums,
		artists,
		hasResults,
		totalCount,
		filteredCount,

		sortField,
		sortDirection,
		setSortField,
		setSortDirection,
		toggleSortDirection,

		activeFilters,
		hasFilters,
		filterCount,
		setContentType,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		clearFilters,
		clearAll,

		filterArtists,
		filterAlbums,

		isFilterSheetOpen,
		openFilterSheet: () => setFilterSheetOpen(true),
		closeFilterSheet: () => setFilterSheetOpen(false),
	};
}
