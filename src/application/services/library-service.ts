import type { Track } from '../../domain/entities/track';
import type { Playlist } from '../../domain/entities/playlist';
import { useLibraryStore } from '../state/library-store';

/**
 * Service for managing the user's music library
 * Provides methods for adding, removing, and querying library content
 */
export class LibraryService {
  /**
   * Check if a track is in the library
   */
  isInLibrary(trackId: string): boolean {
    const tracks = useLibraryStore.getState().tracks;
    return tracks.some((t) => t.id.value === trackId);
  }

  /**
   * Add a track to the library
   */
  addTrack(track: Track): void {
    useLibraryStore.getState().addTrack(track);
  }

  /**
   * Add multiple tracks to the library
   */
  addTracks(tracks: Track[]): void {
    useLibraryStore.getState().addTracks(tracks);
  }

  /**
   * Remove a track from the library
   */
  removeTrack(trackId: string): void {
    useLibraryStore.getState().removeTrack(trackId);
  }

  /**
   * Toggle a track's favorite status
   */
  toggleFavorite(trackId: string): void {
    useLibraryStore.getState().toggleFavorite(trackId);
  }

  /**
   * Check if a track is favorited
   */
  isFavorite(trackId: string): boolean {
    return useLibraryStore.getState().isFavorite(trackId);
  }

  /**
   * Get all tracks in the library
   */
  getTracks(): Track[] {
    return useLibraryStore.getState().tracks;
  }

  /**
   * Get a track by ID
   */
  getTrackById(trackId: string): Track | undefined {
    return useLibraryStore.getState().getTrackById(trackId);
  }

  /**
   * Get all favorited tracks
   */
  getFavoriteTracks(): Track[] {
    return useLibraryStore.getState().getFavoriteTracks();
  }

  /**
   * Get all playlists
   */
  getPlaylists(): Playlist[] {
    return useLibraryStore.getState().playlists;
  }

  /**
   * Add a playlist to the library
   */
  addPlaylist(playlist: Playlist): void {
    useLibraryStore.getState().addPlaylist(playlist);
  }

  /**
   * Remove a playlist from the library
   */
  removePlaylist(playlistId: string): void {
    useLibraryStore.getState().removePlaylist(playlistId);
  }

  /**
   * Update a playlist
   */
  updatePlaylist(playlistId: string, updates: Partial<Playlist>): void {
    useLibraryStore.getState().updatePlaylist(playlistId, updates);
  }
}

/** Singleton service instance */
export const libraryService = new LibraryService();
