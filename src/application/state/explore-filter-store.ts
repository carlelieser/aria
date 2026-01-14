/**
 * Explore Filter Store
 *
 * Zustand store for managing explore screen filter and sort state.
 */

import { create } from 'zustand';
import {
	type SearchSortField,
	type SearchSortDirection,
	type SearchFilters,
	type SearchContentType,
	DEFAULT_SEARCH_FILTERS,
} from '../../domain/utils/search-filtering';
import { toggleIdInArray } from './create-filter-store';

interface ExploreFilterState {
	sortField: SearchSortField;
	sortDirection: SearchSortDirection;
	activeFilters: SearchFilters;
	isFilterSheetOpen: boolean;

	setSortField: (field: SearchSortField) => void;
	setSortDirection: (direction: SearchSortDirection) => void;
	toggleSortDirection: () => void;
	setContentType: (type: SearchContentType) => void;
	toggleArtistFilter: (artistId: string) => void;
	toggleAlbumFilter: (albumId: string) => void;
	toggleFavoritesOnly: () => void;
	clearFilters: () => void;
	clearAll: () => void;
	setFilterSheetOpen: (isOpen: boolean) => void;
}

export const useExploreFilterStore = create<ExploreFilterState>()((set) => ({
	sortField: 'relevance',
	sortDirection: 'desc',
	activeFilters: DEFAULT_SEARCH_FILTERS,
	isFilterSheetOpen: false,

	setSortField: (field) => set({ sortField: field }),
	setSortDirection: (direction) => set({ sortDirection: direction }),
	toggleSortDirection: () =>
		set((state) => ({ sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc' })),

	setContentType: (type) =>
		set((state) => ({ activeFilters: { ...state.activeFilters, contentType: type } })),

	toggleArtistFilter: (artistId) =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				artistIds: toggleIdInArray(state.activeFilters.artistIds, artistId),
			},
		})),

	toggleAlbumFilter: (albumId) =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				albumIds: toggleIdInArray(state.activeFilters.albumIds, albumId),
			},
		})),

	toggleFavoritesOnly: () =>
		set((state) => ({
			activeFilters: { ...state.activeFilters, favoritesOnly: !state.activeFilters.favoritesOnly },
		})),

	clearFilters: () => set({ activeFilters: DEFAULT_SEARCH_FILTERS }),
	clearAll: () =>
		set({
			sortField: 'relevance',
			sortDirection: 'desc',
			activeFilters: DEFAULT_SEARCH_FILTERS,
		}),

	setFilterSheetOpen: (isOpen) => set({ isFilterSheetOpen: isOpen }),
}));

export const useExploreSortField = () => useExploreFilterStore((state) => state.sortField);

export const useExploreSortDirection = () => useExploreFilterStore((state) => state.sortDirection);

export const useExploreActiveFilters = () => useExploreFilterStore((state) => state.activeFilters);

export const useExploreFilterSheetOpen = () =>
	useExploreFilterStore((state) => state.isFilterSheetOpen);
