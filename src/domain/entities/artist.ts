import type { Artwork } from '../value-objects/artwork';

/**
 * Artist entity representing a music artist or band.
 */
export interface Artist {
  /** Unique identifier within the source system */
  readonly id: string;
  /** Artist/band name */
  readonly name: string;
  /** Artist artwork/profile images */
  readonly artwork?: Artwork[];
  /** Musical genres associated with the artist */
  readonly genres?: string[];
  /** Artist biography or description */
  readonly bio?: string;
  /** Monthly listener count (if available from source) */
  readonly monthlyListeners?: number;
  /** External URLs (social media, website, etc.) */
  readonly externalUrls?: Record<string, string>;
}

/**
 * Minimal artist reference used in Track and Album entities.
 * Contains only the essential fields for display purposes.
 */
export interface ArtistReference {
  readonly id: string;
  readonly name: string;
}

/**
 * Create an artist reference from a full artist
 */
export function toArtistReference(artist: Artist): ArtistReference {
  return {
    id: artist.id,
    name: artist.name,
  };
}

/**
 * Format multiple artist names for display
 */
export function formatArtistNames(artists: ArtistReference[]): string {
  if (artists.length === 0) return 'Unknown Artist';
  if (artists.length === 1) return artists[0].name;
  if (artists.length === 2) return `${artists[0].name} & ${artists[1].name}`;

  const lastArtist = artists[artists.length - 1];
  const otherArtists = artists.slice(0, -1).map(a => a.name).join(', ');
  return `${otherArtists} & ${lastArtist.name}`;
}
