/**
 * DASH Playback Provider Configuration
 */

import type { PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { PlaybackCapability } from '@plugins/core/interfaces/playback-provider';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'dash-player',
	name: 'DASH Playback',
	version: '1.0.0',
	description: 'DASH audio playback using expo-video',
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
