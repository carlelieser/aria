import { useMemo } from 'react';
import { useTracks, useFavorites } from '@/src/application/state/library-store';
import { useLibraryFilterStore } from '@/src/application/state/library-filter-store';
import {
  filterTracks,
  sortTracks,
  hasActiveFilters,
  countActiveFilters,
} from '@/src/domain/utils/track-filtering';

/**
 * Hook that provides filtered and sorted library tracks
 * along with all filter/sort state and actions
 */
export function useLibraryFilter() {
  const allTracks = useTracks();
  const favorites = useFavorites();

  const searchQuery = useLibraryFilterStore((s) => s.searchQuery);
  const sortField = useLibraryFilterStore((s) => s.sortField);
  const sortDirection = useLibraryFilterStore((s) => s.sortDirection);
  const activeFilters = useLibraryFilterStore((s) => s.activeFilters);
  const isFilterSheetOpen = useLibraryFilterStore((s) => s.isFilterSheetOpen);

  // Actions
  const setSearchQuery = useLibraryFilterStore((s) => s.setSearchQuery);
  const setSortField = useLibraryFilterStore((s) => s.setSortField);
  const setSortDirection = useLibraryFilterStore((s) => s.setSortDirection);
  const toggleSortDirection = useLibraryFilterStore((s) => s.toggleSortDirection);
  const toggleArtistFilter = useLibraryFilterStore((s) => s.toggleArtistFilter);
  const toggleAlbumFilter = useLibraryFilterStore((s) => s.toggleAlbumFilter);
  const toggleFavoritesOnly = useLibraryFilterStore((s) => s.toggleFavoritesOnly);
  const clearFilters = useLibraryFilterStore((s) => s.clearFilters);
  const clearAll = useLibraryFilterStore((s) => s.clearAll);
  const setFilterSheetOpen = useLibraryFilterStore((s) => s.setFilterSheetOpen);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    return filterTracks(allTracks, searchQuery, activeFilters, favorites);
  }, [allTracks, searchQuery, activeFilters, favorites]);

  // Sorted tracks
  const tracks = useMemo(() => {
    return sortTracks(filteredTracks, sortField, sortDirection);
  }, [filteredTracks, sortField, sortDirection]);

  // Computed values
  const hasFilters = useMemo(() => {
    return hasActiveFilters(activeFilters);
  }, [activeFilters]);

  const filterCount = useMemo(() => {
    return countActiveFilters(activeFilters);
  }, [activeFilters]);

  const hasSearchQuery = searchQuery.trim().length > 0;

  return {
    // Filtered & sorted tracks
    tracks,
    totalCount: allTracks.length,
    filteredCount: tracks.length,

    // Search
    searchQuery,
    hasSearchQuery,
    setSearchQuery,

    // Sort
    sortField,
    sortDirection,
    setSortField,
    setSortDirection,
    toggleSortDirection,

    // Filters
    activeFilters,
    hasFilters,
    filterCount,
    toggleArtistFilter,
    toggleAlbumFilter,
    toggleFavoritesOnly,
    clearFilters,

    // Clear all
    clearAll,

    // Sheet
    isFilterSheetOpen,
    openFilterSheet: () => setFilterSheetOpen(true),
    closeFilterSheet: () => setFilterSheetOpen(false),
  };
}
