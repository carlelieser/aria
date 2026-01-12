import { useMemo } from 'react';
import {
	useLibraryStore,
	type UniqueArtist,
	type UniqueAlbum,
} from '@/src/application/state/library-store';
import { useLocalLibraryStore } from '@/src/plugins/metadata/local-library/storage/local-library-store';
import type { Track } from '@/src/domain/entities/track';
import type {
	LocalTrack,
	LocalAlbum,
	LocalArtist,
} from '@/src/plugins/metadata/local-library/types';
import { TrackId } from '@/src/domain/value-objects/track-id';
import { Duration } from '@/src/domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '@/src/domain/value-objects/audio-source';
import { createArtwork } from '@/src/domain/value-objects/artwork';

function mapLocalTrackToTrack(localTrack: LocalTrack): Track {
	const extension = localTrack.filePath.split('.').pop()?.toLowerCase() as
		| AudioFileType
		| undefined;

	return {
		id: TrackId.create('local-file', localTrack.id),
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
						id: localTrack.albumId,
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
		id: localAlbum.id,
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

let cachedAggregatedTracks: Track[] = [];
let cachedLibraryTracks: Track[] | null = null;
let cachedLocalTracks: Record<string, LocalTrack> | null = null;

export function useAggregatedTracks(): Track[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localTracks = useLocalLibraryStore((state) => state.tracks);

	return useMemo(() => {
		if (libraryTracks === cachedLibraryTracks && localTracks === cachedLocalTracks) {
			return cachedAggregatedTracks;
		}

		const localTrackArray = Object.values(localTracks);
		const mappedLocalTracks = localTrackArray.map(mapLocalTrackToTrack);

		const libraryTrackIds = new Set(libraryTracks.map((t) => t.id.value));
		const uniqueLocalTracks = mappedLocalTracks.filter((t) => !libraryTrackIds.has(t.id.value));

		cachedAggregatedTracks = [...libraryTracks, ...uniqueLocalTracks];
		cachedLibraryTracks = libraryTracks;
		cachedLocalTracks = localTracks;

		return cachedAggregatedTracks;
	}, [libraryTracks, localTracks]);
}

let cachedAggregatedArtists: UniqueArtist[] = [];
let cachedLibraryArtistsRef: Track[] | null = null;
let cachedLocalArtistsRef: Record<string, LocalArtist> | null = null;
let cachedLocalTracksForArtists: Record<string, LocalTrack> | null = null;

export function useAggregatedArtists(): UniqueArtist[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localArtists = useLocalLibraryStore((state) => state.artists);
	const localTracks = useLocalLibraryStore((state) => state.tracks);

	return useMemo(() => {
		if (
			libraryTracks === cachedLibraryArtistsRef &&
			localArtists === cachedLocalArtistsRef &&
			localTracks === cachedLocalTracksForArtists
		) {
			return cachedAggregatedArtists;
		}

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

		cachedAggregatedArtists = Array.from(artistMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
		cachedLibraryArtistsRef = libraryTracks;
		cachedLocalArtistsRef = localArtists;
		cachedLocalTracksForArtists = localTracks;

		return cachedAggregatedArtists;
	}, [libraryTracks, localArtists, localTracks]);
}

let cachedAggregatedAlbums: UniqueAlbum[] = [];
let cachedLibraryAlbumsRef: Track[] | null = null;
let cachedLocalAlbumsRef: Record<string, LocalAlbum> | null = null;

export function useAggregatedAlbums(): UniqueAlbum[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbums = useLocalLibraryStore((state) => state.albums);

	return useMemo(() => {
		if (libraryTracks === cachedLibraryAlbumsRef && localAlbums === cachedLocalAlbumsRef) {
			return cachedAggregatedAlbums;
		}

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
			const existing = albumMap.get(localAlbum.id);
			if (existing) {
				albumMap.set(localAlbum.id, {
					...existing,
					trackCount: existing.trackCount + localAlbum.trackCount,
				});
			} else {
				albumMap.set(localAlbum.id, mapLocalAlbumToUniqueAlbum(localAlbum));
			}
		}

		cachedAggregatedAlbums = Array.from(albumMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
		cachedLibraryAlbumsRef = libraryTracks;
		cachedLocalAlbumsRef = localAlbums;

		return cachedAggregatedAlbums;
	}, [libraryTracks, localAlbums]);
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
