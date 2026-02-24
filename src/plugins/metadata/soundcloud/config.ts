import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';
import type { AudioSourceCapability } from '@plugins/core/interfaces/audio-source-provider';

export const SOUNDCLOUD_API_BASE_URL = 'https://api-v2.soundcloud.com';

export const SOUNDCLOUD_CLIENT_ID = process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_ID ?? '';
export const SOUNDCLOUD_CLIENT_SECRET = process.env.EXPO_PUBLIC_SOUNDCLOUD_CLIENT_SECRET ?? '';
export const SOUNDCLOUD_REDIRECT_URI = 'aria://soundcloud/callback';
export const SOUNDCLOUD_TOKEN_URL = 'https://secure.soundcloud.com/oauth/token';
export const SOUNDCLOUD_AUTH_URL = 'https://secure.soundcloud.com/authorize';

export const SOUNDCLOUD_SCOPES = 'non-expiring';

export const SOUNDCLOUD_LOGIN_URL = 'https://secure.soundcloud.com/authorize';

export const STREAM_RATE_LIMIT_PER_DAY = 15_000;

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'soundcloud',
	name: 'SoundCloud',
	shortName: 'SC',
	description: 'Stream and discover music on SoundCloud',
	version: '1.0.0',
	author: 'Aria',
	category: 'metadata-provider',
	capabilities: [
		'search-tracks',
		'search-artists',
		'search-playlists',
		'get-track-info',
		'get-artist-info',
		'get-playlist-info',
		'get-recommendations',
		'library-import',
	],
	capabilitiesDetail: {
		canSearch: true,
		canStream: true,
		requiresAuth: false,
		supportsCaching: true,
		supportsBatch: false,
	},
	homepage: 'https://soundcloud.com',
	iconUrl: 'https://cdn-icons-png.flaticon.com/512/145/145809.png',
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'auth',
		type: 'oauth',
		label: 'Account',
		description: 'Sign in to your SoundCloud account to access likes and playlists',
		icon: 'Music',
	},
];

export const METADATA_CAPABILITIES: MetadataCapability[] = [
	'search-tracks',
	'search-artists',
	'search-playlists',
	'get-track-info',
	'get-artist-info',
	'get-playlist-info',
	'get-recommendations',
];

export const AUDIO_CAPABILITIES: AudioSourceCapability[] = [
	'get-stream-url',
	'get-formats',
	'quality-selection',
];
