import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';
import type { Result } from '../../shared/types/result';

/**
 * Search options for metadata providers
 */
export interface SearchOptions {
  query: string;
  type?: 'track' | 'album' | 'artist' | 'all';
  limit?: number;
  offset?: number;
}

/**
 * Search results from metadata provider
 */
export interface MetadataSearchResults {
  tracks: Track[];
  albums: Album[];
  artists: Artist[];
}

/**
 * Metadata provider interface
 * Abstracts different music metadata sources (YouTube, Spotify, etc.)
 */
export interface MetadataProvider {
  /**
   * Provider unique identifier (e.g., 'youtube', 'spotify')
   */
  readonly id: string;

  /**
   * Human-readable provider name
   */
  readonly name: string;

  /**
   * Whether this provider is currently enabled
   */
  readonly isEnabled: boolean;

  /**
   * Search for tracks, albums, and artists
   */
  search(options: SearchOptions): Promise<Result<MetadataSearchResults, Error>>;

  /**
   * Get stream URL for a track
   */
  getStreamUrl(track: Track): Promise<Result<string, Error>>;

  /**
   * Get detailed track information
   */
  getTrack(trackId: string): Promise<Result<Track, Error>>;

  /**
   * Get album details with tracks
   */
  getAlbum(albumId: string): Promise<Result<Album, Error>>;

  /**
   * Get artist details
   */
  getArtist(artistId: string): Promise<Result<Artist, Error>>;

  /**
   * Get suggestions/autocomplete for a query
   */
  getSuggestions(query: string): Promise<Result<string[], Error>>;
}
