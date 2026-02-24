import type { PluginConfigSchema, PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';
import type { AudioSourceCapability } from '@plugins/core/interfaces/audio-source-provider';

export interface YouTubeMusicConfig {
	lang?: string;
	location?: string;
	enableLogging?: boolean;
}

export const DEFAULT_CONFIG: YouTubeMusicConfig = {
	lang: 'en',
	enableLogging: false,
};

export const YOUTUBE_MUSIC_LOGIN_URL =
	'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'youtube-music',
	name: 'YouTube Music',
	shortName: 'YTM',
	description: 'Stream music from YouTube Music with rich metadata',
	version: '1.0.0',
	author: 'Aria',
	category: 'metadata-provider',
	homepage: 'https://music.youtube.com',
	iconUrl:
		'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Youtube_Music_icon.svg/960px-Youtube_Music_icon.svg.png',
	capabilities: [
		'search-tracks',
		'search-albums',
		'search-artists',
		'get-track-info',
		'get-album-info',
		'get-artist-info',
		'get-album-tracks',
		'get-artist-albums',
		'get-recommendations',
		'library-import',
	],
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'auth',
		type: 'oauth',
		label: 'Google Account',
		description: 'Sign in with your Google account to access your YouTube Music library',
		icon: 'User',
	},
	{
		key: 'lang',
		type: 'string',
		label: 'Language',
		description: 'Language code for YouTube Music',
		defaultValue: 'en',
	},
	{
		key: 'location',
		type: 'string',
		label: 'Location',
		description: 'Location code for regional content',
		required: false,
	},
];

export const METADATA_CAPABILITIES: MetadataCapability[] = [
	'search-tracks',
	'search-albums',
	'search-artists',
	'get-track-info',
	'get-album-info',
	'get-artist-info',
	'get-album-tracks',
	'get-artist-albums',
	'get-recommendations',
];

export const AUDIO_CAPABILITIES: AudioSourceCapability[] = ['get-stream-url', 'quality-selection'];
