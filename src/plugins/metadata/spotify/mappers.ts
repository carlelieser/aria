import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Album, AlbumType } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import type { Playlist, PlaylistTrack } from '@domain/entities/playlist';
import { TrackId } from '@domain/value-objects/track-id';
import { AlbumId } from '@domain/value-objects/album-id';
import { Duration } from '@domain/value-objects/duration';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
import { UNKNOWN_ARTIST, mapAndFilter, mapAndFilterWithIndex } from '@shared/mappers';
import type {
	SpotifyTrack,
	SpotifySimplifiedTrack,
	SpotifyAlbum,
	SpotifySimplifiedAlbum,
	SpotifyArtist,
	SpotifySimplifiedArtist,
	SpotifyPlaylist,
	SpotifySimplifiedPlaylist,
	SpotifyPlaylistTrack,
	SpotifySavedTrack,
	SpotifyImage,
} from './types';

export function mapSpotifyImages(images?: SpotifyImage[]): Artwork[] {
	if (!images || images.length === 0) {
		return [];
	}

	return images
		.filter((img) => img.url)
		.map((img) => createArtwork(img.url, img.width ?? undefined, img.height ?? undefined));
}

export function mapSpotifyArtistReference(artist: SpotifySimplifiedArtist): ArtistReference {
	return {
		id: artist.id,
		name: artist.name,
	};
}

export function mapSpotifyArtistReferences(artists?: SpotifySimplifiedArtist[]): ArtistReference[] {
	if (!artists || artists.length === 0) {
		return [UNKNOWN_ARTIST];
	}

	return artists.map(mapSpotifyArtistReference);
}

function mapAlbumType(albumType: string): AlbumType {
	switch (albumType) {
		case 'single':
			return 'single';
		case 'compilation':
			return 'compilation';
		case 'album':
		default:
			return 'album';
	}
}

export function mapSpotifySimplifiedTrack(
	track: SpotifySimplifiedTrack,
	album?: SpotifySimplifiedAlbum
): Track | null {
	if (!track.id || !track.name) {
		return null;
	}

	const trackId = TrackId.create('spotify', track.id);
	const duration = Duration.fromMilliseconds(track.duration_ms);
	const artists = mapSpotifyArtistReferences(track.artists);

	const params: CreateTrackParams = {
		id: trackId,
		title: track.name,
		artists,
		duration,
		artwork: album ? mapSpotifyImages(album.images) : undefined,
		source: createStreamingSource('spotify', track.id),
		metadata: {
			trackNumber: track.track_number,
			discNumber: track.disc_number,
			explicit: track.explicit,
		},
	};

	if (album) {
		params.album = {
			id: AlbumId.create('spotify', album.id).value,
			name: album.name,
		};

		const year = parseInt(album.release_date?.substring(0, 4), 10);
		if (!isNaN(year)) {
			params.metadata = {
				...params.metadata,
				year,
			};
		}
	}

	return createTrack(params);
}

export function mapSpotifyTrack(track: SpotifyTrack): Track | null {
	if (!track.id || !track.name) {
		return null;
	}

	const trackId = TrackId.create('spotify', track.id);
	const duration = Duration.fromMilliseconds(track.duration_ms);
	const artists = mapSpotifyArtistReferences(track.artists);
	const artwork = mapSpotifyImages(track.album?.images);

	const params: CreateTrackParams = {
		id: trackId,
		title: track.name,
		artists,
		duration,
		artwork: artwork.length > 0 ? artwork : undefined,
		source: createStreamingSource('spotify', track.id),
		metadata: {
			trackNumber: track.track_number,
			discNumber: track.disc_number,
			explicit: track.explicit,
			popularity: track.popularity,
			isrc: track.external_ids?.isrc,
		},
	};

	if (track.album) {
		params.album = {
			id: AlbumId.create('spotify', track.album.id).value,
			name: track.album.name,
		};

		const year = parseInt(track.album.release_date?.substring(0, 4), 10);
		if (!isNaN(year)) {
			params.metadata = {
				...params.metadata,
				year,
			};
		}
	}

	return createTrack(params);
}

export function mapSpotifySavedTrack(savedTrack: SpotifySavedTrack): Track | null {
	const track = mapSpotifyTrack(savedTrack.track);
	if (!track) {
		return null;
	}

	return {
		...track,
		addedAt: new Date(savedTrack.added_at),
	};
}

