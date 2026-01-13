import type { PluginManifest, PluginConfigSchema } from '../../core/interfaces/base-plugin';
import { CORE_ACTION_IDS } from '../../../domain/actions/track-action';

export const LYRICS_ACTION_IDS = {
	VIEW_LYRICS: CORE_ACTION_IDS.VIEW_LYRICS,
	TOGGLE_LYRICS: CORE_ACTION_IDS.TOGGLE_LYRICS,
} as const;

export const HANDLED_ACTION_IDS: Set<string> = new Set(Object.values(LYRICS_ACTION_IDS));

export const PLUGIN_MANIFEST: PluginManifest = {
	id: 'lyrics',
	name: 'Lyrics',
	version: '1.0.0',
	description: 'Extensible lyrics provider with multiple source support',
	author: 'Aria',
	category: 'lyrics-provider',
	capabilities: ['provide-track-actions', 'execute-track-actions'],
	capabilitiesDetail: {
		canSearch: false,
		canStream: false,
		canDownload: false,
		requiresAuth: false,
		supportsCaching: true,
	},
};

export const LYRICS_CONFIG_SCHEMA: PluginConfigSchema[] = [
	{
		key: 'enabledProviders',
		type: 'select',
		label: 'Enabled Providers',
		description: 'Select which lyrics providers to use',
		defaultValue: ['lrclib'],
	},
	{
		key: 'providerPriority',
		type: 'select',
		label: 'Provider Priority',
		description: 'Order providers by preference (first tried first)',
		defaultValue: ['lrclib'],
	},
	{
		key: 'cacheDurationMinutes',
		type: 'number',
		label: 'Cache Duration (minutes)',
		description: 'How long to cache lyrics',
		defaultValue: 30,
		min: 0,
		max: 1440,
	},
	{
		key: 'preferSyncedLyrics',
		type: 'boolean',
		label: 'Prefer Synced Lyrics',
		description: 'Try to get time-synced lyrics first',
		defaultValue: true,
	},
];

export const DEFAULT_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
