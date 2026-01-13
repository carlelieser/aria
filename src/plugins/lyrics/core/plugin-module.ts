import type { PluginModule } from '../../core/interfaces/plugin-module';
import type { BasePlugin } from '../../core/interfaces/base-plugin';
import { PLUGIN_MANIFEST } from './config';
import { createLyricsPlugin, setLyricsPluginInstance } from './lyrics-plugin';

export const LyricsPluginModule: PluginModule<BasePlugin> = {
	manifest: PLUGIN_MANIFEST,

	async create() {
		const plugin = createLyricsPlugin();
		setLyricsPluginInstance(plugin);
		return plugin;
	},

	async validate() {
		// Lyrics plugin is always valid
	},
};
