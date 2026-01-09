import type { BasePlugin } from './base-plugin';
import type { Result, AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';

/**
 * Metadata provider capabilities
 *
 * Note: Stream URL resolution has been moved to AudioSourceProvider.
 * Use AudioSourceProvider for audio playback capabilities.
 */
export type MetadataCapability =
  | 'search-tracks'         // Can search for tracks
  | 'search-albums'         // Can search for albums
  | 'search-artists'        // Can search for artists
  | 'search-playlists'      // Can search for playlists
  | 'get-track-info'        // Can get detailed track info
  | 'get-album-info'        // Can get detailed album info
  | 'get-artist-info'       // Can get detailed artist info
  | 'get-playlist-info'     // Can get detailed playlist info
  | 'get-album-tracks'      // Can list tracks in an album
  | 'get-artist-albums'     // Can list artist's albums
  | 'get-lyrics'            // Can fetch lyrics
  | 'get-recommendations'   // Can get track recommendations
  | 'get-charts';           // Can get music charts

/**
 * Search filters for refining queries
 */
export interface SearchFilters {
  /** Filter by genre */
  readonly genre?: string;
  /** Filter by year */
  readonly year?: number;
  /** Filter by year range */
  readonly yearRange?: { from: number; to: number };
  /** Filter by duration range (in seconds) */
  readonly durationRange?: { min: number; max: number };
  /** Only explicit content */
  readonly explicit?: boolean;
  /** Minimum popularity (0-100) */
  readonly minPopularity?: number;
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Maximum number of results */
  readonly limit?: number;
  /** Offset for pagination */
  readonly offset?: number;
  /** Search filters */
  readonly filters?: SearchFilters;
  /** Sort order */
  readonly sortBy?: 'relevance' | 'popularity' | 'date' | 'duration' | 'title';
  /** Sort direction */
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Search results
 */
export interface SearchResults<T> {
  /** Search result items */
  readonly items: T[];
  /** Total count of results (if known) */
  readonly total?: number;
  /** Offset used */
  readonly offset: number;
  /** Limit used */
  readonly limit: number;
  /** Whether there are more results */
  readonly hasMore: boolean;
  /** Next page token (if pagination uses tokens) */
  readonly nextPageToken?: string;
}

/**
 * Lyrics line with timestamp
 */
export interface LyricsLine {
  /** Start time in milliseconds */
  readonly startTime: number;
  /** End time in milliseconds (optional) */
  readonly endTime?: number;
  /** Lyrics text */
  readonly text: string;
}

/**
 * Lyrics data
 */
export interface Lyrics {
  /** Track ID these lyrics are for */
  readonly trackId: TrackId;
  /** Lyrics language code (ISO 639-1) */
  readonly language?: string;
  /** Synced lyrics (timestamped lines) */
  readonly syncedLyrics?: LyricsLine[];
  /** Plain text lyrics */
  readonly plainLyrics?: string;
  /** Lyrics source/provider */
  readonly source?: string;
  /** Whether lyrics have been verified */
  readonly isVerified?: boolean;
  /** Attribution text */
  readonly attribution?: string;
}

/**
 * Recommendation seed
 */
export interface RecommendationSeed {
  /** Seed tracks */
  readonly tracks?: TrackId[];
  /** Seed artists */
  readonly artists?: string[];
  /** Seed genres */
  readonly genres?: string[];
}

/**
 * Recommendation tuning parameters
 */
export interface RecommendationParams {
  /** Target energy (0-1) */
  readonly targetEnergy?: number;
  /** Target danceability (0-1) */
  readonly targetDanceability?: number;
  /** Target valence/mood (0-1) */
  readonly targetValence?: number;
  /** Target tempo (BPM) */
  readonly targetTempo?: number;
  /** Target popularity (0-100) */
  readonly targetPopularity?: number;
}

/**
 * Chart type
 */
export type ChartType = 'top-tracks' | 'top-albums' | 'top-artists' | 'trending' | 'new-releases';

/**
 * Chart parameters
 */
export interface ChartParams {
  /** Chart type */
  readonly type: ChartType;
  /** Country/region code (ISO 3166-1 alpha-2) */
  readonly region?: string;
  /** Genre filter */
  readonly genre?: string;
  /** Maximum number of results */
  readonly limit?: number;
}

/**
 * Metadata provider plugin interface
 * Extends BasePlugin with metadata-specific operations
 */
export interface MetadataProvider extends BasePlugin {
  /**
   * Get provider capabilities
   */
  readonly capabilities: Set<MetadataCapability>;

  /**
   * Search for tracks
   */
  searchTracks(
    query: string,
    options?: SearchOptions
  ): AsyncResult<SearchResults<Track>, Error>;

  /**
   * Search for albums
   */
  searchAlbums(
    query: string,
    options?: SearchOptions
  ): AsyncResult<SearchResults<Album>, Error>;

  /**
   * Search for artists
   */
  searchArtists(
    query: string,
    options?: SearchOptions
  ): AsyncResult<SearchResults<Artist>, Error>;

  /**
   * Search for playlists
   */
  searchPlaylists?(
    query: string,
    options?: SearchOptions
  ): AsyncResult<SearchResults<Playlist>, Error>;

  /**
   * Get detailed track information by ID
   */
  getTrackInfo(trackId: TrackId): AsyncResult<Track, Error>;

  /**
   * Get detailed album information by ID
   */
  getAlbumInfo(albumId: string): AsyncResult<Album, Error>;

  /**
   * Get detailed artist information by ID
   */
  getArtistInfo(artistId: string): AsyncResult<Artist, Error>;

  /**
   * Get detailed playlist information by ID
   */
  getPlaylistInfo?(playlistId: string): AsyncResult<Playlist, Error>;

  /**
   * Get tracks for an album
   */
  getAlbumTracks(
    albumId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): AsyncResult<SearchResults<Track>, Error>;

  /**
   * Get albums for an artist
   */
  getArtistAlbums(
    artistId: string,
    options?: Pick<SearchOptions, 'limit' | 'offset'>
  ): AsyncResult<SearchResults<Album>, Error>;

  /**
   * Get lyrics for a track
   */
  getLyrics?(trackId: TrackId): AsyncResult<Lyrics, Error>;

  /**
   * Get track recommendations based on seeds
   */
  getRecommendations?(
    seed: RecommendationSeed,
    params?: RecommendationParams,
    limit?: number
  ): AsyncResult<Track[], Error>;

  /**
   * Get music charts
   */
  getCharts?(params: ChartParams): AsyncResult<Track[] | Album[] | Artist[], Error>;

  /**
   * Batch get track info
   * Efficient way to get multiple tracks at once
   */
  batchGetTracks?(trackIds: TrackId[]): AsyncResult<Track[], Error>;

  /**
   * Batch get album info
   */
  batchGetAlbums?(albumIds: string[]): AsyncResult<Album[], Error>;

  /**
   * Check if a capability is supported
   */
  hasCapability(capability: MetadataCapability): boolean;
}

/**
 * Helper to create a search results object
 */
export function createSearchResults<T>(
  items: T[],
  options: {
    total?: number;
    offset?: number;
    limit?: number;
    hasMore?: boolean;
    nextPageToken?: string;
  } = {}
): SearchResults<T> {
  const offset = options.offset ?? 0;
  const limit = options.limit ?? items.length;

  return {
    items,
    total: options.total,
    offset,
    limit,
    hasMore: options.hasMore ?? (options.total ? offset + items.length < options.total : false),
    nextPageToken: options.nextPageToken,
  };
}

/**
 * Helper to create empty search results
 */
export function emptySearchResults<T>(offset = 0, limit = 0): SearchResults<T> {
  return {
    items: [],
    total: 0,
    offset,
    limit,
    hasMore: false,
  };
}

/**
 * Type guard to check if a plugin is a metadata provider
 */
export function isMetadataProvider(plugin: BasePlugin): plugin is MetadataProvider {
  return (
    plugin.manifest.category === 'metadata-provider' &&
    'searchTracks' in plugin &&
    'getTrackInfo' in plugin &&
    'capabilities' in plugin
  );
}
