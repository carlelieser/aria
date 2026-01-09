import type { Track } from '../entities/track';
import type { Album } from '../entities/album';
import type { Artist } from '../entities/artist';
import type { Playlist } from '../entities/playlist';
import type { Result } from '../../shared/types';

/** Async result type for repository operations */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Library statistics
 */
export interface LibraryStats {
  /** Total number of tracks */
  trackCount: number;
  /** Total number of albums */
  albumCount: number;
  /** Total number of artists */
  artistCount: number;
  /** Total number of playlists */
  playlistCount: number;
  /** Total playback duration in milliseconds */
  totalDurationMs: number;
  /** Total size in bytes (for local files) */
  totalSizeBytes?: number;
}

/**
 * Library snapshot for export/backup
 */
export interface LibrarySnapshot {
  /** Export timestamp */
  exportedAt: Date;
  /** App version */
  appVersion: string;
  /** All tracks */
  tracks: Track[];
  /** All playlists */
  playlists: Playlist[];
  /** Favorite track IDs */
  favoriteIds: string[];
  /** Recent play history */
  recentlyPlayed: { trackId: string; playedAt: Date }[];
}

/**
 * Library repository interface for library-wide operations.
 */
export interface LibraryRepository {
  /**
   * Get library statistics
   */
  getStats(): AsyncResult<LibraryStats>;

  /**
   * Get all tracks grouped by album
   */
  getTracksByAlbum(): AsyncResult<Map<string, Track[]>>;

  /**
   * Get all tracks grouped by artist
   */
  getTracksByArtist(): AsyncResult<Map<string, Track[]>>;

  /**
   * Get all unique albums in the library
   */
  getAlbums(): AsyncResult<Album[]>;

  /**
   * Get all unique artists in the library
   */
  getArtists(): AsyncResult<Artist[]>;

  /**
   * Search across all content types
   */
  search(query: string): AsyncResult<{
    tracks: Track[];
    albums: Album[];
    artists: Artist[];
    playlists: Playlist[];
  }>;

  /**
   * Export library as a snapshot
   */
  exportLibrary(): AsyncResult<LibrarySnapshot>;

  /**
   * Import library from a snapshot
   */
  importLibrary(
    snapshot: LibrarySnapshot,
    options?: { merge?: boolean; overwrite?: boolean }
  ): AsyncResult<{ imported: number; skipped: number; errors: string[] }>;

  /**
   * Clear all library data
   */
  clear(): AsyncResult<void>;

  /**
   * Record a track play
   */
  recordPlay(trackId: string): AsyncResult<void>;

  /**
   * Get play history
   */
  getPlayHistory(limit: number): AsyncResult<{ track: Track; playedAt: Date }[]>;
}
