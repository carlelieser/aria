import { useMemo, useCallback } from 'react';
import {
	useLibraryStore,
	type UniqueArtist,
	type UniqueAlbum,
} from '@/src/application/state/library-store';
import { useLocalLibraryStore } from '@/src/plugins/metadata/local-library/storage/local-library-store';
import { createDeferredComputation } from '@/hooks/use-deferred-computation';
import type { Track } from '@/src/domain/entities/track';
import type {
	LocalTrack,
	LocalAlbum,
	LocalArtist,
} from '@/src/plugins/metadata/local-library/types';
import { TrackId } from '@/src/domain/value-objects/track-id';
import { AlbumId } from '@/src/domain/value-objects/album-id';
import { Duration } from '@/src/domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '@/src/domain/value-objects/audio-source';
import { createArtwork } from '@/src/domain/value-objects/artwork';

const LOCAL_LIBRARY_SOURCE = 'local-library';

function mapLocalTrackToTrack(localTrack: LocalTrack): Track {
	const extension = localTrack.filePath.split('.').pop()?.toLowerCase() as
		| AudioFileType
		| undefined;

	return {
		id: TrackId.create(LOCAL_LIBRARY_SOURCE, localTrack.id),
		title: localTrack.title,
		artists: [
			{
				id: localTrack.artistId,
				name: localTrack.artistName,
			},
		],
		album:
			localTrack.albumId && localTrack.albumName
				? {
						id: AlbumId.create(LOCAL_LIBRARY_SOURCE, localTrack.albumId).value,
						name: localTrack.albumName,
					}
				: undefined,
		duration: Duration.fromSeconds(localTrack.duration),
		artwork: localTrack.artworkPath ? [createArtwork(localTrack.artworkPath)] : undefined,
		source: createLocalSource(localTrack.filePath, extension, localTrack.fileSize),
		metadata: {
			genre: localTrack.genre,
			year: localTrack.year,
			trackNumber: localTrack.trackNumber,
			discNumber: localTrack.discNumber,
		},
		addedAt: new Date(localTrack.addedAt),
	};
}

function mapLocalAlbumToUniqueAlbum(localAlbum: LocalAlbum): UniqueAlbum {
	return {
		id: AlbumId.create(LOCAL_LIBRARY_SOURCE, localAlbum.id).value,
		name: localAlbum.name,
		artistName: localAlbum.artistName,
		trackCount: localAlbum.trackCount,
		artworkUrl: localAlbum.artworkPath,
	};
}

function mapLocalArtistToUniqueArtist(
	localArtist: LocalArtist,
	artworkPath?: string
): UniqueArtist {
	return {
		id: localArtist.id,
		name: localArtist.name,
		trackCount: localArtist.trackCount,
		artworkUrl: artworkPath,
	};
}

function computeAggregatedTracks(
	libraryTracks: Track[],
	localTracks: Record<string, LocalTrack>
): Track[] {
	const localTrackArray = Object.values(localTracks);
	const mappedLocalTracks = localTrackArray.map(mapLocalTrackToTrack);

	const libraryTrackIds = new Set(libraryTracks.map((t) => t.id.value));
	const uniqueLocalTracks = mappedLocalTracks.filter((t) => !libraryTrackIds.has(t.id.value));

	return [...libraryTracks, ...uniqueLocalTracks];
}

const useDeferredTracks = createDeferredComputation<Track[]>([]);

export function useAggregatedTracks(): Track[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localTracks = useLocalLibraryStore((state) => state.tracks);

	const computeFn = useCallback(
		() => computeAggregatedTracks(libraryTracks, localTracks),
		[libraryTracks, localTracks]
	);

	const totalCount = libraryTracks.length + Object.keys(localTracks).length;

	return useDeferredTracks(computeFn, [libraryTracks, localTracks], totalCount);
}

