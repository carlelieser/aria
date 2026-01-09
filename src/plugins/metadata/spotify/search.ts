/**
 * Spotify search operations
 */

import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { SearchOptions, SearchResults } from '@plugins/core/interfaces/metadata-provider';
import { createSearchResults, emptySearchResults } from '@plugins/core/interfaces/metadata-provider';
import type { SpotifyClient } from './client';
import {
  mapSpotifyTracks,
  mapSpotifySimplifiedAlbums,
  mapSpotifyArtists,
  mapSpotifySimplifiedPlaylists,
} from './mappers';

/**
 * Search operations interface
 */
export interface SearchOperations {
  searchTracks(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Track>, Error>>;

  searchAlbums(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Album>, Error>>;

  searchArtists(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Artist>, Error>>;

  searchPlaylists(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Playlist>, Error>>;
}

/**
 * Create search operations
 */
export function createSearchOperations(client: SpotifyClient): SearchOperations {
  return {
    async searchTracks(
      query: string,
      options?: SearchOptions
    ): Promise<Result<SearchResults<Track>, Error>> {
      if (!query.trim()) {
        return ok(emptySearchResults<Track>(options?.offset ?? 0, options?.limit ?? 20));
      }

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.search(query, ['track'], { limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { tracks } = result.data;
      if (!tracks) {
        return ok(emptySearchResults<Track>(offset, limit));
      }

      const mappedTracks = mapSpotifyTracks(tracks.items);

      return ok(
        createSearchResults(mappedTracks, {
          total: tracks.total,
          offset: tracks.offset,
          limit: tracks.limit,
          hasMore: tracks.next !== null,
        })
      );
    },

    async searchAlbums(
      query: string,
      options?: SearchOptions
    ): Promise<Result<SearchResults<Album>, Error>> {
      if (!query.trim()) {
        return ok(emptySearchResults<Album>(options?.offset ?? 0, options?.limit ?? 20));
      }

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.search(query, ['album'], { limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { albums } = result.data;
      if (!albums) {
        return ok(emptySearchResults<Album>(offset, limit));
      }

      const mappedAlbums = mapSpotifySimplifiedAlbums(albums.items);

      return ok(
        createSearchResults(mappedAlbums, {
          total: albums.total,
          offset: albums.offset,
          limit: albums.limit,
          hasMore: albums.next !== null,
        })
      );
    },

    async searchArtists(
      query: string,
      options?: SearchOptions
    ): Promise<Result<SearchResults<Artist>, Error>> {
      if (!query.trim()) {
        return ok(emptySearchResults<Artist>(options?.offset ?? 0, options?.limit ?? 20));
      }

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.search(query, ['artist'], { limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { artists } = result.data;
      if (!artists) {
        return ok(emptySearchResults<Artist>(offset, limit));
      }

      const mappedArtists = mapSpotifyArtists(artists.items);

      return ok(
        createSearchResults(mappedArtists, {
          total: artists.total,
          offset: artists.offset,
          limit: artists.limit,
          hasMore: artists.next !== null,
        })
      );
    },

    async searchPlaylists(
      query: string,
      options?: SearchOptions
    ): Promise<Result<SearchResults<Playlist>, Error>> {
      if (!query.trim()) {
        return ok(emptySearchResults<Playlist>(options?.offset ?? 0, options?.limit ?? 20));
      }

      const limit = options?.limit ?? 20;
      const offset = options?.offset ?? 0;

      const result = await client.search(query, ['playlist'], { limit, offset });

      if (!result.success) {
        return err(result.error);
      }

      const { playlists } = result.data;
      if (!playlists) {
        return ok(emptySearchResults<Playlist>(offset, limit));
      }

      const mappedPlaylists = mapSpotifySimplifiedPlaylists(playlists.items);

      return ok(
        createSearchResults(mappedPlaylists, {
          total: playlists.total,
          offset: playlists.offset,
          limit: playlists.limit,
          hasMore: playlists.next !== null,
        })
      );
    },
  };
}
