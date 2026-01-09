import { create } from 'zustand';
import {
	type SortField,
	type SortDirection,
	type LibraryFilters,
	DEFAULT_FILTERS,
} from '../../domain/utils/track-filtering';

interface LibraryFilterState {
	searchQuery: string;
	sortField: SortField;
	sortDirection: SortDirection;
	activeFilters: LibraryFilters;
	isFilterSheetOpen: boolean;

	setSearchQuery: (query: string) => void;
	setSortField: (field: SortField) => void;
	setSortDirection: (direction: SortDirection) => void;
	toggleSortDirection: () => void;
	setArtistFilter: (artistIds: string[]) => void;
	toggleArtistFilter: (artistId: string) => void;
	setAlbumFilter: (albumIds: string[]) => void;
	toggleAlbumFilter: (albumId: string) => void;
	setFavoritesOnly: (enabled: boolean) => void;
	toggleFavoritesOnly: () => void;
	clearFilters: () => void;
	clearAll: () => void;
	setFilterSheetOpen: (isOpen: boolean) => void;
}

export const useLibraryFilterStore = create<LibraryFilterState>()((set) => ({
	searchQuery: '',
	sortField: 'dateAdded',
	sortDirection: 'desc',
	activeFilters: DEFAULT_FILTERS,
	isFilterSheetOpen: false,

	setSearchQuery: (query) => set({ searchQuery: query }),

	setSortField: (field) => set({ sortField: field }),
	setSortDirection: (direction) => set({ sortDirection: direction }),
	toggleSortDirection: () =>
		set((state) => ({
			sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
		})),

	setArtistFilter: (artistIds) =>
		set((state) => ({
			activeFilters: { ...state.activeFilters, artistIds },
		})),

	toggleArtistFilter: (artistId) =>
		set((state) => {
			const current = state.activeFilters.artistIds;
			const artistIds = current.includes(artistId)
				? current.filter((id) => id !== artistId)
				: [...current, artistId];
			return { activeFilters: { ...state.activeFilters, artistIds } };
		}),

	setAlbumFilter: (albumIds) =>
		set((state) => ({
			activeFilters: { ...state.activeFilters, albumIds },
		})),

	toggleAlbumFilter: (albumId) =>
		set((state) => {
			const current = state.activeFilters.albumIds;
			const albumIds = current.includes(albumId)
				? current.filter((id) => id !== albumId)
				: [...current, albumId];
			return { activeFilters: { ...state.activeFilters, albumIds } };
		}),

	setFavoritesOnly: (enabled) =>
		set((state) => ({
			activeFilters: { ...state.activeFilters, favoritesOnly: enabled },
		})),

	toggleFavoritesOnly: () =>
		set((state) => ({
			activeFilters: {
				...state.activeFilters,
				favoritesOnly: !state.activeFilters.favoritesOnly,
			},
		})),

	clearFilters: () => set({ activeFilters: DEFAULT_FILTERS }),
	clearAll: () =>
		set({
			searchQuery: '',
			sortField: 'dateAdded',
			sortDirection: 'desc',
			activeFilters: DEFAULT_FILTERS,
		}),

	setFilterSheetOpen: (isOpen) => set({ isFilterSheetOpen: isOpen }),
}));

export const useSearchQuery = () => useLibraryFilterStore((state) => state.searchQuery);

export const useSortField = () => useLibraryFilterStore((state) => state.sortField);

export const useSortDirection = () => useLibraryFilterStore((state) => state.sortDirection);

export const useActiveFilters = () => useLibraryFilterStore((state) => state.activeFilters);

export const useIsFilterSheetOpen = () => useLibraryFilterStore((state) => state.isFilterSheetOpen);
