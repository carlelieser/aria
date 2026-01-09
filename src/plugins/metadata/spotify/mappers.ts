/**
 * Spotify data mappers
 *
 * Maps Spotify API responses to domain entities
 */

import type { Track, CreateTrackParams } from '@domain/entities/track';
import type { Album, AlbumType } from '@domain/entities/album';
import type { Artist, ArtistReference } from '@domain/entities/artist';
import type { Playlist, PlaylistTrack } from '@domain/entities/playlist';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createArtwork, type Artwork } from '@domain/value-objects/artwork';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import { createTrack } from '@domain/entities/track';
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

/**
 * Map Spotify images to Artwork array
 */
export function mapSpotifyImages(images?: SpotifyImage[]): Artwork[] {
  if (!images || images.length === 0) {
    return [];
  }

  return images
    .filter((img) => img.url)
    .map((img) =>
      createArtwork(
        img.url,
        img.width ?? undefined,
        img.height ?? undefined
      )
    );
}

/**
 * Map Spotify simplified artist to ArtistReference
 */
export function mapSpotifyArtistReference(
  artist: SpotifySimplifiedArtist
): ArtistReference {
  return {
    id: artist.id,
    name: artist.name,
  };
}

/**
 * Map array of Spotify simplified artists to ArtistReference array
 */
export function mapSpotifyArtistReferences(
  artists?: SpotifySimplifiedArtist[]
): ArtistReference[] {
  if (!artists || artists.length === 0) {
    return [{ id: 'unknown', name: 'Unknown Artist' }];
  }

  return artists.map(mapSpotifyArtistReference);
}

/**
 * Map Spotify album type to domain AlbumType
 */
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

/**
 * Map Spotify simplified track to Track entity
 */
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
      id: album.id,
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

/**
 * Map Spotify full track to Track entity
 */
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
      id: track.album.id,
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

/**
 * Map Spotify saved track to Track entity with addedAt
 */
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

/**
 * Map Spotify simplified album to Album entity
 */
export function mapSpotifySimplifiedAlbum(album: SpotifySimplifiedAlbum): Album | null {
  if (!album.id || !album.name) {
    return null;
  }

  const artists = mapSpotifyArtistReferences(album.artists);
  const artwork = mapSpotifyImages(album.images);

  return {
    id: album.id,
    name: album.name,
    artists,
    artwork: artwork.length > 0 ? artwork : undefined,
    releaseDate: album.release_date,
    trackCount: album.total_tracks,
    albumType: mapAlbumType(album.album_type),
  };
}

/**
 * Map Spotify full album to Album entity
 */
export function mapSpotifyAlbum(album: SpotifyAlbum): Album | null {
  if (!album.id || !album.name) {
    return null;
  }

  const artists = mapSpotifyArtistReferences(album.artists);
  const artwork = mapSpotifyImages(album.images);
  const copyrights = album.copyrights?.map((c) => c.text) ?? [];

  return {
    id: album.id,
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

/**
 * Map Spotify artist to Artist entity
 */
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

/**
 * Map Spotify simplified playlist to Playlist entity
 */
export function mapSpotifySimplifiedPlaylist(
  playlist: SpotifySimplifiedPlaylist
): Playlist | null {
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

/**
 * Map Spotify playlist track to PlaylistTrack
 */
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

/**
 * Map Spotify full playlist to Playlist entity
 */
export function mapSpotifyPlaylist(playlist: SpotifyPlaylist): Playlist | null {
  if (!playlist.id || !playlist.name) {
    return null;
  }

  const artwork = mapSpotifyImages(playlist.images);
  const tracks: PlaylistTrack[] = playlist.tracks.items
    .map((item, index) => mapSpotifyPlaylistTrack(item, index))
    .filter((t): t is PlaylistTrack => t !== null);

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

/**
 * Map array of Spotify tracks to Track array, filtering out nulls
 */
export function mapSpotifyTracks(tracks: SpotifyTrack[]): Track[] {
  return tracks
    .map(mapSpotifyTrack)
    .filter((track): track is Track => track !== null);
}

/**
 * Map array of Spotify saved tracks to Track array, filtering out nulls
 */
export function mapSpotifySavedTracks(tracks: SpotifySavedTrack[]): Track[] {
  return tracks
    .map(mapSpotifySavedTrack)
    .filter((track): track is Track => track !== null);
}

/**
 * Map array of Spotify simplified albums to Album array, filtering out nulls
 */
export function mapSpotifySimplifiedAlbums(albums: SpotifySimplifiedAlbum[]): Album[] {
  return albums
    .map(mapSpotifySimplifiedAlbum)
    .filter((album): album is Album => album !== null);
}

/**
 * Map array of Spotify artists to Artist array, filtering out nulls
 */
export function mapSpotifyArtists(artists: SpotifyArtist[]): Artist[] {
  return artists
    .map(mapSpotifyArtist)
    .filter((artist): artist is Artist => artist !== null);
}

/**
 * Map array of Spotify simplified playlists to Playlist array, filtering out nulls
 */
export function mapSpotifySimplifiedPlaylists(
  playlists: SpotifySimplifiedPlaylist[]
): Playlist[] {
  return playlists
    .map(mapSpotifySimplifiedPlaylist)
    .filter((playlist): playlist is Playlist => playlist !== null);
}
