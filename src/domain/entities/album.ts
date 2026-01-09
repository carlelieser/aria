import type { ArtistReference } from './artist';
import type { Artwork } from '../value-objects/artwork';

/**
 * Album type classification
 */
export type AlbumType = 'album' | 'single' | 'ep' | 'compilation';

/**
 * Album entity representing a music album.
 */
export interface Album {
  /** Unique identifier within the source system */
  readonly id: string;
  /** Album name/title */
  readonly name: string;
  /** Artists who created this album */
  readonly artists: ArtistReference[];
  /** Album artwork/cover images */
  readonly artwork?: Artwork[];
  /** Release date (ISO 8601 format or year string) */
  readonly releaseDate?: string;
  /** Number of tracks in the album */
  readonly trackCount?: number;
  /** Total duration in milliseconds */
  readonly totalDurationMs?: number;
  /** Album type classification */
  readonly albumType?: AlbumType;
  /** Musical genres */
  readonly genres?: string[];
  /** Copyright information */
  readonly copyrights?: string[];
}

/**
 * Minimal album reference used in Track entity.
 */
export interface AlbumReference {
  readonly id: string;
  readonly name: string;
}

/**
 * Create an album reference from a full album
 */
export function toAlbumReference(album: Album): AlbumReference {
  return {
    id: album.id,
    name: album.name,
  };
}

/**
 * Extract release year from album
 */
export function getAlbumYear(album: Album): number | undefined {
  if (!album.releaseDate) return undefined;

  // Handle various formats: "2024", "2024-01-15", etc.
  const year = parseInt(album.releaseDate.substring(0, 4), 10);
  return isNaN(year) ? undefined : year;
}
