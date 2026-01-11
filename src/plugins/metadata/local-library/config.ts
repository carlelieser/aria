import type { PluginManifest, PluginConfigSchema } from '@plugins/core/interfaces/base-plugin';
import type { MetadataCapability } from '@plugins/core/interfaces/metadata-provider';
import type { AudioSourceCapability } from '@plugins/core/interfaces/audio-source-provider';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'local-library',
	name: 'Local Library',
	version: '1.0.0',
	description: 'Scan and play local audio files with ID3 metadata',
	author: 'Aria',
	category: 'metadata-provider',
	capabilities: [
		'search-tracks',
		'search-albums',
		'search-artists',
		'get-track-info',
		'get-album-info',
		'get-artist-info',
		'get-album-tracks',
		'get-artist-albums',
	],
	capabilitiesDetail: {
		canSearch: true,
		canStream: true,
	},
};

export const METADATA_CAPABILITIES: MetadataCapability[] = [
	'search-tracks',
	'search-albums',
	'search-artists',
	'get-track-info',
	'get-album-info',
	'get-artist-info',
	'get-album-tracks',
	'get-artist-albums',
];

export const AUDIO_CAPABILITIES: AudioSourceCapability[] = ['get-stream-url', 'offline-playback'];

export interface LocalLibraryConfig {
	autoScanOnLaunch?: boolean;
	[key: string]: unknown;
}

export const DEFAULT_CONFIG: LocalLibraryConfig = {
	autoScanOnLaunch: false,
};

export const CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'folders',
		type: 'folder-list',
		label: 'Music Folders',
		description: 'Select folders containing your music files',
	},
	{
		key: 'autoScanOnLaunch',
		type: 'boolean',
		label: 'Auto-scan on launch',
		description: 'Automatically scan folders when the app launches',
		defaultValue: false,
		icon: 'RefreshCw',
	},
];
