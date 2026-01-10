/**
 * Expo Audio Plugin Module
 *
 * Exports the plugin manifest and factory for the plugin system.
 * Supports lazy loading and self-registration.
 */

import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { PlaybackProvider } from '@plugins/core/interfaces/playback-provider';
import { PLUGIN_MANIFEST } from './config';
import { ExpoAudioPlaybackProvider } from './index';

/**
 * Expo Audio plugin module for self-registration
 */
export const ExpoAudioPluginModule: PluginModule<PlaybackProvider> = {
	manifest: PLUGIN_MANIFEST,

	async create() {
		return new ExpoAudioPlaybackProvider();
	},

	async validate() {
		// No special validation needed
	},
};

export default ExpoAudioPluginModule;
