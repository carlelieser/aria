/**
 * PluginModule Interface
 *
 * Defines the contract for plugin modules that support self-registration.
 * Each plugin exports a PluginModule that the registry can discover without
 * instantiating the plugin.
 */

import type { BasePlugin, PluginConfig, PluginManifest } from './base-plugin';

/**
 * Factory function type for creating plugin instances
 */
export type PluginFactory<T extends BasePlugin = BasePlugin> = (
	config?: PluginConfig
) => T | Promise<T>;

/**
 * Plugin module definition - exported by each plugin for discovery
 */
export interface PluginModule<T extends BasePlugin = BasePlugin> {
	/** Static manifest for discovery without instantiation */
	readonly manifest: PluginManifest;

	/** Factory function to create plugin instance */
	readonly create: PluginFactory<T>;

	/** Optional validation before loading */
	readonly validate?: () => Promise<void>;

	/** Default configuration values */
	readonly defaultConfig?: PluginConfig;
}

/**
 * Entry in the manifest registry - supports lazy loading
 */
export interface PluginManifestEntry {
	/** Static manifest data */
	readonly manifest: PluginManifest;

	/** Lazy loader for the plugin module */
	readonly load: () => Promise<PluginModule>;

	/** Whether this plugin is a core/built-in plugin */
	readonly isBuiltIn?: boolean;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
	readonly pluginId: string;
	readonly success: boolean;
	readonly error?: Error;
}

/**
 * Batch loading result
 */
export interface PluginBatchLoadResult {
	readonly loaded: string[];
	readonly failed: { pluginId: string; error: Error }[];
}
