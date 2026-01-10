/**
 * Spotify Plugin Module
 *
 * Exports the plugin manifest and factory for the plugin system.
 * Supports lazy loading and self-registration.
 */

import type { PluginConfig } from '@plugins/core/interfaces/base-plugin';
import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import { PLUGIN_MANIFEST, DEFAULT_CONFIG, type SpotifyConfig } from './config';
import { createSpotifyProvider } from './spotify-provider';

/**
 * Spotify plugin module for self-registration
 */
export const SpotifyPluginModule: PluginModule<MetadataProvider> = {
	manifest: PLUGIN_MANIFEST,

	defaultConfig: DEFAULT_CONFIG as PluginConfig,

	async create(config?: PluginConfig) {
		const spotifyConfig = config as Partial<SpotifyConfig>;
		// Spotify requires auth config to be provided
		if (
			!spotifyConfig?.clientId ||
			!spotifyConfig?.clientSecret ||
			!spotifyConfig?.redirectUri
		) {
			throw new Error(
				'Spotify plugin requires clientId, clientSecret, and redirectUri configuration'
			);
		}
		return createSpotifyProvider(spotifyConfig as SpotifyConfig);
	},

	async validate() {
		// Could validate that OAuth is configured, etc.
	},
};

export default SpotifyPluginModule;
