/**
 * YouTube Music Plugin Module
 *
 * Exports the plugin manifest and factory for the plugin system.
 * Supports lazy loading and self-registration.
 */

import type { PluginConfig } from '@plugins/core/interfaces/base-plugin';
import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import { PLUGIN_MANIFEST, DEFAULT_CONFIG, type YouTubeMusicConfig } from './config';
import { YouTubeMusicProvider } from './youtube-music-provider';
import { preloadInnertubeClient } from './client';

// Preload the Innertube client when the plugin module is loaded
// This ensures the client is ready by the time onInit is called
preloadInnertubeClient();

/**
 * YouTube Music plugin module for self-registration
 */
export const YouTubeMusicPluginModule: PluginModule<MetadataProvider> = {
	manifest: PLUGIN_MANIFEST,

	defaultConfig: DEFAULT_CONFIG as PluginConfig,

	async create(config?: PluginConfig) {
		return new YouTubeMusicProvider(config as YouTubeMusicConfig);
	},

	async validate() {
		// No special validation needed
	},
};

export default YouTubeMusicPluginModule;
