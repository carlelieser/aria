import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';

export const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export const SPOTIFY_CLIENT_ID = '0b898a987999427ca4670844058a07f2';
export const SPOTIFY_REDIRECT_URI = 'aria://spotify/callback';
export const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';
export const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';

export const SPOTIFY_SCOPES = [
	'user-library-read',
	'user-library-modify',
	'playlist-read-private',
	'playlist-read-collaborative',
	'user-follow-read',
	'user-follow-modify',
].join(' ');

export const SPOTIFY_LOGIN_URL = 'https://accounts.spotify.com/login';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'spotify',
	name: 'Spotify',
	shortName: 'Spotify',
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
		'library-import',
	],
	capabilitiesDetail: {
		canSearch: true,
		requiresAuth: true,
		supportsCaching: true,
		supportsBatch: true,
	},
	homepage: 'https://spotify.com',
	iconUrl:
		'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png',
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'auth',
		type: 'oauth',
		label: 'Account',
		description: 'Sign in to your Spotify account to access your library',
		icon: 'Music',
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