function computeAggregatedArtists(
	libraryTracks: Track[],
	localArtists: Record<string, LocalArtist>,
	localTracks: Record<string, LocalTrack>
): UniqueArtist[] {
	const artistMap = new Map<string, UniqueArtist>();

	for (const track of libraryTracks) {
		for (const artist of track.artists) {
			const existing = artistMap.get(artist.id);
			if (existing) {
				artistMap.set(artist.id, {
					...existing,
					trackCount: existing.trackCount + 1,
				});
			} else {
				artistMap.set(artist.id, {
					id: artist.id,
					name: artist.name,
					trackCount: 1,
					artworkUrl: track.artwork?.[0]?.url,
				});
			}
		}
	}

	const localTrackArray = Object.values(localTracks);
	const artistArtworkMap = new Map<string, string>();
	for (const track of localTrackArray) {
		if (track.artworkPath && !artistArtworkMap.has(track.artistId)) {
			artistArtworkMap.set(track.artistId, track.artworkPath);
		}
	}

	for (const localArtist of Object.values(localArtists)) {
		const existing = artistMap.get(localArtist.id);
		if (existing) {
			artistMap.set(localArtist.id, {
				...existing,
				trackCount: existing.trackCount + localArtist.trackCount,
			});
		} else {
			artistMap.set(
				localArtist.id,
				mapLocalArtistToUniqueArtist(localArtist, artistArtworkMap.get(localArtist.id))
			);
		}
	}

	return Array.from(artistMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const useDeferredArtists = createDeferredComputation<UniqueArtist[]>([]);

export function useAggregatedArtists(): UniqueArtist[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localArtists = useLocalLibraryStore((state) => state.artists);
	const localTracks = useLocalLibraryStore((state) => state.tracks);

	const computeFn = useCallback(
		() => computeAggregatedArtists(libraryTracks, localArtists, localTracks),
		[libraryTracks, localArtists, localTracks]
	);

	const totalCount = libraryTracks.length + Object.keys(localArtists).length;

	return useDeferredArtists(
		computeFn,
		[libraryTracks, localArtists, localTracks],
		totalCount
	);
}

function computeAggregatedAlbums(
	libraryTracks: Track[],
	localAlbums: Record<string, LocalAlbum>
): UniqueAlbum[] {
	const albumMap = new Map<string, UniqueAlbum>();

	for (const track of libraryTracks) {
		if (!track.album) continue;

		const existing = albumMap.get(track.album.id);
		if (existing) {
			albumMap.set(track.album.id, {
				...existing,
				trackCount: existing.trackCount + 1,
			});
		} else {
			albumMap.set(track.album.id, {
				id: track.album.id,
				name: track.album.name,
				artistName: track.artists[0]?.name ?? 'Unknown Artist',
				trackCount: 1,
				artworkUrl: track.artwork?.[0]?.url,
			});
		}
	}

	for (const localAlbum of Object.values(localAlbums)) {
		const formattedId = AlbumId.create(LOCAL_LIBRARY_SOURCE, localAlbum.id).value;
		const existing = albumMap.get(formattedId);
		if (existing) {
			albumMap.set(formattedId, {
				...existing,
				trackCount: existing.trackCount + localAlbum.trackCount,
			});
		} else {
			albumMap.set(formattedId, mapLocalAlbumToUniqueAlbum(localAlbum));
		}
	}

	return Array.from(albumMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}

const useDeferredAlbums = createDeferredComputation<UniqueAlbum[]>([]);

export function useAggregatedAlbums(): UniqueAlbum[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbums = useLocalLibraryStore((state) => state.albums);

	const computeFn = useCallback(
		() => computeAggregatedAlbums(libraryTracks, localAlbums),
		[libraryTracks, localAlbums]
	);

	const totalCount = libraryTracks.length + Object.keys(localAlbums).length;

	return useDeferredAlbums(computeFn, [libraryTracks, localAlbums], totalCount);
}

export function useAggregatedTrackCount(): number {
	const libraryCount = useLibraryStore((state) => state.tracks.length);
	const localCount = useLocalLibraryStore((state) => Object.keys(state.tracks).length);

	return libraryCount + localCount;
}

export function useAggregatedAlbumCount(): number {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbumCount = useLocalLibraryStore((state) => Object.keys(state.albums).length);

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
	const localArtistCount = useLocalLibraryStore((state) => Object.keys(state.artists).length);

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
