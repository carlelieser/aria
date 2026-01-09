import { create } from 'zustand';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';

export interface SearchResults {
	tracks: Track[];
	albums: Album[];
	artists: Artist[];
}

export interface SearchSuggestion {
	query: string;
	type: 'recent' | 'suggested';
}

interface SearchState {
	query: string;
	results: SearchResults;
	suggestions: SearchSuggestion[];
	recentSearches: string[];
	isSearching: boolean;
	error: string | null;

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

const MAX_RECENT_SEARCHES = 10;

const emptyResults: SearchResults = {
	tracks: [],
	albums: [],
	artists: [],
};

export const useSearchStore = create<SearchState>((set, get) => ({
	query: '',
	results: emptyResults,
	suggestions: [],
	recentSearches: [],
	isSearching: false,
	error: null,

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
			const filtered = state.recentSearches.filter((q) => q !== trimmedQuery);

			const updated = [trimmedQuery, ...filtered];

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

export const useSearchQuery = () => useSearchStore((state) => state.query);
export const useSearchResults = () => useSearchStore((state) => state.results);
export const useSearchTracks = () => useSearchStore((state) => state.results.tracks);
export const useSearchAlbums = () => useSearchStore((state) => state.results.albums);
export const useSearchArtists = () => useSearchStore((state) => state.results.artists);
export const useSearchSuggestions = () => useSearchStore((state) => state.suggestions);
export const useRecentSearches = () => useSearchStore((state) => state.recentSearches);
export const useIsSearching = () => useSearchStore((state) => state.isSearching);
export const useSearchError = () => useSearchStore((state) => state.error);

export const useHasSearchResults = () =>
	useSearchStore(
		(state) =>
			state.results.tracks.length > 0 ||
			state.results.albums.length > 0 ||
			state.results.artists.length > 0
	);

export const useSearchResultCount = () =>
	useSearchStore(
		(state) =>
			state.results.tracks.length + state.results.albums.length + state.results.artists.length
	);
