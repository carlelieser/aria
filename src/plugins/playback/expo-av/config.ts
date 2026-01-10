/**
 * Expo Audio Playback Provider Configuration
 */

import type { PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { PlaybackCapability } from '@plugins/core/interfaces/playback-provider';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'expo-audio',
	name: 'Expo Audio Playback',
	version: '3.0.0',
	description: 'Audio playback using expo-audio',
	author: 'Aria',
	category: 'playback-provider',
	capabilities: [
		'play',
		'pause',
		'seek',
		'volume-control',
		'queue-management',
		'background-play',
	],
};

export const PLAYBACK_CAPABILITIES: PlaybackCapability[] = [
	'play',
	'pause',
	'seek',
	'volume-control',
	'queue-management',
	'background-play',
];
