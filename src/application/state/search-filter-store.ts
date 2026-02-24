/**
 * Search Filter Store
 *
 * Unified Zustand store for managing search screen filter and sort state.
 * Replaces the separate library/explore filter stores for the search context.
 */

import { create } from 'zustand';
import {
	type UnifiedSortField,
	type SearchSortDirection,
	type UnifiedSearchFilters,
	type SearchContentType,
	DEFAULT_UNIFIED_FILTERS,
} from '../../domain/utils/search-filtering';
import { toggleIdInArray } from './create-filter-store';

interface SearchFilterState {
	sortField: UnifiedSortField;
	sortDirection: SearchSortDirection;
	activeFilters: UnifiedSearchFilters;

	setSortField: (field: UnifiedSortField) => void;
	toggleSortDirection: () => void;
	setContentType: (type: SearchContentType) => void;
	toggleArtistFilter: (artistId: string) => void;
	toggleAlbumFilter: (albumId: string) => void;
	toggleProviderFilter: (providerId: string) => void;
	toggleFavoritesOnly: () => void;
	toggleDownloadedOnly: () => void;
	clearAll: () => void;
}

export const useSearchFilterStore = create<SearchFilterState>()((set) => ({
	sortField: 'relevance',
	sortDirection: 'desc',
	activeFilters: DEFAULT_UNIFIED_FILTERS,

	setSortField: (field) => set({ sortField: field }),

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

	toggleProviderFilter: (providerId) =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				providerIds: toggleIdInArray(state.activeFilters.providerIds, providerId),
			},
		})),

	toggleFavoritesOnly: () =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				favoritesOnly: !state.activeFilters.favoritesOnly,
			},
		})),

	toggleDownloadedOnly: () =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				downloadedOnly: !state.activeFilters.downloadedOnly,
			},
		})),

	clearAll: () =>
		set({
			sortField: 'relevance',
			sortDirection: 'desc',
			activeFilters: DEFAULT_UNIFIED_FILTERS,
		}),
}));
