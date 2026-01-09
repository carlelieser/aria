/**
 * Spotify Library Plugin
 *
 * Provides access to Spotify's catalog and user library including:
 * - Search for tracks, albums, artists, and playlists
 * - User's saved tracks and albums
 * - User's playlists
 * - Followed artists
 * - Recommendations
 *
 * @module plugins/metadata/spotify
 */

// Main provider
export {
  SpotifyProvider,
  createSpotifyProvider,
  type SpotifyLibraryProvider,
} from './spotify-provider';

// Configuration
export {
  type SpotifyConfig,
  DEFAULT_CONFIG,
  PLUGIN_MANIFEST,
  CONFIG_SCHEMA,
  METADATA_CAPABILITIES,
  SPOTIFY_SCOPES,
  SPOTIFY_API_BASE_URL,
  SPOTIFY_AUTH_URL,
} from './config';

// Client
export { SpotifyClient, createSpotifyClient } from './client';

// Auth
export { SpotifyAuthManager, generateAuthState, type AuthState } from './auth';

// Operations
export { createSearchOperations, type SearchOperations } from './search';
export { createInfoOperations, type InfoOperations } from './info';
export { createLibraryOperations, type LibraryOperations } from './library';
export { createRecommendationOperations, type RecommendationOperations } from './recommendations';

// Mappers
export {
  mapSpotifyTrack,
  mapSpotifyTracks,
  mapSpotifySavedTrack,
  mapSpotifySavedTracks,
  mapSpotifySimplifiedTrack,
  mapSpotifyAlbum,
  mapSpotifySimplifiedAlbum,
  mapSpotifySimplifiedAlbums,
  mapSpotifyArtist,
  mapSpotifyArtists,
  mapSpotifyPlaylist,
  mapSpotifySimplifiedPlaylist,
  mapSpotifySimplifiedPlaylists,
  mapSpotifyImages,
  mapSpotifyArtistReference,
  mapSpotifyArtistReferences,
} from './mappers';

// Types (re-export commonly used types)
export type {
  SpotifyTrack,
  SpotifySimplifiedTrack,
  SpotifyAlbum,
  SpotifySimplifiedAlbum,
  SpotifyArtist,
  SpotifySimplifiedArtist,
  SpotifyPlaylist,
  SpotifySimplifiedPlaylist,
  SpotifyPlaylistTrack,
  SpotifySavedTrack,
  SpotifySavedAlbum,
  SpotifyImage,
  SpotifyPagingObject,
  SpotifySearchResponse,
  SpotifyTokenResponse,
  SpotifyErrorResponse,
} from './types';
