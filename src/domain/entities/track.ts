import type { ArtistReference } from './artist';
import type { AlbumReference } from './album';
import type { TrackId } from '../value-objects/track-id';
import type { Duration } from '../value-objects/duration';
import type { Artwork } from '../value-objects/artwork';
import type { AudioSource } from '../value-objects/audio-source';

/**
 * Additional track metadata
 */
export interface TrackMetadata {
  /** Musical genre */
  readonly genre?: string;
  /** Release year */
  readonly year?: number;
  /** Track number within album */
  readonly trackNumber?: number;
  /** Disc number for multi-disc albums */
  readonly discNumber?: number;
  /** Beats per minute */
  readonly bpm?: number;
  /** Audio bitrate in kbps */
  readonly bitrate?: number;
  /** Sample rate in Hz */
  readonly sampleRate?: number;
  /** International Standard Recording Code */
  readonly isrc?: string;
  /** Whether the track has explicit content */
  readonly explicit?: boolean;
  /** Popularity score (0-100, if available) */
  readonly popularity?: number;
}

/**
 * Track entity representing a single music track/song.
 * This is the core entity of the application.
 */
export interface Track {
  /** Unique composite identifier (source:id format) */
  readonly id: TrackId;
  /** Track title */
  readonly title: string;
  /** Artists who performed this track */
  readonly artists: ArtistReference[];
  /** Album this track belongs to (optional for singles) */
  readonly album?: AlbumReference;
  /** Track duration */
  readonly duration: Duration;
  /** Track artwork/cover images */
  readonly artwork?: Artwork[];
  /** Audio source information */
  readonly source: AudioSource;
  /** Additional metadata */
  readonly metadata: TrackMetadata;
  /** When the track was added to library (if applicable) */
  readonly addedAt?: Date;
  /** Number of times this track has been played */
  readonly playCount?: number;
  /** Whether this track is favorited */
  readonly isFavorite?: boolean;
}

/**
 * Parameters for creating a new Track
 */
export interface CreateTrackParams {
  id: TrackId;
  title: string;
  artists: ArtistReference[];
  album?: AlbumReference;
  duration: Duration;
  artwork?: Artwork[];
  source: AudioSource;
  metadata?: Partial<TrackMetadata>;
}

/**
 * Factory function to create a Track entity
 */
export function createTrack(params: CreateTrackParams): Track {
  return Object.freeze({
    id: params.id,
    title: params.title,
    artists: params.artists,
    album: params.album,
    duration: params.duration,
    artwork: params.artwork,
    source: params.source,
    metadata: params.metadata ?? {},
    addedAt: undefined,
    playCount: 0,
    isFavorite: false,
  });
}

/**
 * Get the primary artist name for display
 */
export function getPrimaryArtist(track: Track): string {
  return track.artists[0]?.name ?? 'Unknown Artist';
}

/**
 * Get all artist names formatted for display
 */
export function getArtistNames(track: Track): string {
  if (track.artists.length === 0) return 'Unknown Artist';
  return track.artists.map(a => a.name).join(', ');
}

/**
 * Get the best available artwork URL
 */
export function getArtworkUrl(track: Track, preferredSize?: number): string | undefined {
  if (!track.artwork || track.artwork.length === 0) {
    return undefined;
  }

  if (preferredSize === undefined) {
    // Return the largest available
    return track.artwork.reduce((best, current) => {
      const bestSize = (best.width ?? 0) * (best.height ?? 0);
      const currentSize = (current.width ?? 0) * (current.height ?? 0);
      return currentSize > bestSize ? current : best;
    }).url;
  }

  // Find the closest to preferred size
  return track.artwork.reduce((best, current) => {
    const bestDiff = Math.abs((best.width ?? 0) - preferredSize);
    const currentDiff = Math.abs((current.width ?? 0) - preferredSize);
    return currentDiff < bestDiff ? current : best;
  }).url;
}
