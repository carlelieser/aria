export interface SoundCloudUser {
	readonly urn: string;
	readonly id: number;
	readonly username: string;
	readonly permalink: string;
	readonly permalink_url: string;
	readonly avatar_url: string;
	readonly description: string | null;
	readonly followers_count: number;
	readonly followings_count: number;
	readonly track_count: number;
	readonly playlist_count: number;
	readonly full_name: string | null;
	readonly city: string | null;
	readonly country_code: string | null;
	readonly verified: boolean;
}

export interface SoundCloudTrack {
	readonly urn: string;
	readonly id: number;
	readonly title: string;
	readonly permalink: string;
	readonly permalink_url: string;
	readonly duration: number;
	readonly artwork_url: string | null;
	readonly waveform_url: string | null;
	readonly genre: string | null;
	readonly tag_list: string;
	readonly description: string | null;
	readonly created_at: string;
	readonly user: SoundCloudUser;
	readonly playback_count: number;
	readonly likes_count: number;
	readonly reposts_count: number;
	readonly comment_count: number;
	readonly downloadable: boolean;
	readonly access: 'playable' | 'preview' | 'blocked';
	readonly policy: 'ALLOW' | 'BLOCK' | 'SNIP' | 'MONETIZE';
	readonly sharing: 'public' | 'private';
	readonly state: 'processing' | 'failed' | 'finished';
	readonly monetization_model: string | null;
	readonly media: SoundCloudMedia;
	readonly publisher_metadata?: SoundCloudPublisherMetadata;
	readonly license: string;
	readonly release_date: string | null;
}

export interface SoundCloudMedia {
	readonly transcodings: readonly SoundCloudTranscoding[];
}

export interface SoundCloudTranscoding {
	readonly url: string;
	readonly preset: string;
	readonly duration: number;
	readonly snipped: boolean;
	readonly format: SoundCloudTranscodingFormat;
	readonly quality: 'sq' | 'hq';
}

export interface SoundCloudTranscodingFormat {
	readonly protocol: 'hls' | 'progressive';
	readonly mime_type: string;
}

export interface SoundCloudPublisherMetadata {
	readonly urn: string;
	readonly artist: string | null;
	readonly album_title: string | null;
	readonly isrc: string | null;
	readonly upc: string | null;
	readonly release_date: string | null;
}

export interface SoundCloudPlaylist {
	readonly urn: string;
	readonly id: number;
	readonly title: string;
	readonly permalink: string;
	readonly permalink_url: string;
	readonly artwork_url: string | null;
	readonly description: string | null;
	readonly duration: number;
	readonly created_at: string;
	readonly user: SoundCloudUser;
	readonly track_count: number;
	readonly tracks: readonly SoundCloudTrack[];
	readonly sharing: 'public' | 'private';
	readonly is_album: boolean;
}

export interface SoundCloudStreamsResponse {
	readonly hls_aac_160_url?: string;
	readonly hls_aac_96_url?: string;
	readonly http_mp3_128_url?: string;
	readonly hls_mp3_128_url?: string;
	readonly hls_opus_64_url?: string;
	readonly preview_mp3_128_url?: string;
}

export interface SoundCloudSearchResponse<T> {
	readonly collection: readonly T[];
	readonly total_results: number;
	readonly next_href: string | null;
	readonly query_urn: string | null;
}

export interface SoundCloudTokenResponse {
	readonly access_token: string;
	readonly token_type: string;
	readonly expires_in: number;
	readonly refresh_token: string;
	readonly scope: string;
}

export interface SoundCloudErrorResponse {
	readonly errors: readonly SoundCloudErrorDetail[];
}

export interface SoundCloudErrorDetail {
	readonly error_message: string;
	readonly status: number;
}

export interface SoundCloudLike {
	readonly created_at: string;
	readonly track: SoundCloudTrack;
}

export interface SoundCloudLikesResponse {
	readonly collection: readonly SoundCloudLike[];
	readonly next_href: string | null;
}

export interface SoundCloudPlaylistsResponse {
	readonly collection: readonly SoundCloudPlaylist[];
	readonly next_href: string | null;
}

export interface SoundCloudRelatedTracksResponse {
	readonly collection: readonly SoundCloudTrack[];
}
