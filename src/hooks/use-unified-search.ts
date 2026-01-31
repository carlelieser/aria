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
import { useResolvedTracks } from './use-resolved-track';
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

	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();
	const favorites = useFavorites();
	const downloadedTracksMap = useDownloadedTracks();

	const searchResults = useSearchStore((s) => s.results);
	const isSearching = useSearchStore((s) => s.isSearching);
	const searchError = useSearchStore((s) => s.error);

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

	const hasLibraryFilters = hasLibraryActiveFilters(libraryFilterState.activeFilters);
	const hasExploreFilters = hasActiveSearchFilters(exploreFilterState.activeFilters);
	const hasFilters = hasLibraryFilters || hasExploreFilters;

	const libraryFilterCount = countLibraryActiveFilters(libraryFilterState.activeFilters);
	const exploreFilterCount = countActiveSearchFilters(exploreFilterState.activeFilters);
	const filterCount = libraryFilterCount + exploreFilterCount;

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
		hasLibraryFilters,
		hasExploreFilters,
		filterCount,
		libraryFilterCount,
		exploreFilterCount,

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
