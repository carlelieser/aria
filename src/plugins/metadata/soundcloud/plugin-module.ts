import type { PluginConfig } from '@plugins/core/interfaces/base-plugin';
import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import { PLUGIN_MANIFEST } from './config';
import { createSoundCloudProvider } from './soundcloud-provider';

export const SoundCloudPluginModule: PluginModule<MetadataProvider> = {
	manifest: PLUGIN_MANIFEST,

	defaultConfig: {} as PluginConfig,

	async create(config?: PluginConfig) {
		return createSoundCloudProvider({
			clientId: config?.clientId as string | undefined,
		});
	},

	async validate() {
		// Validation happens when user attempts to authenticate
	},
};

export default SoundCloudPluginModule;
