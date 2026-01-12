/**
 * React Native Track Player Playback Provider Configuration
 */

import type { PluginManifest } from '@plugins/core/interfaces/base-plugin';
import type { PlaybackCapability } from '@plugins/core/interfaces/playback-provider';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'react-native-track-player',
	name: 'Track Player',
	version: '1.0.0',
	description: 'Audio playback using react-native-track-player with background support',
	author: 'Aria',
	category: 'playback-provider',
	capabilities: [
		'play',
		'pause',
		'seek',
		'volume-control',
		'queue-management',
		'background-play',
		'gapless-playback',
	],
};

export const PLAYBACK_CAPABILITIES: PlaybackCapability[] = [
	'play',
	'pause',
	'seek',
	'volume-control',
	'queue-management',
	'background-play',
	'gapless-playback',
];
