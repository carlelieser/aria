import type { PluginModule } from '@plugins/core/interfaces/plugin-module';
import type { PlaybackProvider } from '@plugins/core/interfaces/playback-provider';
import { PLUGIN_MANIFEST } from './config';
import { rntpPlaybackProvider } from './index';

export const RNTPPluginModule: PluginModule<PlaybackProvider> = {
	manifest: PLUGIN_MANIFEST,

	async create() {
		// Return singleton - TrackPlayer.setupPlayer() can only be called once
		return rntpPlaybackProvider;
	},

	async validate() {},
};

export default RNTPPluginModule;
