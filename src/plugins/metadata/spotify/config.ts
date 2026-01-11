import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';

export const SPOTIFY_API_BASE_URL = 'https://api.spotify.com/v1';

export const SPOTIFY_LOGIN_URL = 'https://accounts.spotify.com/login';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'spotify',
	name: 'Spotify',
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
	homepage: 'https://spotify.com',
	icon: 'spotify',
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'auth',
		type: 'oauth',
		label: 'Spotify Account',
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
