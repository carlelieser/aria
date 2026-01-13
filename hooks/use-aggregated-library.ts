import { useMemo, useState, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';
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
import { AlbumId } from '@/src/domain/value-objects/album-id';
import { Duration } from '@/src/domain/value-objects/duration';
import { createLocalSource, type AudioFileType } from '@/src/domain/value-objects/audio-source';
import { createArtwork } from '@/src/domain/value-objects/artwork';

const LOCAL_LIBRARY_SOURCE = 'local-library';

/**
 * Threshold for deferring heavy computations.
 * If combined track count exceeds this, we defer recomputation.
 */
const DEFERRED_COMPUTATION_THRESHOLD = 200;

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

let cachedAggregatedTracks: Track[] = [];
let cachedLibraryTracks: Track[] | null = null;
let cachedLocalTracks: Record<string, LocalTrack> | null = null;

/**
 * Compute aggregated tracks from library and local tracks.
 * This is extracted to allow both sync and deferred execution.
 */
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

export function useAggregatedTracks(): Track[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localTracks = useLocalLibraryStore((state) => state.tracks);
	const [deferredResult, setDeferredResult] = useState<Track[] | null>(null);
	const isComputingRef = useRef(false);

	// Check if data has changed
	const hasChanged =
		libraryTracks !== cachedLibraryTracks || localTracks !== cachedLocalTracks;

	// Determine if we should defer computation
	const totalCount = libraryTracks.length + Object.keys(localTracks).length;
	const shouldDefer = hasChanged && totalCount > DEFERRED_COMPUTATION_THRESHOLD;

	// Effect for deferred computation
	useEffect(() => {
		if (!shouldDefer || isComputingRef.current) return;

		isComputingRef.current = true;

		// Defer heavy computation until after interactions complete
		const handle = InteractionManager.runAfterInteractions(() => {
			const result = computeAggregatedTracks(libraryTracks, localTracks);

			// Update cache
			cachedAggregatedTracks = result;
			cachedLibraryTracks = libraryTracks;
			cachedLocalTracks = localTracks;

			setDeferredResult(result);
			isComputingRef.current = false;
		});

		return () => {
			handle.cancel();
			isComputingRef.current = false;
		};
	}, [shouldDefer, libraryTracks, localTracks]);

	// Use memoized sync computation for small libraries or when cache is valid
	return useMemo(() => {
		// Return cached result if nothing changed
		if (!hasChanged) {
			return cachedAggregatedTracks;
		}

		// For large libraries, return cached while computing in background
		if (shouldDefer) {
			// Return deferred result if available, otherwise return stale cache
			return deferredResult ?? cachedAggregatedTracks;
		}

		// For small libraries, compute synchronously
		const result = computeAggregatedTracks(libraryTracks, localTracks);

		cachedAggregatedTracks = result;
		cachedLibraryTracks = libraryTracks;
		cachedLocalTracks = localTracks;

		return result;
	}, [libraryTracks, localTracks, hasChanged, shouldDefer, deferredResult]);
}

let cachedAggregatedArtists: UniqueArtist[] = [];
let cachedLibraryArtistsRef: Track[] | null = null;
let cachedLocalArtistsRef: Record<string, LocalArtist> | null = null;
let cachedLocalTracksForArtists: Record<string, LocalTrack> | null = null;

/**
 * Compute aggregated artists from library and local data.
 */
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

export function useAggregatedArtists(): UniqueArtist[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localArtists = useLocalLibraryStore((state) => state.artists);
	const localTracks = useLocalLibraryStore((state) => state.tracks);
	const [deferredResult, setDeferredResult] = useState<UniqueArtist[] | null>(null);
	const isComputingRef = useRef(false);

	const hasChanged =
		libraryTracks !== cachedLibraryArtistsRef ||
		localArtists !== cachedLocalArtistsRef ||
		localTracks !== cachedLocalTracksForArtists;

	const totalCount = libraryTracks.length + Object.keys(localArtists).length;
	const shouldDefer = hasChanged && totalCount > DEFERRED_COMPUTATION_THRESHOLD;

	useEffect(() => {
		if (!shouldDefer || isComputingRef.current) return;

		isComputingRef.current = true;

		const handle = InteractionManager.runAfterInteractions(() => {
			const result = computeAggregatedArtists(libraryTracks, localArtists, localTracks);

			cachedAggregatedArtists = result;
			cachedLibraryArtistsRef = libraryTracks;
			cachedLocalArtistsRef = localArtists;
			cachedLocalTracksForArtists = localTracks;

			setDeferredResult(result);
			isComputingRef.current = false;
		});

		return () => {
			handle.cancel();
			isComputingRef.current = false;
		};
	}, [shouldDefer, libraryTracks, localArtists, localTracks]);

	return useMemo(() => {
		if (!hasChanged) {
			return cachedAggregatedArtists;
		}

		if (shouldDefer) {
			return deferredResult ?? cachedAggregatedArtists;
		}

		const result = computeAggregatedArtists(libraryTracks, localArtists, localTracks);

		cachedAggregatedArtists = result;
		cachedLibraryArtistsRef = libraryTracks;
		cachedLocalArtistsRef = localArtists;
		cachedLocalTracksForArtists = localTracks;

		return result;
	}, [libraryTracks, localArtists, localTracks, hasChanged, shouldDefer, deferredResult]);
}

let cachedAggregatedAlbums: UniqueAlbum[] = [];
let cachedLibraryAlbumsRef: Track[] | null = null;
let cachedLocalAlbumsRef: Record<string, LocalAlbum> | null = null;

/**
 * Compute aggregated albums from library and local data.
 */
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

export function useAggregatedAlbums(): UniqueAlbum[] {
	const libraryTracks = useLibraryStore((state) => state.tracks);
	const localAlbums = useLocalLibraryStore((state) => state.albums);
	const [deferredResult, setDeferredResult] = useState<UniqueAlbum[] | null>(null);
	const isComputingRef = useRef(false);

	const hasChanged =
		libraryTracks !== cachedLibraryAlbumsRef || localAlbums !== cachedLocalAlbumsRef;

	const totalCount = libraryTracks.length + Object.keys(localAlbums).length;
	const shouldDefer = hasChanged && totalCount > DEFERRED_COMPUTATION_THRESHOLD;

	useEffect(() => {
		if (!shouldDefer || isComputingRef.current) return;

		isComputingRef.current = true;

		const handle = InteractionManager.runAfterInteractions(() => {
			const result = computeAggregatedAlbums(libraryTracks, localAlbums);

			cachedAggregatedAlbums = result;
			cachedLibraryAlbumsRef = libraryTracks;
			cachedLocalAlbumsRef = localAlbums;

			setDeferredResult(result);
			isComputingRef.current = false;
		});

		return () => {
			handle.cancel();
			isComputingRef.current = false;
		};
	}, [shouldDefer, libraryTracks, localAlbums]);

	return useMemo(() => {
		if (!hasChanged) {
			return cachedAggregatedAlbums;
		}

		if (shouldDefer) {
			return deferredResult ?? cachedAggregatedAlbums;
		}

		const result = computeAggregatedAlbums(libraryTracks, localAlbums);

		cachedAggregatedAlbums = result;
		cachedLibraryAlbumsRef = libraryTracks;
		cachedLocalAlbumsRef = localAlbums;

		return result;
	}, [libraryTracks, localAlbums, hasChanged, shouldDefer, deferredResult]);
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
