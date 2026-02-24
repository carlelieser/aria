/**
 * Aggregated Library Hooks
 *
 * Hooks that merge main library and local library data into unified collections.
 */

import { useMemo, useCallback } from 'react';
import {
	useLibraryStore,
	type UniqueArtist,
	type UniqueAlbum,
} from '@/src/application/state/library-store';
import {
	useLocalTracks as useLocalTracksStore,
	useLocalAlbums as useLocalAlbumsStore,
	useLocalArtists as useLocalArtistsStore,
	useLocalTrackCount,
} from '@/src/application/services/local-library-facade';
import { createDeferredComputation } from '@/src/hooks/use-deferred-computation';
import type { Track } from '@/src/domain/entities/track';
import {
	computeAggregatedTracks,
	computeAggregatedArtists,
	computeAggregatedAlbums,
} from './utils/aggregated-library-utils';

const useDeferredTracks = createDeferredComputation<Track[]>([]);

export function useAggregatedTracks(): Track[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localTracks = useLocalTracksStore();

	const computeFn = useCallback(
		() => computeAggregatedTracks(libraryTracks, localTracks),
		[libraryTracks, localTracks]
	);

	const totalCount = libraryTracks.length + Object.keys(localTracks).length;

	return useDeferredTracks(computeFn, [libraryTracks, localTracks], totalCount);
}

const useDeferredArtists = createDeferredComputation<UniqueArtist[]>([]);

export function useAggregatedArtists(): UniqueArtist[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localArtists = useLocalArtistsStore();
	const localTracks = useLocalTracksStore();

	const computeFn = useCallback(
		() => computeAggregatedArtists(libraryTracks, localArtists, localTracks),
		[libraryTracks, localArtists, localTracks]
	);

	const totalCount = libraryTracks.length + Object.keys(localArtists).length;

	return useDeferredArtists(computeFn, [libraryTracks, localArtists, localTracks], totalCount);
}

const useDeferredAlbums = createDeferredComputation<UniqueAlbum[]>([]);

export function useAggregatedAlbums(): UniqueAlbum[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbums = useLocalAlbumsStore();

	const computeFn = useCallback(
		() => computeAggregatedAlbums(libraryTracks, localAlbums),
		[libraryTracks, localAlbums]
	);

	const totalCount = libraryTracks.length + Object.keys(localAlbums).length;

	return useDeferredAlbums(computeFn, [libraryTracks, localAlbums], totalCount);
}

export function useAggregatedTrackCount(): number {
	const libraryCount = useLibraryStore((state) => state.tracks.length);
	const localCount = useLocalTrackCount();

	return libraryCount + localCount;
}

export function useAggregatedAlbumCount(): number {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbums = useLocalAlbumsStore();
	const localAlbumCount = Object.keys(localAlbums).length;

	const libraryAlbumCount = useMemo(() => {
		const albumIds = new Set<string>();
		for (const track of libraryTracks) {
			if (track.album?.id) {
				albumIds.add(track.album.id);
			}
		}
		return albumIds.size;
	}, [libraryTracks]);

	return libraryAlbumCount + localAlbumCount;
}

export function useAggregatedArtistCount(): number {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localArtists = useLocalArtistsStore();
	const localArtistCount = Object.keys(localArtists).length;

	const libraryArtistCount = useMemo(() => {
		const artistIds = new Set<string>();
		for (const track of libraryTracks) {
			for (const artist of track.artists) {
				artistIds.add(artist.id);
			}
		}
		return artistIds.size;
	}, [libraryTracks]);

	return libraryArtistCount + localArtistCount;
}
