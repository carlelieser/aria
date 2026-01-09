import type { Playlist } from '../entities/playlist';
import type { Track } from '../entities/track';
import type { TrackId } from '../value-objects/track-id';
import type { Result } from '../../shared/types';

/** Async result type for repository operations */
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Playlist repository interface for managing playlists.
 */
export interface PlaylistRepository {
  /**
   * Find a playlist by ID
   */
  findById(id: string): AsyncResult<Playlist | null>;

  /**
   * Find all playlists
   */
  findAll(): AsyncResult<Playlist[]>;

  /**
   * Find pinned/favorite playlists
   */
  findPinned(): AsyncResult<Playlist[]>;

  /**
   * Create a new playlist
   */
  create(name: string, tracks?: Track[]): AsyncResult<Playlist>;

  /**
   * Save/update a playlist
   */
  save(playlist: Playlist): AsyncResult<void>;

  /**
   * Delete a playlist by ID
   */
  delete(id: string): AsyncResult<void>;

  /**
   * Add a track to a playlist
   */
  addTrack(playlistId: string, track: Track): AsyncResult<Playlist>;

  /**
   * Remove a track from a playlist by position
   */
  removeTrack(playlistId: string, position: number): AsyncResult<Playlist>;

  /**
   * Reorder tracks in a playlist
   */
  reorderTracks(
    playlistId: string,
    fromIndex: number,
    toIndex: number
  ): AsyncResult<Playlist>;

  /**
   * Set pinned status for a playlist
   */
  setPinned(id: string, isPinned: boolean): AsyncResult<void>;

  /**
   * Update playlist name
   */
  rename(id: string, name: string): AsyncResult<void>;

  /**
   * Find playlists containing a specific track
   */
  findByTrack(trackId: TrackId): AsyncResult<Playlist[]>;
}
