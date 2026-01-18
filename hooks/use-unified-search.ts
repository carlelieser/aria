/**
 * useUnifiedSearch Hook
 *
 * Orchestration hook for unified search in the Search tab.
 * Combines library search and explore (external plugin) search,
 * returning both result sets simultaneously for unified display.
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/src/application/state/search-store';
import { searchService } from '@/src/application/services/search-service';
import { useFavorites, usePlaylists } from '@/src/application/state/library-store';
import { useDownloadedTracks } from '@/src/application/state/download-store';
import { useLibraryFilterStore } from '@/src/application/state/library-filter-store';
import { useExploreFilterStore } from '@/src/application/state/explore-filter-store';
import {
	useAggregatedTracks,
	useAggregatedArtists,
	useAggregatedAlbums,
} from './use-aggregated-library';
import {
	filterTracks,
	sortTracks,
	hasActiveFilters as hasLibraryActiveFilters,
	countActiveFilters as countLibraryActiveFilters,
} from '@/src/domain/utils/track-filtering';
import {
	filterSearchResults,
	sortSearchResults,
	hasActiveSearchFilters,
	countActiveSearchFilters,
	extractSearchArtists,
	extractSearchAlbums,
	createRelevanceOrderMap,
} from '@/src/domain/utils/search-filtering';
import { filterPlaylists, filterAlbums, filterArtists } from '@/src/domain/utils/library-filtering';
import { createTrackFromDownloadedMetadata } from '@/src/domain/utils/create-track-from-download';

const DEBOUNCE_MS = 300;

export function useUnifiedSearch() {
	const [localQuery, setLocalQuery] = useState('');
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const relevanceOrderRef = useRef<Map<string, number>>(new Map());

	// Library data sources
	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();
	const favorites = useFavorites();
	const downloadedTracksMap = useDownloadedTracks();

	// Explore data sources
	const searchResults = useSearchStore((s) => s.results);
	const isSearching = useSearchStore((s) => s.isSearching);
	const searchError = useSearchStore((s) => s.error);

	// Library filter store
	const libraryFilterState = useLibraryFilterStore(
		useShallow((s) => ({
			sortField: s.sortField,
			sortDirection: s.sortDirection,
			activeFilters: s.activeFilters,
			setSortField: s.setSortField,
			toggleSortDirection: s.toggleSortDirection,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			toggleDownloadedOnly: s.toggleDownloadedOnly,
			clearAll: s.clearAll,
		}))
	);

	// Explore filter store
	const exploreFilterState = useExploreFilterStore(
		useShallow((s) => ({
			sortField: s.sortField,
			sortDirection: s.sortDirection,
			activeFilters: s.activeFilters,
			setSortField: s.setSortField,
			toggleSortDirection: s.toggleSortDirection,
			setContentType: s.setContentType,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			clearAll: s.clearAll,
		}))
	);

	// Update relevance order when search results change
	useEffect(() => {
		relevanceOrderRef.current = createRelevanceOrderMap(searchResults.tracks);
	}, [searchResults.tracks]);

	// Cleanup on unmount
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

	// Library search logic
	const downloadedIds = useMemo(() => {
		return new Set(downloadedTracksMap.keys());
	}, [downloadedTracksMap]);

	const libraryBaseTracks = useMemo(() => {
		if (!libraryFilterState.activeFilters.downloadedOnly) {
			return allTracks;
		}

		const libraryTrackIds = new Set(allTracks.map((t) => t.id.value));
		const downloadedLibraryTracks = allTracks.filter((t) => downloadedIds.has(t.id.value));
		const nonLibraryDownloads: ReturnType<typeof createTrackFromDownloadedMetadata>[] = [];

		for (const [trackId, metadata] of downloadedTracksMap) {
			if (!libraryTrackIds.has(trackId)) {
				nonLibraryDownloads.push(createTrackFromDownloadedMetadata(metadata));
			}
		}

		return [...downloadedLibraryTracks, ...nonLibraryDownloads];
	}, [
		allTracks,
		libraryFilterState.activeFilters.downloadedOnly,
		downloadedIds,
		downloadedTracksMap,
	]);

	const filtersWithoutDownloaded = useMemo(
		() => ({ ...libraryFilterState.activeFilters, downloadedOnly: false }),
		[libraryFilterState.activeFilters]
	);

	// Library filtered results
	const libraryTracks = useMemo(() => {
		if (!hasQuery) return [];
		const filtered = filterTracks(
			libraryBaseTracks,
			query,
			filtersWithoutDownloaded,
			favorites
		);
		return sortTracks(filtered, libraryFilterState.sortField, libraryFilterState.sortDirection);
	}, [
		libraryBaseTracks,
		query,
		hasQuery,
		filtersWithoutDownloaded,
		favorites,
		libraryFilterState.sortField,
		libraryFilterState.sortDirection,
	]);

	const libraryPlaylists = useMemo(() => {
		if (!hasQuery) return [];
		return filterPlaylists(allPlaylists, query);
	}, [allPlaylists, query, hasQuery]);

	const libraryAlbumsFiltered = useMemo(() => {
		if (!hasQuery) return [];
		return filterAlbums(allAlbums, query);
	}, [allAlbums, query, hasQuery]);

	const libraryArtistsFiltered = useMemo(() => {
		if (!hasQuery) return [];
		return filterArtists(allArtists, query);
	}, [allArtists, query, hasQuery]);

	// Explore filtered results
	const exploreFilteredTracks = useMemo(() => {
		return filterSearchResults(
			searchResults.tracks,
			exploreFilterState.activeFilters,
			favorites
		);
	}, [searchResults.tracks, exploreFilterState.activeFilters, favorites]);

	const exploreTracks = useMemo(() => {
		const contentType = exploreFilterState.activeFilters.contentType;
		if (contentType === 'albums' || contentType === 'artists') {
			return [];
		}
		return sortSearchResults(
			exploreFilteredTracks,
			exploreFilterState.sortField,
			exploreFilterState.sortDirection,
			relevanceOrderRef.current
		);
	}, [
		exploreFilteredTracks,
		exploreFilterState.sortField,
		exploreFilterState.sortDirection,
		exploreFilterState.activeFilters.contentType,
	]);

	const exploreAlbums = useMemo(() => {
		const contentType = exploreFilterState.activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'artists') {
			return [];
		}
		return searchResults.albums;
	}, [searchResults.albums, exploreFilterState.activeFilters.contentType]);

	const exploreArtists = useMemo(() => {
		const contentType = exploreFilterState.activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'albums') {
			return [];
		}
		return searchResults.artists;
	}, [searchResults.artists, exploreFilterState.activeFilters.contentType]);

	// Filter options for sheets
	const libraryFilterArtists = useMemo(() => {
		const artistMap = new Map<string, { id: string; name: string }>();
		libraryBaseTracks.forEach((track) => {
			track.artists.forEach((artist) => {
				if (!artistMap.has(artist.id)) {
					artistMap.set(artist.id, { id: artist.id, name: artist.name });
				}
			});
		});
		return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	}, [libraryBaseTracks]);

	const libraryFilterAlbums = useMemo(() => {
		const albumMap = new Map<string, { id: string; name: string }>();
		libraryBaseTracks.forEach((track) => {
			if (track.album) {
				if (!albumMap.has(track.album.id)) {
					albumMap.set(track.album.id, { id: track.album.id, name: track.album.name });
				}
			}
		});
		return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	}, [libraryBaseTracks]);

	const exploreFilterArtists = useMemo(() => {
		return extractSearchArtists(searchResults.tracks);
	}, [searchResults.tracks]);

	const exploreFilterAlbums = useMemo(() => {
		return extractSearchAlbums(searchResults.tracks);
	}, [searchResults.tracks]);

	// Search action
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

		// Debounced external search for explore mode
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

	// Unified computed values (no mode gating)
	const hasLibraryResults =
		libraryTracks.length > 0 ||
		libraryPlaylists.length > 0 ||
		libraryAlbumsFiltered.length > 0 ||
		libraryArtistsFiltered.length > 0;

	const hasExploreResults =
		exploreTracks.length > 0 || exploreAlbums.length > 0 || exploreArtists.length > 0;

	const hasAnyResults = hasLibraryResults || hasExploreResults;

	const hasLibraryFilters = hasLibraryActiveFilters(libraryFilterState.activeFilters);
	const hasExploreFilters = hasActiveSearchFilters(exploreFilterState.activeFilters);
	const hasFilters = hasLibraryFilters || hasExploreFilters;

	const libraryFilterCount = countLibraryActiveFilters(libraryFilterState.activeFilters);
	const exploreFilterCount = countActiveSearchFilters(exploreFilterState.activeFilters);
	const filterCount = libraryFilterCount + exploreFilterCount;

	return {
		// Query
		query: localQuery,
		hasQuery,
		search,
		clearSearch,

		// Loading state
		isSearching,
		error: searchError,

		// Result flags
		hasLibraryResults,
		hasExploreResults,
		hasAnyResults,

		// Library results
		libraryTracks,
		libraryPlaylists,
		libraryAlbums: libraryAlbumsFiltered,
		libraryArtists: libraryArtistsFiltered,

		// Explore results
		exploreTracks,
		exploreAlbums,
		exploreArtists,

		// Filter state
		hasFilters,
		hasLibraryFilters,
		hasExploreFilters,
		filterCount,
		libraryFilterCount,
		exploreFilterCount,

		// Library filter controls
		libraryFilterState: {
			sortField: libraryFilterState.sortField,
			sortDirection: libraryFilterState.sortDirection,
			activeFilters: libraryFilterState.activeFilters,
			artists: libraryFilterArtists,
			albums: libraryFilterAlbums,
			setSortField: libraryFilterState.setSortField,
			toggleSortDirection: libraryFilterState.toggleSortDirection,
			toggleArtistFilter: libraryFilterState.toggleArtistFilter,
			toggleAlbumFilter: libraryFilterState.toggleAlbumFilter,
			toggleFavoritesOnly: libraryFilterState.toggleFavoritesOnly,
			toggleDownloadedOnly: libraryFilterState.toggleDownloadedOnly,
			clearAll: libraryFilterState.clearAll,
		},

		// Explore filter controls
		exploreFilterState: {
			sortField: exploreFilterState.sortField,
			sortDirection: exploreFilterState.sortDirection,
			activeFilters: exploreFilterState.activeFilters,
			artists: exploreFilterArtists,
			albums: exploreFilterAlbums,
			setSortField: exploreFilterState.setSortField,
			toggleSortDirection: exploreFilterState.toggleSortDirection,
			setContentType: exploreFilterState.setContentType,
			toggleArtistFilter: exploreFilterState.toggleArtistFilter,
			toggleAlbumFilter: exploreFilterState.toggleAlbumFilter,
			toggleFavoritesOnly: exploreFilterState.toggleFavoritesOnly,
			clearAll: exploreFilterState.clearAll,
		},
	};
}
