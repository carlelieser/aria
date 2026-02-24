/**
 * useSearchLibraryResults Hook
 *
 * Computes filtered and sorted library results for the unified search.
 */

import { useMemo } from 'react';
import { useFavorites, usePlaylists } from '@/src/application/state/library-store';
import { useDownloadedTracks } from '@/src/application/state/download-store';
import {
	useAggregatedTracks,
	useAggregatedArtists,
	useAggregatedAlbums,
} from './use-aggregated-library';
import { useResolvedTracks } from './use-resolved-track';
import { filterTracks, sortTracks, type SortField } from '@/src/domain/utils/track-filtering';
import { filterPlaylists, filterAlbums, filterArtists } from '@/src/domain/utils/library-filtering';
import type { SearchSortDirection } from '@/src/domain/utils/search-filtering';
import {
	buildLibraryBaseTracks,
	findMatchingDownloadIds,
	resolveDownloadsTracks,
} from './utils/unified-search-utils';

export function useSearchLibraryResults(
	query: string,
	hasQuery: boolean,
	librarySortField: SortField,
	sortDirection: SearchSortDirection,
	activeFilters: {
		readonly favoritesOnly: boolean;
		readonly artistIds: string[];
		readonly albumIds: string[];
		readonly providerIds: string[];
		readonly downloadedOnly: boolean;
	}
) {
	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();
	const favorites = useFavorites();
	const downloadedTracksMap = useDownloadedTracks();

	const downloadedIds = useMemo(() => {
		return new Set(downloadedTracksMap.keys());
	}, [downloadedTracksMap]);

	const libraryBaseTracks = useMemo(
		() =>
			buildLibraryBaseTracks(
				allTracks,
				activeFilters.downloadedOnly,
				downloadedIds,
				downloadedTracksMap
			),
		[allTracks, activeFilters.downloadedOnly, downloadedIds, downloadedTracksMap]
	);

	const libraryFiltersForSearch = useMemo(
		() => ({
			favoritesOnly: activeFilters.favoritesOnly,
			artistIds: activeFilters.artistIds,
			albumIds: activeFilters.albumIds,
			providerIds: activeFilters.providerIds,
			downloadedOnly: false,
		}),
		[activeFilters]
	);

	const matchingDownloadIds = useMemo(() => {
		if (!hasQuery) return [];
		return findMatchingDownloadIds(downloadedTracksMap, query);
	}, [downloadedTracksMap, query, hasQuery]);

	const resolvedDownloadTracks = useResolvedTracks(matchingDownloadIds);

	const downloadsTracks = useMemo(
		() =>
			resolveDownloadsTracks(
				matchingDownloadIds,
				resolvedDownloadTracks,
				downloadedTracksMap
			),
		[matchingDownloadIds, resolvedDownloadTracks, downloadedTracksMap]
	);

	const libraryTracks = useMemo(() => {
		if (!hasQuery) return [];
		const filtered = filterTracks(libraryBaseTracks, query, libraryFiltersForSearch, favorites);
		return sortTracks(filtered, librarySortField, sortDirection);
	}, [
		libraryBaseTracks,
		query,
		hasQuery,
		libraryFiltersForSearch,
		favorites,
		librarySortField,
		sortDirection,
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

	return {
		libraryBaseTracks,
		libraryTracks,
		libraryPlaylists,
		libraryAlbumsFiltered,
		libraryArtistsFiltered,
		downloadsTracks,
	};
}
