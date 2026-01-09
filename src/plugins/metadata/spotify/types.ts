/**
 * Spotify API response types
 *
 * These types represent the structure of data returned from the Spotify Web API.
 * @see https://developer.spotify.com/documentation/web-api
 */

/**
 * Spotify image object
 */
export interface SpotifyImage {
  readonly url: string;
  readonly height: number | null;
  readonly width: number | null;
}

/**
 * External URLs for Spotify resources
 */
export interface SpotifyExternalUrls {
  readonly spotify: string;
}

/**
 * External IDs for tracks (ISRC, EAN, UPC)
 */
export interface SpotifyExternalIds {
  readonly isrc?: string;
  readonly ean?: string;
  readonly upc?: string;
}

/**
 * Spotify followers object
 */
export interface SpotifyFollowers {
  readonly href: string | null;
  readonly total: number;
}

/**
 * Simplified artist object (used in track/album responses)
 */
export interface SpotifySimplifiedArtist {
  readonly id: string;
  readonly name: string;
  readonly type: 'artist';
  readonly uri: string;
  readonly href: string;
  readonly external_urls: SpotifyExternalUrls;
}

/**
 * Full artist object
 */
export interface SpotifyArtist extends SpotifySimplifiedArtist {
  readonly followers: SpotifyFollowers;
  readonly genres: string[];
  readonly images: SpotifyImage[];
  readonly popularity: number;
}

/**
 * Simplified album object (used in track responses)
 */
export interface SpotifySimplifiedAlbum {
  readonly id: string;
  readonly name: string;
  readonly album_type: 'album' | 'single' | 'compilation';
  readonly total_tracks: number;
  readonly available_markets: string[];
  readonly external_urls: SpotifyExternalUrls;
  readonly href: string;
  readonly images: SpotifyImage[];
  readonly release_date: string;
  readonly release_date_precision: 'year' | 'month' | 'day';
  readonly type: 'album';
  readonly uri: string;
  readonly artists: SpotifySimplifiedArtist[];
}

/**
 * Full album object
 */
export interface SpotifyAlbum extends SpotifySimplifiedAlbum {
  readonly tracks: SpotifyPagingObject<SpotifySimplifiedTrack>;
  readonly copyrights: SpotifyCopyright[];
  readonly external_ids: SpotifyExternalIds;
  readonly genres: string[];
  readonly label: string;
  readonly popularity: number;
}

/**
 * Copyright object
 */
export interface SpotifyCopyright {
  readonly text: string;
  readonly type: 'C' | 'P';
}

/**
 * Simplified track object (used in album responses)
 */
export interface SpotifySimplifiedTrack {
  readonly id: string;
  readonly name: string;
  readonly artists: SpotifySimplifiedArtist[];
  readonly disc_number: number;
  readonly track_number: number;
  readonly duration_ms: number;
  readonly explicit: boolean;
  readonly external_urls: SpotifyExternalUrls;
  readonly href: string;
  readonly is_playable?: boolean;
  readonly preview_url: string | null;
  readonly type: 'track';
  readonly uri: string;
  readonly is_local: boolean;
}

/**
 * Full track object
 */
export interface SpotifyTrack extends SpotifySimplifiedTrack {
  readonly album: SpotifySimplifiedAlbum;
  readonly external_ids: SpotifyExternalIds;
  readonly popularity: number;
}

/**
 * Saved track object (from user's library)
 */
export interface SpotifySavedTrack {
  readonly added_at: string;
  readonly track: SpotifyTrack;
}

/**
 * Saved album object (from user's library)
 */
export interface SpotifySavedAlbum {
  readonly added_at: string;
  readonly album: SpotifyAlbum;
}

/**
 * Simplified playlist object
 */
export interface SpotifySimplifiedPlaylist {
  readonly id: string;
  readonly name: string;
  readonly description: string | null;
  readonly collaborative: boolean;
  readonly external_urls: SpotifyExternalUrls;
  readonly href: string;
  readonly images: SpotifyImage[];
  readonly owner: SpotifyPublicUser;
  readonly public: boolean | null;
  readonly snapshot_id: string;
  readonly tracks: {
    readonly href: string;
    readonly total: number;
  };
  readonly type: 'playlist';
  readonly uri: string;
}

