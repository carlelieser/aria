/**
 * Plugin Settings Store
 *
 * Manages plugin enable/disable state and per-plugin configuration.
 * Persisted to AsyncStorage for settings that survive app restarts.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PluginConfig } from '../../plugins/core/interfaces/base-plugin';

/**
 * Default enabled plugins - these are loaded on first launch
 */
export const DEFAULT_ENABLED_PLUGINS: string[] = [
	'youtube-music',
	'expo-audio',
	'dash-player',
	'core-library',
];

/**
 * Core plugins that cannot be disabled
 */
export const REQUIRED_PLUGINS: string[] = ['expo-audio', 'core-library'];

const EMPTY_CONFIG: PluginConfig = Object.freeze({} as PluginConfig);

interface PluginSettingsState {
	/** Set of enabled plugin IDs */
	enabledPlugins: string[];

	/** Per-plugin configuration */
	pluginConfigs: Record<string, PluginConfig>;

	/** Check if a plugin is enabled */
	isPluginEnabled: (pluginId: string) => boolean;

	/** Enable a plugin */
	enablePlugin: (pluginId: string) => void;

	/** Disable a plugin */
	disablePlugin: (pluginId: string) => void;

	/** Toggle a plugin's enabled state */
	togglePlugin: (pluginId: string) => void;

	/** Set multiple plugins as enabled */
	setEnabledPlugins: (pluginIds: string[]) => void;

	/** Get configuration for a plugin */
	getPluginConfig: (pluginId: string) => PluginConfig;

	/** Set configuration for a plugin */
	setPluginConfig: (pluginId: string, config: PluginConfig) => void;

	/** Update partial configuration for a plugin */
	updatePluginConfig: (pluginId: string, updates: Partial<PluginConfig>) => void;

	/** Clear configuration for a plugin */
	clearPluginConfig: (pluginId: string) => void;

	/** Reset all plugin settings to defaults */
	resetPluginSettings: () => void;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		return AsyncStorage.getItem(name);
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

let resolveHydration: (() => void) | null = null;
const hydrationPromise = new Promise<void>((resolve) => {
	resolveHydration = resolve;
});

export const usePluginSettingsStore = create<PluginSettingsState>()(
	persist(
		(set, get) => ({
			enabledPlugins: DEFAULT_ENABLED_PLUGINS,
			pluginConfigs: {},

			isPluginEnabled: (pluginId: string) => {
				// Required plugins are always considered enabled
				if (REQUIRED_PLUGINS.includes(pluginId)) {
					return true;
				}
				return get().enabledPlugins.includes(pluginId);
			},

			enablePlugin: (pluginId: string) => {
				const { enabledPlugins } = get();
				if (!enabledPlugins.includes(pluginId)) {
					set({ enabledPlugins: [...enabledPlugins, pluginId] });
				}
			},

			disablePlugin: (pluginId: string) => {
				if (REQUIRED_PLUGINS.includes(pluginId)) {
					return; // Cannot disable required plugins
				}
				const { enabledPlugins } = get();
				set({
					enabledPlugins: enabledPlugins.filter((id) => id !== pluginId),
				});
			},

			togglePlugin: (pluginId: string) => {
				const { enabledPlugins } = get();
				if (enabledPlugins.includes(pluginId)) {
					if (REQUIRED_PLUGINS.includes(pluginId)) {
						return; // Cannot disable required plugins
					}
					set({
						enabledPlugins: enabledPlugins.filter((id) => id !== pluginId),
					});
				} else {
					set({ enabledPlugins: [...enabledPlugins, pluginId] });
				}
			},

			setEnabledPlugins: (pluginIds: string[]) => {
				// Ensure required plugins are always included
				const withRequired = Array.from(new Set([...pluginIds, ...REQUIRED_PLUGINS]));
				set({ enabledPlugins: withRequired });
			},

			getPluginConfig: (pluginId: string) => {
				return get().pluginConfigs[pluginId] ?? EMPTY_CONFIG;
			},

			setPluginConfig: (pluginId: string, config: PluginConfig) => {
				const { pluginConfigs } = get();
				set({
					pluginConfigs: {
						...pluginConfigs,
						[pluginId]: config,
					},
				});
			},

			updatePluginConfig: (pluginId: string, updates: Partial<PluginConfig>) => {
				const { pluginConfigs } = get();
				const existing = pluginConfigs[pluginId] ?? EMPTY_CONFIG;
				set({
					pluginConfigs: {
						...pluginConfigs,
						[pluginId]: { ...existing, ...updates },
					},
				});
			},

			clearPluginConfig: (pluginId: string) => {
				const { pluginConfigs } = get();
				const { [pluginId]: _, ...rest } = pluginConfigs;
				set({ pluginConfigs: rest });
			},

			resetPluginSettings: () => {
				set({
					enabledPlugins: DEFAULT_ENABLED_PLUGINS,
					pluginConfigs: {},
				});
			},
		}),
		{
			name: 'aria-plugin-settings',
			storage: createJSONStorage(() => customStorage),
			onRehydrateStorage: () => {
				return () => {
					resolveHydration?.();
				};
			},
		}
	)
);

// Selector hooks
export const useEnabledPlugins = () => usePluginSettingsStore((state) => state.enabledPlugins);

export const useIsPluginEnabled = (pluginId: string) =>
	usePluginSettingsStore(
		(state) => REQUIRED_PLUGINS.includes(pluginId) || state.enabledPlugins.includes(pluginId)
	);

export const useTogglePlugin = () => usePluginSettingsStore((state) => state.togglePlugin);

export const usePluginConfig = (pluginId: string) =>
	usePluginSettingsStore((state) => state.pluginConfigs[pluginId] ?? EMPTY_CONFIG);

export const useSetPluginConfig = () => usePluginSettingsStore((state) => state.setPluginConfig);

export const useResetPluginSettings = () =>
	usePluginSettingsStore((state) => state.resetPluginSettings);

/**
 * Wait for the plugin settings store to be hydrated from AsyncStorage
 */
export function waitForPluginSettingsHydration(): Promise<void> {
	return hydrationPromise;
}

/**
 * Get enabled plugins as a Set (for efficient lookups)
 * Note: Call waitForPluginSettingsHydration() first to ensure persisted state is loaded
 */
export function getEnabledPluginsSet(): Set<string> {
	return new Set(usePluginSettingsStore.getState().enabledPlugins);
}

/**
 * Get all plugin configs
 * Note: Call waitForPluginSettingsHydration() first to ensure persisted state is loaded
 */
export function getPluginConfigs(): Record<string, PluginConfig> {
	return usePluginSettingsStore.getState().pluginConfigs;
}
