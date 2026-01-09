import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useTracks, useFavorites } from '@/src/application/state/library-store';
import { useLibraryFilterStore } from '@/src/application/state/library-filter-store';
import {
	filterTracks,
	sortTracks,
	hasActiveFilters,
	countActiveFilters,
} from '@/src/domain/utils/track-filtering';

export function useLibraryFilter() {
	const allTracks = useTracks();
	const favorites = useFavorites();

	const { searchQuery, sortField, sortDirection, activeFilters, isFilterSheetOpen } =
		useLibraryFilterStore(
			useShallow((s) => ({
				searchQuery: s.searchQuery,
				sortField: s.sortField,
				sortDirection: s.sortDirection,
				activeFilters: s.activeFilters,
				isFilterSheetOpen: s.isFilterSheetOpen,
			}))
		);

	const {
		setSearchQuery,
		setSortField,
		setSortDirection,
		toggleSortDirection,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		clearFilters,
		clearAll,
		setFilterSheetOpen,
	} = useLibraryFilterStore(
		useShallow((s) => ({
			setSearchQuery: s.setSearchQuery,
			setSortField: s.setSortField,
			setSortDirection: s.setSortDirection,
			toggleSortDirection: s.toggleSortDirection,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			clearFilters: s.clearFilters,
			clearAll: s.clearAll,
			setFilterSheetOpen: s.setFilterSheetOpen,
		}))
	);

	const filteredTracks = useMemo(() => {
		return filterTracks(allTracks, searchQuery, activeFilters, favorites);
	}, [allTracks, searchQuery, activeFilters, favorites]);

	const tracks = useMemo(() => {
		return sortTracks(filteredTracks, sortField, sortDirection);
	}, [filteredTracks, sortField, sortDirection]);

	const hasFilters = useMemo(() => {
		return hasActiveFilters(activeFilters);
	}, [activeFilters]);

	const filterCount = useMemo(() => {
		return countActiveFilters(activeFilters);
	}, [activeFilters]);

	const hasSearchQuery = searchQuery.trim().length > 0;

	return {
		tracks,
		totalCount: allTracks.length,
		filteredCount: tracks.length,

		searchQuery,
		hasSearchQuery,
		setSearchQuery,

		sortField,
		sortDirection,
		setSortField,
		setSortDirection,
		toggleSortDirection,

		activeFilters,
		hasFilters,
		filterCount,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		clearFilters,

		clearAll,

		isFilterSheetOpen,
		openFilterSheet: () => setFilterSheetOpen(true),
		closeFilterSheet: () => setFilterSheetOpen(false),
	};
}
