import type { PluginModule } from '../../core/interfaces/plugin-module';
import type { BasePlugin } from '../../core/interfaces/base-plugin';
import { PLUGIN_MANIFEST } from './config';
import { createCoreLibraryProvider } from './core-library-provider';

export const CoreLibraryPluginModule: PluginModule<BasePlugin> = {
	manifest: PLUGIN_MANIFEST,

	async create() {
		return createCoreLibraryProvider();
	},

	async validate() {
		// Core library plugin is always valid
	},
};
