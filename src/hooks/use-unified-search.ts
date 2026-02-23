import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSearchStore } from '@/src/application/state/search-store';
import { searchService } from '@/src/application/services/search-service';
import { useFavorites, usePlaylists } from '@/src/application/state/library-store';
import { useDownloadedTracks } from '@/src/application/state/download-store';
import { useSearchFilterStore } from '@/src/application/state/search-filter-store';
import {
	useAggregatedTracks,
	useAggregatedArtists,
	useAggregatedAlbums,
} from './use-aggregated-library';
import { useResolvedTracks } from './use-resolved-track';
import { filterTracks, sortTracks } from '@/src/domain/utils/track-filtering';
import {
	filterSearchResults,
	sortSearchResults,
	hasActiveUnifiedFilters,
	countActiveUnifiedFilters,
	createRelevanceOrderMap,
} from '@/src/domain/utils/search-filtering';
import {
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
} from '@/src/domain/utils/core-filtering';
import { filterPlaylists, filterAlbums, filterArtists } from '@/src/domain/utils/library-filtering';
import { createTrackFromDownloadedMetadata } from '@/src/domain/utils/create-track-from-download';
import type { SortField } from '@/src/domain/utils/track-filtering';
import type { SearchSortField } from '@/src/domain/utils/search-filtering';

const DEBOUNCE_MS = 300;

/**
 * Maps a UnifiedSortField to a library SortField.
 * 'relevance' has no local signal, so it falls back to 'dateAdded'.
 */
function toLibrarySortField(field: string): SortField {
	switch (field) {
		case 'title':
		case 'artist':
		case 'dateAdded':
		case 'duration':
			return field;
		default:
			return 'dateAdded';
	}
}

/**
 * Maps a UnifiedSortField to an explore SearchSortField.
 * 'dateAdded' has no remote signal, so it falls back to 'relevance'.
 */
function toExploreSortField(field: string): SearchSortField {
	switch (field) {
		case 'relevance':
		case 'title':
		case 'artist':
		case 'duration':
			return field;
		default:
			return 'relevance';
	}
}

