import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';

// Library import goes through the spot-api proxy (SpotAPI-backed), not Spotify
// directly. The key is a public gating token that ships in the client binary.
export const SPOT_API_URL = process.env.EXPO_PUBLIC_SPOT_API_URL ?? '';
export const SPOT_API_KEY = process.env.EXPO_PUBLIC_SPOT_API_KEY ?? '';

export const SPOTIFY_LOGIN_URL = 'https://accounts.spotify.com/login';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'spotify',
	name: 'Spotify',
	shortName: 'Spotify',
	description: 'Import your Spotify library — saved tracks, playlists, and followed artists',
	version: '2.0.0',
	author: 'Aria',
	category: 'metadata-provider',
	capabilities: [
		'library-import',
		'get-album-info',
		'get-album-tracks',
		'get-artist-info',
		'get-artist-albums',
	],
	capabilitiesDetail: {
		canSearch: false,
		requiresAuth: true,
		supportsCaching: false,
		supportsBatch: false,
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
	'get-album-info',
	'get-album-tracks',
	'get-artist-info',
	'get-artist-albums',
];
