/**
 * Spotify Library Metadata Provider Plugin
 *
 * Provides access to Spotify's catalog and user library including playlists,
 * saved tracks, albums, and followed artists.
 */

import type {
  MetadataCapability,
  MetadataProvider,
  RecommendationParams,
  RecommendationSeed,
  SearchOptions,
  SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

import {
  type SpotifyConfig,
  DEFAULT_CONFIG,
  PLUGIN_MANIFEST,
  CONFIG_SCHEMA,
  METADATA_CAPABILITIES,
} from './config';
import { SpotifyClient, createSpotifyClient } from './client';
import { createSearchOperations, type SearchOperations } from './search';
import { createInfoOperations, type InfoOperations } from './info';
import { createLibraryOperations, type LibraryOperations } from './library';
import { createRecommendationOperations, type RecommendationOperations } from './recommendations';

/**
 * Extended Spotify Provider with library-specific operations
 */
export interface SpotifyLibraryProvider extends MetadataProvider {
  /**
   * Library operations for managing user's saved content
   */
  readonly library: LibraryOperations;

  /**
   * Get the Spotify client for advanced operations
   */
  getClient(): SpotifyClient;

  /**
   * Check if the user is authenticated
   */
  isAuthenticated(): boolean;

  /**
   * Get the authorization URL for OAuth flow
   */
  getAuthorizationUrl(state: string): string;

  /**
   * Exchange authorization code for tokens
   */
  exchangeAuthorizationCode(code: string): Promise<Result<void, Error>>;

  /**
   * Logout and clear tokens
   */
  logout(): Promise<Result<void, Error>>;
}

/**
 * Spotify Provider implementation
 */
export class SpotifyProvider implements SpotifyLibraryProvider {
  readonly manifest = PLUGIN_MANIFEST;
  readonly configSchema = CONFIG_SCHEMA;
  readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);

  status: PluginStatus = 'uninitialized';

  private config: SpotifyConfig;
  private client: SpotifyClient | null = null;
  private searchOps: SearchOperations | null = null;
  private infoOps: InfoOperations | null = null;
  private libraryOps: LibraryOperations | null = null;
  private recommendationOps: RecommendationOperations | null = null;

  constructor(config: SpotifyConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config } as SpotifyConfig;
  }

  /**
   * Get library operations
   */
  get library(): LibraryOperations {
    if (!this.libraryOps) {
      throw new Error('Plugin not initialized');
    }
    return this.libraryOps;
  }

  async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
    try {
      this.status = 'initializing';

      const mergedConfig: SpotifyConfig = {
        ...this.config,
        clientId: (context.config.clientId as string) || this.config.clientId,
        clientSecret: (context.config.clientSecret as string) || this.config.clientSecret,
        redirectUri: (context.config.redirectUri as string) || this.config.redirectUri,
        market: (context.config.market as string) || this.config.market,
      };

      this.client = createSpotifyClient(mergedConfig);
      this.searchOps = createSearchOperations(this.client);
      this.infoOps = createInfoOperations(this.client);
      this.libraryOps = createLibraryOperations(this.client);
      this.recommendationOps = createRecommendationOperations(this.client);

      await this.client.initialize();

      this.status = 'ready';
      return ok(undefined);
    } catch (error) {
      this.status = 'error';
      return err(
        error instanceof Error
          ? error
          : new Error(`Failed to initialize Spotify client: ${String(error)}`)
      );
    }
  }

  async onActivate(): Promise<Result<void, Error>> {
    this.status = 'active';
    return ok(undefined);
  }

  async onDeactivate(): Promise<Result<void, Error>> {
    this.status = 'ready';
    return ok(undefined);
  }

  async onDestroy(): Promise<Result<void, Error>> {
    this.client?.destroy();
    this.client = null;
    this.searchOps = null;
    this.infoOps = null;
    this.libraryOps = null;
    this.recommendationOps = null;
    this.status = 'uninitialized';
    return ok(undefined);
  }

  hasCapability(capability: MetadataCapability): boolean {
    return this.capabilities.has(capability);
  }

  getClient(): SpotifyClient {
    if (!this.client) {
      throw new Error('Plugin not initialized');
    }
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.client?.isAuthenticated() ?? false;
  }

  getAuthorizationUrl(state: string): string {
    if (!this.client) {
      throw new Error('Plugin not initialized');
    }
    return this.client.getAuthManager().getAuthorizationUrl(state);
  }

  async exchangeAuthorizationCode(code: string): Promise<Result<void, Error>> {
    if (!this.client) {
      return err(new Error('Plugin not initialized'));
    }
    return this.client.getAuthManager().exchangeCode(code);
  }

  async logout(): Promise<Result<void, Error>> {
    if (!this.client) {
      return err(new Error('Plugin not initialized'));
    }
    return this.client.getAuthManager().logout();
  }

  // Search operations
  searchTracks(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Track>, Error>> {
    if (!this.searchOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.searchOps.searchTracks(query, options);
  }

  searchAlbums(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Album>, Error>> {
    if (!this.searchOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.searchOps.searchAlbums(query, options);
  }

  searchArtists(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Artist>, Error>> {
    if (!this.searchOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.searchOps.searchArtists(query, options);
  }

  searchPlaylists(
    query: string,
    options?: SearchOptions
  ): Promise<Result<SearchResults<Playlist>, Error>> {
    if (!this.searchOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.searchOps.searchPlaylists(query, options);
  }

  // Info operations
  getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getTrackInfo(trackId);
  }

  getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getAlbumInfo(albumId);
  }

  getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getArtistInfo(artistId);
  }

  getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getPlaylistInfo(playlistId);
  }

  getAlbumTracks(
    albumId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): Promise<Result<SearchResults<Track>, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getAlbumTracks(albumId, options);
  }

  getArtistAlbums(
    artistId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): Promise<Result<SearchResults<Album>, Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.getArtistAlbums(artistId, options);
  }

  // Batch operations
  batchGetTracks(trackIds: TrackId[]): Promise<Result<Track[], Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.batchGetTracks(trackIds);
  }

  batchGetAlbums(albumIds: string[]): Promise<Result<Album[], Error>> {
    if (!this.infoOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.infoOps.batchGetAlbums(albumIds);
  }

  // Recommendation operations
  getRecommendations(
    seed: RecommendationSeed,
    params?: RecommendationParams,
    limit?: number
  ): Promise<Result<Track[], Error>> {
    if (!this.recommendationOps) {
      return Promise.resolve(err(new Error('Plugin not initialized')));
    }
    return this.recommendationOps.getRecommendations(seed, params, limit);
  }
}

/**
 * Create a Spotify provider instance
 */
export function createSpotifyProvider(config: SpotifyConfig): SpotifyProvider {
  return new SpotifyProvider(config);
}
