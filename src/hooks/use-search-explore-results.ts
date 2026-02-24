/**
 * useSearchExploreResults Hook
 *
 * Computes filtered and sorted explore (remote) results for the unified search.
 */

import { useMemo, useRef, useEffect } from 'react';
import { useSearchStore } from '@/src/application/state/search-store';
import { useFavorites } from '@/src/application/state/library-store';
import {
	filterSearchResults,
	sortSearchResults,
	createRelevanceOrderMap,
	type SearchSortField,
	type SearchSortDirection,
	type SearchContentType,
} from '@/src/domain/utils/search-filtering';
import {
	extractUniqueArtistsFromItems,
	extractUniqueAlbumsFromItems,
	extractUniqueProvidersFromItems,
} from '@/src/domain/utils/core-filtering';
import type { Track } from '@/src/domain/entities/track';
import { getSourceDisplayName } from '@/src/domain/entities/track';
import type { ProviderFilterOption } from './use-unique-filter-options';

export function useSearchExploreResults(
	exploreSortField: SearchSortField,
	sortDirection: SearchSortDirection,
	activeFilters: {
		readonly contentType: SearchContentType;
		readonly favoritesOnly: boolean;
		readonly artistIds: string[];
		readonly albumIds: string[];
		readonly providerIds: string[];
	},
	libraryBaseTracks: Track[]
) {
	const searchResults = useSearchStore((s) => s.results);
	const isSearching = useSearchStore((s) => s.isSearching);
	const searchError = useSearchStore((s) => s.error);
	const favorites = useFavorites();

	const relevanceOrderRef = useRef<Map<string, number>>(new Map());

	useEffect(() => {
		relevanceOrderRef.current = createRelevanceOrderMap(searchResults.tracks);
	}, [searchResults.tracks]);

	const exploreSearchFilters = useMemo(
		() => ({
			contentType: activeFilters.contentType,
			favoritesOnly: activeFilters.favoritesOnly,
			artistIds: activeFilters.artistIds,
			albumIds: activeFilters.albumIds,
			providerIds: activeFilters.providerIds,
		}),
		[activeFilters]
	);

	const exploreFilteredTracks = useMemo(() => {
		return filterSearchResults(searchResults.tracks, exploreSearchFilters, favorites);
	}, [searchResults.tracks, exploreSearchFilters, favorites]);

	const exploreTracks = useMemo(() => {
		const contentType = activeFilters.contentType;
		if (contentType === 'albums' || contentType === 'artists') {
			return [];
		}
		return sortSearchResults(
			exploreFilteredTracks,
			exploreSortField,
			sortDirection,
			relevanceOrderRef.current
		);
	}, [exploreFilteredTracks, exploreSortField, sortDirection, activeFilters.contentType]);

	const exploreAlbums = useMemo(() => {
		const contentType = activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'artists') {
			return [];
		}
		return searchResults.albums;
	}, [searchResults.albums, activeFilters.contentType]);

	const exploreArtists = useMemo(() => {
		const contentType = activeFilters.contentType;
		if (contentType === 'tracks' || contentType === 'albums') {
			return [];
		}
		return searchResults.artists;
	}, [searchResults.artists, activeFilters.contentType]);

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

	const mergedFilterProviders = useMemo((): ProviderFilterOption[] => {
		const providerSet = new Set<string>();

		for (const track of libraryBaseTracks) {
			providerSet.add(track.id.sourceType);
		}

		const exploreProviders = extractUniqueProvidersFromItems(searchResults.tracks);
		for (const provider of exploreProviders) {
			providerSet.add(provider);
		}

		return Array.from(providerSet)
			.sort((a, b) => a.localeCompare(b))
			.map((sourceType) => ({
				id: sourceType,
				name: getSourceDisplayName({ id: { sourceType } } as Track),
			}));
	}, [libraryBaseTracks, searchResults.tracks]);

	return {
		isSearching,
		searchError,
		exploreTracks,
		exploreAlbums,
		exploreArtists,
		mergedFilterArtists,
		mergedFilterAlbums,
		mergedFilterProviders,
	};
}
