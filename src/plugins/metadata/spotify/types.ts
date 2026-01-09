export interface SpotifyImage {
	readonly url: string;
	readonly height: number | null;
	readonly width: number | null;
}

export interface SpotifyExternalUrls {
	readonly spotify: string;
}

export interface SpotifyExternalIds {
	readonly isrc?: string;
	readonly ean?: string;
	readonly upc?: string;
}

export interface SpotifyFollowers {
	readonly href: string | null;
	readonly total: number;
}

export interface SpotifySimplifiedArtist {
	readonly id: string;
	readonly name: string;
	readonly type: 'artist';
	readonly uri: string;
	readonly href: string;
	readonly external_urls: SpotifyExternalUrls;
}

export interface SpotifyArtist extends SpotifySimplifiedArtist {
	readonly followers: SpotifyFollowers;
	readonly genres: string[];
	readonly images: SpotifyImage[];
	readonly popularity: number;
}

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

export interface SpotifyAlbum extends SpotifySimplifiedAlbum {
	readonly tracks: SpotifyPagingObject<SpotifySimplifiedTrack>;
	readonly copyrights: SpotifyCopyright[];
	readonly external_ids: SpotifyExternalIds;
	readonly genres: string[];
	readonly label: string;
	readonly popularity: number;
}

export interface SpotifyCopyright {
	readonly text: string;
	readonly type: 'C' | 'P';
}

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

export interface SpotifyTrack extends SpotifySimplifiedTrack {
	readonly album: SpotifySimplifiedAlbum;
	readonly external_ids: SpotifyExternalIds;
	readonly popularity: number;
}

export interface SpotifySavedTrack {
	readonly added_at: string;
	readonly track: SpotifyTrack;
}

export interface SpotifySavedAlbum {
	readonly added_at: string;
	readonly album: SpotifyAlbum;
}

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

export interface SpotifyPlaylist extends SpotifySimplifiedPlaylist {
	readonly followers: SpotifyFollowers;
	readonly tracks: SpotifyPagingObject<SpotifyPlaylistTrack>;
}

export interface SpotifyPlaylistTrack {
	readonly added_at: string | null;
	readonly added_by: SpotifyPublicUser | null;
	readonly is_local: boolean;
	readonly track: SpotifyTrack | null;
}

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

export interface SpotifyPrivateUser extends SpotifyPublicUser {
	readonly country: string;
	readonly email: string;
	readonly explicit_content: {
		readonly filter_enabled: boolean;
		readonly filter_locked: boolean;
	};
	readonly product: 'free' | 'premium';
}

export interface SpotifyPagingObject<T> {
	readonly href: string;
	readonly items: T[];
	readonly limit: number;
	readonly next: string | null;
	readonly offset: number;
	readonly previous: string | null;
	readonly total: number;
}

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

export interface SpotifySearchResponse {
	readonly tracks?: SpotifyPagingObject<SpotifyTrack>;
	readonly albums?: SpotifyPagingObject<SpotifySimplifiedAlbum>;
	readonly artists?: SpotifyPagingObject<SpotifyArtist>;
	readonly playlists?: SpotifyPagingObject<SpotifySimplifiedPlaylist>;
}

export interface SpotifyArtistTopTracksResponse {
	readonly tracks: SpotifyTrack[];
}

export interface SpotifyFollowedArtistsResponse {
	readonly artists: SpotifyCursorPagingObject<SpotifyArtist>;
}

export interface SpotifyRecommendationsResponse {
	readonly seeds: SpotifyRecommendationSeed[];
	readonly tracks: SpotifyTrack[];
}

export interface SpotifyRecommendationSeed {
	readonly afterFilteringSize: number;
	readonly afterRelinkingSize: number;
	readonly href: string | null;
	readonly id: string;
	readonly initialPoolSize: number;
	readonly type: 'artist' | 'track' | 'genre';
}

export interface SpotifyErrorResponse {
	readonly error: {
		readonly status: number;
		readonly message: string;
	};
}

export interface SpotifyTokenResponse {
	readonly access_token: string;
	readonly token_type: 'Bearer';
	readonly scope: string;
	readonly expires_in: number;
	readonly refresh_token?: string;
}

export interface SpotifyNewReleasesResponse {
	readonly albums: SpotifyPagingObject<SpotifySimplifiedAlbum>;
}

export interface SpotifyFeaturedPlaylistsResponse {
	readonly message: string;
	readonly playlists: SpotifyPagingObject<SpotifySimplifiedPlaylist>;
}

export interface SpotifyCategoriesResponse {
	readonly categories: SpotifyPagingObject<SpotifyCategory>;
}

export interface SpotifyCategory {
	readonly href: string;
	readonly icons: SpotifyImage[];
	readonly id: string;
	readonly name: string;
}
