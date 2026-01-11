/**
 * Spotify Plugin Module
 *
 * Exports the plugin manifest and factory for the plugin system.
 * Supports lazy loading and self-registration.
 */

import type { PluginConfig } from '@plugins/core/interfaces/base-plugin';
import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import { PLUGIN_MANIFEST } from './config';
import { createSpotifyProvider } from './spotify-provider';
import type { SpotifyClientConfig } from './client';

/**
 * Spotify plugin module for self-registration
 */
export const SpotifyPluginModule: PluginModule<MetadataProvider> = {
	manifest: PLUGIN_MANIFEST,

	defaultConfig: { market: 'US' } as PluginConfig,

	async create(config?: PluginConfig) {
		const clientConfig: SpotifyClientConfig = {
			market: (config?.market as string) || 'US',
		};
		return createSpotifyProvider(clientConfig);
	},

	async validate() {
		// Validation happens when user attempts to authenticate
	},
};

export default SpotifyPluginModule;
