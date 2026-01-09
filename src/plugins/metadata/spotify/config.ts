import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';

export interface SpotifyConfig {
	readonly clientId: string;
	readonly clientSecret: string;
	readonly redirectUri: string;
	readonly market?: string;
	readonly enableLogging?: boolean;
}

export const DEFAULT_CONFIG: Partial<SpotifyConfig> = {
	market: 'US',
	enableLogging: false,
};

export const SPOTIFY_SCOPES = [
	'user-library-read',
	'user-library-modify',
	'playlist-read-private',
	'playlist-read-collaborative',
	'playlist-modify-public',
	'playlist-modify-private',
	'user-follow-read',
	'user-follow-modify',
	'user-top-read',
	'user-read-recently-played',
] as const;

export const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'spotify',
	name: 'Spotify Library',
	description:
		'Access your Spotify library including playlists, saved tracks, albums, and followed artists',
	version: '1.0.0',
	author: 'Aria',
	category: 'metadata-provider',
	capabilities: [
		'search-tracks',
		'search-albums',
		'search-artists',
		'search-playlists',
		'get-track-info',
		'get-album-info',
		'get-artist-info',
		'get-playlist-info',
		'get-album-tracks',
		'get-artist-albums',
		'get-recommendations',
	],
	capabilitiesDetail: {
		canSearch: true,
		requiresAuth: true,
		supportsCaching: true,
		supportsBatch: true,
	},
	homepage: 'https://developer.spotify.com',
	icon: 'spotify',
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'clientId',
		type: 'string',
		label: 'Client ID',
		description: 'Spotify application client ID from the Developer Dashboard',
		required: true,
	},
	{
		key: 'clientSecret',
		type: 'string',
		label: 'Client Secret',
		description: 'Spotify application client secret from the Developer Dashboard',
		required: true,
	},
	{
		key: 'redirectUri',
		type: 'string',
		label: 'Redirect URI',
		description: 'OAuth redirect URI configured in your Spotify app',
		required: true,
		defaultValue: 'aria://spotify/callback',
	},
	{
		key: 'market',
		type: 'string',
		label: 'Market',
		description: 'ISO 3166-1 alpha-2 country code for content filtering',
		required: false,
		defaultValue: 'US',
	},
];

export const METADATA_CAPABILITIES: MetadataCapability[] = [
	'search-tracks',
	'search-albums',
	'search-artists',
	'search-playlists',
	'get-track-info',
	'get-album-info',
	'get-artist-info',
	'get-playlist-info',
	'get-album-tracks',
	'get-artist-albums',
	'get-recommendations',
];