export function useUnifiedSearch() {
	const [localQuery, setLocalQuery] = useState('');
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const relevanceOrderRef = useRef<Map<string, number>>(new Map());

	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();
	const favorites = useFavorites();
	const downloadedTracksMap = useDownloadedTracks();

	const searchResults = useSearchStore((s) => s.results);
	const isSearching = useSearchStore((s) => s.isSearching);
	const searchError = useSearchStore((s) => s.error);

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
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			toggleDownloadedOnly: s.toggleDownloadedOnly,
			clearAll: s.clearAll,
		}))
	);

	const librarySortField = toLibrarySortField(filterState.sortField);
	const exploreSortField = toExploreSortField(filterState.sortField);

	useEffect(() => {
		relevanceOrderRef.current = createRelevanceOrderMap(searchResults.tracks);
	}, [searchResults.tracks]);

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

	const downloadedIds = useMemo(() => {
		return new Set(downloadedTracksMap.keys());
	}, [downloadedTracksMap]);

	const libraryBaseTracks = useMemo(() => {
		if (!filterState.activeFilters.downloadedOnly) {
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
	}, [allTracks, filterState.activeFilters.downloadedOnly, downloadedIds, downloadedTracksMap]);

	const libraryFiltersForSearch = useMemo(
		() => ({
			favoritesOnly: filterState.activeFilters.favoritesOnly,
			artistIds: filterState.activeFilters.artistIds,
			albumIds: filterState.activeFilters.albumIds,
			downloadedOnly: false,
		}),
		[filterState.activeFilters]
	);

	const matchingDownloadIds = useMemo(() => {
		if (!hasQuery) return [];

		const queryLower = query.toLowerCase();
		const matchedIds: string[] = [];

		for (const [trackId, metadata] of downloadedTracksMap) {
			const titleMatch = metadata.title.toLowerCase().includes(queryLower);
			const artistMatch = metadata.artistName.toLowerCase().includes(queryLower);
			const albumMatch = metadata.albumName?.toLowerCase().includes(queryLower) ?? false;

			if (titleMatch || artistMatch || albumMatch) {
				matchedIds.push(trackId);
			}
		}

		return matchedIds;
	}, [downloadedTracksMap, query, hasQuery]);

	const resolvedDownloadTracks = useResolvedTracks(matchingDownloadIds);

	const downloadsTracks = useMemo(() => {
		return matchingDownloadIds.map((trackId) => {
			const resolved = resolvedDownloadTracks.get(trackId);
			if (resolved) return resolved;

			const metadata = downloadedTracksMap.get(trackId);
			if (metadata) return createTrackFromDownloadedMetadata(metadata);

			return createTrackFromDownloadedMetadata({
				trackId,
				filePath: '',
				fileSize: 0,
				downloadedAt: 0,
				sourcePlugin: 'unknown',
				format: 'unknown',
				title: 'Unknown',
				artistName: 'Unknown',
			});
		});
	}, [matchingDownloadIds, resolvedDownloadTracks, downloadedTracksMap]);

	const libraryTracks = useMemo(() => {
		if (!hasQuery) return [];
		const filtered = filterTracks(libraryBaseTracks, query, libraryFiltersForSearch, favorites);
		return sortTracks(filtered, librarySortField, filterState.sortDirection);
	}, [
		libraryBaseTracks,
		query,
		hasQuery,
		libraryFiltersForSearch,
		favorites,
		librarySortField,
		filterState.sortDirection,
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

	const exploreSearchFilters = useMemo(
		() => ({
			contentType: filterState.activeFilters.contentType,
			favoritesOnly: filterState.activeFilters.favoritesOnly,
			artistIds: filterState.activeFilters.artistIds,
			albumIds: filterState.activeFilters.albumIds,
		}),
		[filterState.activeFilters]
	);

	const exploreFilteredTracks = useMemo(() => {
		return filterSearchResults(searchResults.tracks, exploreSearchFilters, favorites);
	}, [searchResults.tracks, exploreSearchFilters, favorites]);

	const exploreTracks = useMemo(() => {
		const contentType = filterState.activeFilters.contentType;
		if (contentType === 'albums' || contentType === 'artists') {
			return [];
		}
		return sortSearchResults(
			exploreFilteredTracks,
			exploreSortField,
			filterState.sortDirection,
			relevanceOrderRef.current
		);
	}, [
		exploreFilteredTracks,
		exploreSortField,
		filterState.sortDirection,
		filterState.activeFilters.contentType,
	]);

	const exploreAlbums = useMemo(() => {
		const contentType = filterState.activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'artists') {
			return [];
		}
		return searchResults.albums;
	}, [searchResults.albums, filterState.activeFilters.contentType]);

	const exploreArtists = useMemo(() => {
		const contentType = filterState.activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'albums') {
			return [];
		}
		return searchResults.artists;
	}, [searchResults.artists, filterState.activeFilters.contentType]);

	const mergedFilterArtists = useMemo(() => {
		const artistMap = new Map<string, { id: string; name: string }>();

		for (const track of libraryBaseTracks) {
			for (const artist of track.artists) {
				if (!artistMap.has(artist.id)) {
					artistMap.set(artist.id, { id: artist.id, name: artist.name });
				}
			}
		}

		const exploreArtistRefs = extractUniqueArtistsFromItems(searchResults.tracks);
		for (const artist of exploreArtistRefs) {
			if (!artistMap.has(artist.id)) {
				artistMap.set(artist.id, { id: artist.id, name: artist.name });
			}
		}

		return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	}, [libraryBaseTracks, searchResults.tracks]);

	const mergedFilterAlbums = useMemo(() => {
		const albumMap = new Map<string, { id: string; name: string }>();

		for (const track of libraryBaseTracks) {
			if (track.album) {
				if (!albumMap.has(track.album.id)) {
					albumMap.set(track.album.id, { id: track.album.id, name: track.album.name });
				}
			}
		}

		const exploreAlbumRefs = extractUniqueAlbumsFromItems(searchResults.tracks);
		for (const album of exploreAlbumRefs) {
			if (!albumMap.has(album.id)) {
				albumMap.set(album.id, { id: album.id, name: album.name });
			}
		}

		return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
	}, [libraryBaseTracks, searchResults.tracks]);

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
			setSortField: filterState.setSortField,
			toggleSortDirection: filterState.toggleSortDirection,
			setContentType: filterState.setContentType,
			toggleArtistFilter: filterState.toggleArtistFilter,
			toggleAlbumFilter: filterState.toggleAlbumFilter,
			toggleFavoritesOnly: filterState.toggleFavoritesOnly,
			toggleDownloadedOnly: filterState.toggleDownloadedOnly,
			clearAll: filterState.clearAll,
		},
	};
}
