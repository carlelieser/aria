/**
 * Spotify info operations
 *
 * Provides detailed information for tracks, albums, artists, and playlists
 */

import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { SpotifyClient } from './client';
import {
  mapSpotifyTrack,
  mapSpotifyTracks,
  mapSpotifyAlbum,
  mapSpotifySimplifiedAlbums,
  mapSpotifyArtist,
  mapSpotifyPlaylist,
  mapSpotifySimplifiedTrack,
} from './mappers';

/**
 * Info operations interface
 */
export interface InfoOperations {
  /**
   * Get detailed track info
   */
  getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>>;

  /**
   * Get multiple tracks at once
   */
  batchGetTracks(trackIds: TrackId[]): Promise<Result<Track[], Error>>;

  /**
   * Get detailed album info
   */
  getAlbumInfo(albumId: string): Promise<Result<Album, Error>>;

  /**
   * Get multiple albums at once
   */
  batchGetAlbums(albumIds: string[]): Promise<Result<Album[], Error>>;

  /**
   * Get tracks for an album
   */
  getAlbumTracks(
    albumId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): Promise<Result<SearchResults<Track>, Error>>;

  /**
   * Get detailed artist info
   */
  getArtistInfo(artistId: string): Promise<Result<Artist, Error>>;

  /**
   * Get albums for an artist
   */
  getArtistAlbums(
    artistId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): Promise<Result<SearchResults<Album>, Error>>;

  /**
   * Get artist's top tracks
   */
  getArtistTopTracks(artistId: string): Promise<Result<Track[], Error>>;

  /**
   * Get detailed playlist info
   */
  getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>>;
}

/**
 * Create info operations
 */
export function createInfoOperations(client: SpotifyClient): InfoOperations {
  return {
    async getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
      if (trackId.sourceType !== 'spotify') {
        return err(new Error(`Invalid source type: ${trackId.sourceType}`));
      }

      const result = await client.getTrack(trackId.sourceId);

      if (!result.success) {
        return err(result.error);
      }

      const track = mapSpotifyTrack(result.data);
      if (!track) {
        return err(new Error('Failed to map track'));
      }

      return ok(track);
    },

    async batchGetTracks(trackIds: TrackId[]): Promise<Result<Track[], Error>> {
      const spotifyIds = trackIds
        .filter((id) => id.sourceType === 'spotify')
        .map((id) => id.sourceId);

      if (spotifyIds.length === 0) {
        return ok([]);
      }

      const result = await client.getTracks(spotifyIds);

      if (!result.success) {
        return err(result.error);
      }

      const tracks = mapSpotifyTracks(result.data.tracks.filter(Boolean));
      return ok(tracks);
    },

    async getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
      const result = await client.getAlbum(albumId);

      if (!result.success) {
        return err(result.error);
      }

      const album = mapSpotifyAlbum(result.data);
      if (!album) {
        return err(new Error('Failed to map album'));
      }

      return ok(album);
    },

    async batchGetAlbums(albumIds: string[]): Promise<Result<Album[], Error>> {
      if (albumIds.length === 0) {
        return ok([]);
      }

      const result = await client.getAlbums(albumIds);

      if (!result.success) {
        return err(result.error);
      }

      const albums = result.data.albums
        .filter(Boolean)
        .map(mapSpotifyAlbum)
        .filter((album): album is Album => album !== null);

      return ok(albums);
    },

    async getAlbumTracks(
      albumId: string,
      options?: Pick<SearchOptions, 'limit' | 'offset'>
    ): Promise<Result<SearchResults<Track>, Error>> {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const [albumResult, tracksResult] = await Promise.all([
        client.getAlbum(albumId),
        client.getAlbumTracks(albumId, { limit, offset }),
      ]);

      if (!albumResult.success) {
        return err(albumResult.error);
      }

      if (!tracksResult.success) {
        return err(tracksResult.error);
      }

      const album = albumResult.data;
      const { items, total, next } = tracksResult.data;

      const tracks = items
        .map((item) => mapSpotifySimplifiedTrack(item, album))
        .filter((track): track is Track => track !== null);

      return ok(
        createSearchResults(tracks, {
          total,
          offset,
          limit,
          hasMore: next !== null,
        })
      );
    },

    async getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
      const result = await client.getArtist(artistId);

      if (!result.success) {
        return err(result.error);
      }

      const artist = mapSpotifyArtist(result.data);
      if (!artist) {
        return err(new Error('Failed to map artist'));
      }

      return ok(artist);
    },

    async getArtistAlbums(
      artistId: string,
      options?: Pick<SearchOptions, 'limit' | 'offset'>
    ): Promise<Result<SearchResults<Album>, Error>> {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.getArtistAlbums(artistId, {
        include_groups: ['album', 'single'],
        limit,
        offset,
      });

      if (!result.success) {
        return err(result.error);
      }

      const { items, total, next } = result.data;
      const albums = mapSpotifySimplifiedAlbums(items);

      return ok(
        createSearchResults(albums, {
          total,
          offset,
          limit,
          hasMore: next !== null,
        })
      );
    },

    async getArtistTopTracks(artistId: string): Promise<Result<Track[], Error>> {
      const result = await client.getArtistTopTracks(artistId);

      if (!result.success) {
        return err(result.error);
      }

      const tracks = mapSpotifyTracks(result.data.tracks);
      return ok(tracks);
    },

    async getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>> {
      const result = await client.getPlaylist(playlistId);

      if (!result.success) {
        return err(result.error);
      }

      const playlist = mapSpotifyPlaylist(result.data);
      if (!playlist) {
        return err(new Error('Failed to map playlist'));
      }

      return ok(playlist);
    },
  };
}
