import type { PluginManifest } from '../../core/interfaces/base-plugin';
import { CORE_ACTION_IDS } from '../../../domain/actions/track-action';

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'core-library',
	name: 'Core Library Actions',
	version: '1.0.0',
	description: 'Built-in track actions for library management, playback controls, and downloads',
	author: 'Aria',
	category: 'actions-provider',
	capabilities: ['provide-track-actions', 'execute-track-actions'],
	capabilitiesDetail: {
		canSearch: false,
		canStream: false,
		canDownload: false,
		requiresAuth: false,
		supportsCaching: false,
	},
};

// Actions handled by this plugin (excludes lyrics actions which are handled by lyrics plugin)
const LYRICS_ACTION_IDS: Set<string> = new Set([
	CORE_ACTION_IDS.VIEW_LYRICS,
	CORE_ACTION_IDS.TOGGLE_LYRICS,
]);
export const HANDLED_ACTION_IDS = new Set(
	Object.values(CORE_ACTION_IDS).filter((id) => !LYRICS_ACTION_IDS.has(id))
);

export { CORE_ACTION_IDS };
