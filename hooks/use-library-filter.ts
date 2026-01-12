import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFavorites, usePlaylists } from '@/src/application/state/library-store';
import { useDownloadedTracks } from '@/src/application/state/download-store';
import { useLibraryFilterStore } from '@/src/application/state/library-filter-store';
import {
	filterTracks,
	sortTracks,
	hasActiveFilters,
	countActiveFilters,
} from '@/src/domain/utils/track-filtering';
import { filterPlaylists, filterAlbums, filterArtists } from '@/src/domain/utils/library-filtering';
import { createTrackFromDownloadedMetadata } from '@/src/domain/utils/create-track-from-download';
import {
	useAggregatedTracks,
	useAggregatedAlbums,
	useAggregatedArtists,
} from './use-aggregated-library';

export function useLibraryFilter() {
	const allTracks = useAggregatedTracks();
	const allPlaylists = usePlaylists();
	const allAlbums = useAggregatedAlbums();
	const allArtists = useAggregatedArtists();
	const favorites = useFavorites();
	const downloadedTracksMap = useDownloadedTracks();

	const {
		searchQuery,
		sortField,
		sortDirection,
		activeFilters,
		isFilterSheetOpen,
		setSearchQuery,
		setSortField,
		setSortDirection,
		toggleSortDirection,
		toggleArtistFilter,
		toggleAlbumFilter,
		toggleFavoritesOnly,
		toggleDownloadedOnly,
		clearFilters,
		clearAll,
		setFilterSheetOpen,
	} = useLibraryFilterStore(
		useShallow((s) => ({
			searchQuery: s.searchQuery,
			sortField: s.sortField,
			sortDirection: s.sortDirection,
			activeFilters: s.activeFilters,
			isFilterSheetOpen: s.isFilterSheetOpen,
			setSearchQuery: s.setSearchQuery,
			setSortField: s.setSortField,
			setSortDirection: s.setSortDirection,
			toggleSortDirection: s.toggleSortDirection,
			toggleArtistFilter: s.toggleArtistFilter,
			toggleAlbumFilter: s.toggleAlbumFilter,
			toggleFavoritesOnly: s.toggleFavoritesOnly,
			toggleDownloadedOnly: s.toggleDownloadedOnly,
			clearFilters: s.clearFilters,
			clearAll: s.clearAll,
			setFilterSheetOpen: s.setFilterSheetOpen,
		}))
	);

	const downloadedIds = useMemo(() => {
		return new Set(downloadedTracksMap.keys());
	}, [downloadedTracksMap]);

	const baseTracks = useMemo(() => {
		if (!activeFilters.downloadedOnly) {
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
	}, [allTracks, activeFilters.downloadedOnly, downloadedIds, downloadedTracksMap]);

	const filtersWithoutDownloaded = useMemo(
		() => ({ ...activeFilters, downloadedOnly: false }),
		[activeFilters]
	);

	const filteredTracks = useMemo(() => {
		return filterTracks(baseTracks, searchQuery, filtersWithoutDownloaded, favorites);
	}, [baseTracks, searchQuery, filtersWithoutDownloaded, favorites]);

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

	const playlists = useMemo(() => {
		return filterPlaylists(allPlaylists, searchQuery);
	}, [allPlaylists, searchQuery]);

	const albums = useMemo(() => {
		return filterAlbums(allAlbums, searchQuery);
	}, [allAlbums, searchQuery]);

	const artists = useMemo(() => {
		return filterArtists(allArtists, searchQuery);
	}, [allArtists, searchQuery]);

	return {
		tracks,
		playlists,
		albums,
		artists,
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
		toggleDownloadedOnly,
		clearFilters,

		clearAll,

		isFilterSheetOpen,
		openFilterSheet: () => setFilterSheetOpen(true),
		closeFilterSheet: () => setFilterSheetOpen(false),
	};
}
