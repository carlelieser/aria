import type { Track } from '../entities/track';
import type { TrackId } from '../value-objects/track-id';
import type { Result } from '../../shared/types';

/** Async result type for repository operations */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Options for searching tracks
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Filter by sources */
  sources?: string[];
  /** Filter by types */
  types?: ('track' | 'album' | 'artist')[];
}

/**
 * Search result with pagination info
 */
export interface SearchResult {
  /** Found tracks */
  tracks: Track[];
  /** Whether more results are available */
  hasMore: boolean;
  /** Total number of results (if known) */
  total?: number;
}

/**
 * Track repository interface for accessing track data.
 * Implementations may store tracks locally or fetch from remote sources.
 */
export interface TrackRepository {
  /**
   * Find a track by its ID
   */
  findById(id: TrackId): AsyncResult<Track | null>;

  /**
   * Find multiple tracks by their IDs
   */
  findByIds(ids: TrackId[]): AsyncResult<Track[]>;

  /**
   * Find all tracks in the library
   */
  findAll(): AsyncResult<Track[]>;

  /**
   * Find tracks by album ID
   */
  findByAlbum(albumId: string): AsyncResult<Track[]>;

  /**
   * Find tracks by artist ID
   */
  findByArtist(artistId: string): AsyncResult<Track[]>;

  /**
   * Find favorite tracks
   */
  findFavorites(): AsyncResult<Track[]>;

  /**
   * Find recently played tracks
   */
  findRecentlyPlayed(limit: number): AsyncResult<Track[]>;

  /**
   * Save a track to the repository
   */
  save(track: Track): AsyncResult<void>;

  /**
   * Save multiple tracks
   */
  saveMany(tracks: Track[]): AsyncResult<void>;

  /**
   * Delete a track by ID
   */
  delete(id: TrackId): AsyncResult<void>;

  /**
   * Update play count for a track
   */
  updatePlayCount(id: TrackId): AsyncResult<void>;

  /**
   * Set favorite status for a track
   */
  setFavorite(id: TrackId, isFavorite: boolean): AsyncResult<void>;
}
