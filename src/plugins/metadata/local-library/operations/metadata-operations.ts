import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { ok, err, type AsyncResult } from '@shared/types/result';
import { useLocalLibraryStore } from '../storage/local-library-store';
import { localTrackToTrack, localAlbumToAlbum, localArtistToArtist } from '../mappers';
import { paginateResults } from './search-operations';

/**
 * Get track information by ID.
 */
export async function getTrackInfo(trackId: TrackId): AsyncResult<Track, Error> {
	const state = useLocalLibraryStore.getState();
	const localTrack = state.tracks[trackId.sourceId];

	if (!localTrack) {
		return err(new Error(`Track not found: ${trackId.value}`));
	}

	return ok(localTrackToTrack(localTrack));
}

/**
 * Get album information by ID.
 */
export async function getAlbumInfo(albumId: string): AsyncResult<Album, Error> {
	const state = useLocalLibraryStore.getState();
	const localAlbum = state.albums[albumId];

	if (!localAlbum) {
		return err(new Error(`Album not found: ${albumId}`));
	}

	return ok(localAlbumToAlbum(localAlbum));
}

/**
 * Get artist information by ID.
 */
export async function getArtistInfo(artistId: string): AsyncResult<Artist, Error> {
	const state = useLocalLibraryStore.getState();
	const localArtist = state.artists[artistId];

	if (!localArtist) {
		return err(new Error(`Artist not found: ${artistId}`));
	}

	return ok(localArtistToArtist(localArtist));
}

/**
 * Get all tracks for a specific album.
 */
export async function getAlbumTracks(
	albumId: string,
	options?: SearchOptions
): AsyncResult<SearchResults<Track>, Error> {
	try {
		const state = useLocalLibraryStore.getState();
		const tracks = state.getTracksByAlbum(albumId).map(localTrackToTrack);

		tracks.sort((a, b) => {
			const aNum = a.metadata.trackNumber ?? 0;
			const bNum = b.metadata.trackNumber ?? 0;
			return aNum - bNum;
		});

		return ok(paginateResults(tracks, options));
	} catch {
		return err(new Error('Failed to get album tracks'));
	}
}

/**
 * Get all albums for a specific artist.
 */
export async function getArtistAlbums(
	artistId: string,
	options?: SearchOptions
): AsyncResult<SearchResults<Album>, Error> {
	try {
		const state = useLocalLibraryStore.getState();
		const albums = state.getAlbumsByArtist(artistId).map(localAlbumToAlbum);
		return ok(paginateResults(albums, options));
	} catch {
		return err(new Error('Failed to get artist albums'));
	}
}
