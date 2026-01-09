/**
 * Spotify library operations
 *
 * Provides access to user's saved tracks, albums, playlists, and followed artists
 */

import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults, emptySearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { SpotifyClient } from './client';
import {
  mapSpotifySavedTracks,
  mapSpotifyAlbum,
  mapSpotifyArtists,
  mapSpotifySimplifiedPlaylists,
  mapSpotifyPlaylist,
} from './mappers';

/**
 * Library operations interface
 */
export interface LibraryOperations {
  /**
   * Get user's saved tracks
   */
  getSavedTracks(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Result<SearchResults<Track>, Error>>;

  /**
   * Save tracks to user's library
   */
  saveTracks(trackIds: string[]): Promise<Result<void, Error>>;

  /**
   * Remove tracks from user's library
   */
  removeTracks(trackIds: string[]): Promise<Result<void, Error>>;

  /**
   * Check if tracks are saved
   */
  areTracksSaved(trackIds: string[]): Promise<Result<boolean[], Error>>;

  /**
   * Get user's saved albums
   */
  getSavedAlbums(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Result<SearchResults<Album>, Error>>;

  /**
   * Save albums to user's library
   */
  saveAlbums(albumIds: string[]): Promise<Result<void, Error>>;

  /**
   * Remove albums from user's library
   */
  removeAlbums(albumIds: string[]): Promise<Result<void, Error>>;

  /**
   * Get user's playlists
   */
  getUserPlaylists(options?: {
    limit?: number;
    offset?: number;
  }): Promise<Result<SearchResults<Playlist>, Error>>;

  /**
   * Get a playlist by ID with all tracks
   */
  getPlaylist(playlistId: string): Promise<Result<Playlist, Error>>;

  /**
   * Get user's followed artists
   */
  getFollowedArtists(options?: {
    limit?: number;
    after?: string;
  }): Promise<Result<SearchResults<Artist>, Error>>;

  /**
   * Follow artists
   */
  followArtists(artistIds: string[]): Promise<Result<void, Error>>;

  /**
   * Unfollow artists
   */
  unfollowArtists(artistIds: string[]): Promise<Result<void, Error>>;
}

/**
 * Create library operations
 */
export function createLibraryOperations(client: SpotifyClient): LibraryOperations {
  return {
    async getSavedTracks(options?: {
      limit?: number;
      offset?: number;
    }): Promise<Result<SearchResults<Track>, Error>> {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const result = await client.getSavedTracks({ limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { items, total, next } = result.data;
      const mappedTracks = mapSpotifySavedTracks(items);

      return ok(
        createSearchResults(mappedTracks, {
          total,
          offset,
          limit,
          hasMore: next !== null,
        })
      );
    },

    async saveTracks(trackIds: string[]): Promise<Result<void, Error>> {
      return client.saveTracks(trackIds);
    },

    async removeTracks(trackIds: string[]): Promise<Result<void, Error>> {
      return client.removeSavedTracks(trackIds);
    },

    async areTracksSaved(trackIds: string[]): Promise<Result<boolean[], Error>> {
      return client.checkSavedTracks(trackIds);
    },

    async getSavedAlbums(options?: {
      limit?: number;
      offset?: number;
    }): Promise<Result<SearchResults<Album>, Error>> {
      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.getSavedAlbums({ limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { items, total, next } = result.data;
      const mappedAlbums = items
        .map((item) => mapSpotifyAlbum(item.album))
        .filter((album): album is Album => album !== null);

      return ok(
        createSearchResults(mappedAlbums, {
          total,
          offset,
          limit,
          hasMore: next !== null,
        })
      );
    },

    async saveAlbums(albumIds: string[]): Promise<Result<void, Error>> {
      return client.saveAlbums(albumIds);
    },

    async removeAlbums(albumIds: string[]): Promise<Result<void, Error>> {
      return client.removeSavedAlbums(albumIds);
    },

    async getUserPlaylists(options?: {
      limit?: number;
      offset?: number;
    }): Promise<Result<SearchResults<Playlist>, Error>> {
      const limit = options?.limit ?? 50;
      const offset = options?.offset ?? 0;

      const result = await client.getUserPlaylists({ limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { items, total, next } = result.data;
      const mappedPlaylists = mapSpotifySimplifiedPlaylists(items);

      return ok(
        createSearchResults(mappedPlaylists, {
          total,
          offset,
          limit,
          hasMore: next !== null,
        })
      );
    },

    async getPlaylist(playlistId: string): Promise<Result<Playlist, Error>> {
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

    async getFollowedArtists(options?: {
      limit?: number;
      after?: string;
    }): Promise<Result<SearchResults<Artist>, Error>> {
      const limit = options?.limit ?? 50;

      const result = await client.getFollowedArtists({
        limit,
        after: options?.after,
      });

      if (!result.success) {
        return err(result.error);
      }

      const { artists } = result.data;
      const mappedArtists = mapSpotifyArtists(artists.items);

      return ok(
        createSearchResults(mappedArtists, {
          total: artists.total,
          offset: 0,
          limit,
          hasMore: artists.next !== null,
          nextPageToken: artists.cursors?.after ?? undefined,
        })
      );
    },

    async followArtists(artistIds: string[]): Promise<Result<void, Error>> {
      return client.followArtists(artistIds);
    },

    async unfollowArtists(artistIds: string[]): Promise<Result<void, Error>> {
      return client.unfollowArtists(artistIds);
    },
  };
}