export function mapSpotifySimplifiedAlbum(album: SpotifySimplifiedAlbum): Album | null {
	if (!album.id || !album.name) {
		return null;
	}

	const artists = mapSpotifyArtistReferences(album.artists);
	const artwork = mapSpotifyImages(album.images);

	return {
		id: AlbumId.create('spotify', album.id),
		name: album.name,
		artists,
		artwork: artwork.length > 0 ? artwork : undefined,
		releaseDate: album.release_date,
		trackCount: album.total_tracks,
		albumType: mapAlbumType(album.album_type),
	};
}

export function mapSpotifyAlbum(album: SpotifyAlbum): Album | null {
	if (!album.id || !album.name) {
		return null;
	}

	const artists = mapSpotifyArtistReferences(album.artists);
	const artwork = mapSpotifyImages(album.images);
	const copyrights = album.copyrights?.map((c) => c.text) ?? [];

	return {
		id: AlbumId.create('spotify', album.id),
		name: album.name,
		artists,
		artwork: artwork.length > 0 ? artwork : undefined,
		releaseDate: album.release_date,
		trackCount: album.total_tracks,
		albumType: mapAlbumType(album.album_type),
		genres: album.genres,
		copyrights,
	};
}

export function mapSpotifyArtist(artist: SpotifyArtist): Artist | null {
	if (!artist.id || !artist.name) {
		return null;
	}

	const artwork = mapSpotifyImages(artist.images);

	return {
		id: artist.id,
		name: artist.name,
		artwork: artwork.length > 0 ? artwork : undefined,
		genres: artist.genres,
		monthlyListeners: undefined,
		externalUrls: {
			spotify: artist.external_urls?.spotify,
		},
	};
}

export function mapSpotifySimplifiedPlaylist(playlist: SpotifySimplifiedPlaylist): Playlist | null {
	if (!playlist.id || !playlist.name) {
		return null;
	}

	const artwork = mapSpotifyImages(playlist.images);

	return {
		id: playlist.id,
		name: playlist.name,
		description: playlist.description ?? undefined,
		artwork: artwork.length > 0 ? artwork : undefined,
		tracks: [],
		createdAt: new Date(),
		updatedAt: new Date(),
		isSmartPlaylist: false,
		isPinned: false,
		source: 'spotify',
	};
}

export function mapSpotifyPlaylistTrack(
	playlistTrack: SpotifyPlaylistTrack,
	position: number
): PlaylistTrack | null {
	if (!playlistTrack.track) {
		return null;
	}

	const track = mapSpotifyTrack(playlistTrack.track);
	if (!track) {
		return null;
	}

	return {
		track,
		addedAt: playlistTrack.added_at ? new Date(playlistTrack.added_at) : new Date(),
		position,
	};
}

export function mapSpotifyPlaylist(playlist: SpotifyPlaylist): Playlist | null {
	if (!playlist.id || !playlist.name) {
		return null;
	}

	const artwork = mapSpotifyImages(playlist.images);
	const tracks: PlaylistTrack[] = mapAndFilterWithIndex(
		playlist.tracks.items,
		mapSpotifyPlaylistTrack
	);

	return {
		id: playlist.id,
		name: playlist.name,
		description: playlist.description ?? undefined,
		artwork: artwork.length > 0 ? artwork : undefined,
		tracks,
		createdAt: new Date(),
		updatedAt: new Date(),
		isSmartPlaylist: false,
		isPinned: false,
		source: 'spotify',
	};
}

export function mapSpotifyTracks(tracks: SpotifyTrack[]): Track[] {
	return mapAndFilter(tracks, mapSpotifyTrack);
}

export function mapSpotifySavedTracks(tracks: SpotifySavedTrack[]): Track[] {
	return mapAndFilter(tracks, mapSpotifySavedTrack);
}

export function mapSpotifySimplifiedAlbums(albums: SpotifySimplifiedAlbum[]): Album[] {
	return mapAndFilter(albums, mapSpotifySimplifiedAlbum);
}

export function mapSpotifyArtists(artists: SpotifyArtist[]): Artist[] {
	return mapAndFilter(artists, mapSpotifyArtist);
}

export function mapSpotifySimplifiedPlaylists(playlists: SpotifySimplifiedPlaylist[]): Playlist[] {
	return mapAndFilter(playlists, mapSpotifySimplifiedPlaylist);
}
