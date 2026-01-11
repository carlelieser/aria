import type { PluginConfig } from '@plugins/core/interfaces/base-plugin';
import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';
import { PLUGIN_MANIFEST, DEFAULT_CONFIG, type LocalLibraryConfig } from './config';
import { LocalLibraryProvider } from './local-library-provider';

export const LocalLibraryPluginModule: PluginModule<MetadataProvider> = {
	manifest: PLUGIN_MANIFEST,

	defaultConfig: DEFAULT_CONFIG as PluginConfig,

	async create(config?: PluginConfig) {
		return new LocalLibraryProvider(config as LocalLibraryConfig);
	},

	async validate() {
		// No special validation needed
	},
};

export default LocalLibraryPluginModule;
