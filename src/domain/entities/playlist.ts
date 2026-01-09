import type { Track } from './track';
import type { Artwork } from '../value-objects/artwork';

/**
 * A track within a playlist, with additional playlist-specific metadata
 */
export interface PlaylistTrack {
  /** The track itself */
  readonly track: Track;
  /** When the track was added to the playlist */
  readonly addedAt: Date;
  /** Position in the playlist (0-indexed) */
  readonly position: number;
}

/**
 * Smart playlist filter rule
 */
export interface PlaylistRule {
  /** Field to filter on */
  readonly field: 'artist' | 'album' | 'genre' | 'year' | 'duration' | 'playCount' | 'addedAt';
  /** Comparison operator */
  readonly operator: 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'between';
  /** Value(s) to compare against */
  readonly value: string | number | [number, number];
}

/**
 * Criteria for smart playlists (auto-generated based on rules)
 */
export interface SmartPlaylistCriteria {
  /** Filter rules (all must match) */
  readonly rules: PlaylistRule[];
  /** Whether all rules must match (AND) or any rule (OR) */
  readonly matchAll: boolean;
  /** Maximum number of tracks */
  readonly limit?: number;
  /** Sort field */
  readonly sortBy?: 'title' | 'artist' | 'album' | 'addedAt' | 'playCount' | 'random';
  /** Sort direction */
  readonly sortDirection?: 'asc' | 'desc';
}

/**
 * Playlist entity representing a collection of tracks
 */
export interface Playlist {
  /** Unique identifier */
  readonly id: string;
  /** Playlist name */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
  /** Playlist artwork/cover images */
  readonly artwork?: Artwork[];
  /** Tracks in this playlist */
  readonly tracks: PlaylistTrack[];
  /** When the playlist was created */
  readonly createdAt: Date;
  /** When the playlist was last modified */
  readonly updatedAt: Date;
  /** Whether this is a smart (auto-generated) playlist */
  readonly isSmartPlaylist: boolean;
  /** Smart playlist criteria (only if isSmartPlaylist is true) */
  readonly smartCriteria?: SmartPlaylistCriteria;
  /** Whether the playlist is pinned/favorited */
  readonly isPinned?: boolean;
  /** Source system (for synced playlists) */
  readonly source?: string;
}

/**
 * Parameters for creating a new playlist
 */
export interface CreatePlaylistParams {
  id?: string;
  name: string;
  description?: string;
  artwork?: Artwork[];
  tracks?: Track[];
  isSmartPlaylist?: boolean;
  smartCriteria?: SmartPlaylistCriteria;
}

/**
 * Generate a unique playlist ID
 */
function generatePlaylistId(): string {
  return `playlist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Factory function to create a Playlist
 */
export function createPlaylist(params: CreatePlaylistParams): Playlist {
  const now = new Date();

  return Object.freeze({
    id: params.id ?? generatePlaylistId(),
    name: params.name,
    description: params.description,
    artwork: params.artwork,
    tracks: (params.tracks ?? []).map((track, index) => ({
      track,
      addedAt: now,
      position: index,
    })),
    createdAt: now,
    updatedAt: now,
    isSmartPlaylist: params.isSmartPlaylist ?? false,
    smartCriteria: params.smartCriteria,
    isPinned: false,
  });
}

/**
 * Add a track to a playlist
 */
export function addTrackToPlaylist(playlist: Playlist, track: Track): Playlist {
  const newTrack: PlaylistTrack = {
    track,
    addedAt: new Date(),
    position: playlist.tracks.length,
  };

  return {
    ...playlist,
    tracks: [...playlist.tracks, newTrack],
    updatedAt: new Date(),
  };
}

/**
 * Remove a track from a playlist by position
 */
export function removeTrackFromPlaylist(playlist: Playlist, position: number): Playlist {
  const newTracks = playlist.tracks
    .filter(t => t.position !== position)
    .map((t, index) => ({ ...t, position: index }));

  return {
    ...playlist,
    tracks: newTracks,
    updatedAt: new Date(),
  };
}

/**
 * Reorder tracks in a playlist
 */
export function reorderPlaylistTracks(
  playlist: Playlist,
  fromIndex: number,
  toIndex: number
): Playlist {
  const tracks = [...playlist.tracks];
  const [moved] = tracks.splice(fromIndex, 1);
  tracks.splice(toIndex, 0, moved);

  // Reassign positions
  const reorderedTracks = tracks.map((t, index) => ({
    ...t,
    position: index,
  }));

  return {
    ...playlist,
    tracks: reorderedTracks,
    updatedAt: new Date(),
  };
}

/**
 * Get total duration of a playlist
 */
export function getPlaylistDuration(playlist: Playlist): number {
  return playlist.tracks.reduce(
    (total, pt) => total + pt.track.duration.totalMilliseconds,
    0
  );
}

/**
 * Get track count
 */
export function getPlaylistTrackCount(playlist: Playlist): number {
  return playlist.tracks.length;
}