/**
 * Full playlist object
 */
export interface SpotifyPlaylist extends SpotifySimplifiedPlaylist {
  readonly followers: SpotifyFollowers;
  readonly tracks: SpotifyPagingObject<SpotifyPlaylistTrack>;
}

/**
 * Playlist track object
 */
export interface SpotifyPlaylistTrack {
  readonly added_at: string | null;
  readonly added_by: SpotifyPublicUser | null;
  readonly is_local: boolean;
  readonly track: SpotifyTrack | null;
}

/**
 * Public user object
 */
export interface SpotifyPublicUser {
  readonly id: string;
  readonly display_name: string | null;
  readonly external_urls: SpotifyExternalUrls;
  readonly followers?: SpotifyFollowers;
  readonly href: string;
  readonly images?: SpotifyImage[];
  readonly type: 'user';
  readonly uri: string;
}

/**
 * Private user object (current user)
 */
export interface SpotifyPrivateUser extends SpotifyPublicUser {
  readonly country: string;
  readonly email: string;
  readonly explicit_content: {
    readonly filter_enabled: boolean;
    readonly filter_locked: boolean;
  };
  readonly product: 'free' | 'premium';
}

/**
 * Paging object for paginated responses
 */
export interface SpotifyPagingObject<T> {
  readonly href: string;
  readonly items: T[];
  readonly limit: number;
  readonly next: string | null;
  readonly offset: number;
  readonly previous: string | null;
  readonly total: number;
}

/**
 * Cursor-based paging object
 */
export interface SpotifyCursorPagingObject<T> {
  readonly href: string;
  readonly items: T[];
  readonly limit: number;
  readonly next: string | null;
  readonly cursors: {
    readonly after: string | null;
    readonly before: string | null;
  };
  readonly total?: number;
}

/**
 * Search response
 */
export interface SpotifySearchResponse {
  readonly tracks?: SpotifyPagingObject<SpotifyTrack>;
  readonly albums?: SpotifyPagingObject<SpotifySimplifiedAlbum>;
  readonly artists?: SpotifyPagingObject<SpotifyArtist>;
  readonly playlists?: SpotifyPagingObject<SpotifySimplifiedPlaylist>;
}

/**
 * Artist's top tracks response
 */
export interface SpotifyArtistTopTracksResponse {
  readonly tracks: SpotifyTrack[];
}

/**
 * Followed artists response
 */
export interface SpotifyFollowedArtistsResponse {
  readonly artists: SpotifyCursorPagingObject<SpotifyArtist>;
}

/**
 * Recommendations response
 */
export interface SpotifyRecommendationsResponse {
  readonly seeds: SpotifyRecommendationSeed[];
  readonly tracks: SpotifyTrack[];
}

/**
 * Recommendation seed
 */
export interface SpotifyRecommendationSeed {
  readonly afterFilteringSize: number;
  readonly afterRelinkingSize: number;
  readonly href: string | null;
  readonly id: string;
  readonly initialPoolSize: number;
  readonly type: 'artist' | 'track' | 'genre';
}

/**
 * Error response from Spotify API
 */
export interface SpotifyErrorResponse {
  readonly error: {
    readonly status: number;
    readonly message: string;
  };
}

/**
 * OAuth token response
 */
export interface SpotifyTokenResponse {
  readonly access_token: string;
  readonly token_type: 'Bearer';
  readonly scope: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
}

/**
 * New releases response
 */
export interface SpotifyNewReleasesResponse {
  readonly albums: SpotifyPagingObject<SpotifySimplifiedAlbum>;
}

/**
 * Featured playlists response
 */
export interface SpotifyFeaturedPlaylistsResponse {
  readonly message: string;
  readonly playlists: SpotifyPagingObject<SpotifySimplifiedPlaylist>;
}

/**
 * Categories response
 */
export interface SpotifyCategoriesResponse {
  readonly categories: SpotifyPagingObject<SpotifyCategory>;
}

/**
 * Category object
 */
export interface SpotifyCategory {
  readonly href: string;
  readonly icons: SpotifyImage[];
  readonly id: string;
  readonly name: string;
}
