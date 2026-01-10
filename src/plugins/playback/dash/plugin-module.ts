/**
 * DASH Playback Plugin Module
 *
 * Exports the plugin manifest and factory for the plugin system.
 * Supports lazy loading and self-registration.
 */

import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { PlaybackProvider } from '@plugins/core/interfaces/playback-provider';
import { PLUGIN_MANIFEST } from './config';
import { DashPlaybackProvider } from './index';

/**
 * DASH Playback plugin module for self-registration
 */
export const DashPlaybackPluginModule: PluginModule<PlaybackProvider> = {
	manifest: PLUGIN_MANIFEST,

	async create() {
		return new DashPlaybackProvider();
	},

	async validate() {
		// No special validation needed
	},
};

export default DashPlaybackPluginModule;
