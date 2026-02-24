/**
 * Plugin Registry Facade
 *
 * Application-layer facade for accessing plugin registry operations.
 * Hooks and components access plugin operations through this service
 * instead of importing from the plugins layer directly.
 */

import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import { PluginManifestRegistry } from '@/src/plugins/core/registry/plugin-manifest-registry';
import type { PluginConfigSchema } from '@shared/types/plugin-config-schema';
import type { PluginStatus, PluginCategory } from '@shared/types/plugin-types';
import type { OAuthCapablePlugin } from '@shared/types/oauth-capable-plugin';
import { isOAuthCapable } from '@shared/types/oauth-capable-plugin';

export interface PluginManifestInfo {
	readonly id: string;
	readonly name: string;
	readonly shortName?: string;
	readonly version: string;
	readonly description?: string;
	readonly category: PluginCategory;
	readonly capabilities: string[];
	readonly capabilitiesDetail?: {
		readonly requiresAuth?: boolean;
	};
	readonly iconUrl?: string;
}

/**
 * Get a plugin instance by ID from the registry.
 */
export function getPlugin(pluginId: string): unknown | undefined {
	return PluginRegistry.getInstance().getPlugin(pluginId);
}

/**
 * Get a typed plugin from the registry with a cast.
 */
export function getTypedPlugin<T>(pluginId: string): T | null {
	const plugin = PluginRegistry.getInstance().getPlugin(pluginId);
	return (plugin as T) ?? null;
}

/**
 * Get an OAuth-capable plugin by ID.
 */
export function getOAuthPlugin(pluginId: string): OAuthCapablePlugin | null {
	const plugin = PluginRegistry.getInstance().getPlugin(pluginId);
	if (!plugin || !isOAuthCapable(plugin)) {
		return null;
	}
	return plugin;
}

/**
 * Get the config schema for a plugin.
 */
export function getPluginConfigSchema(pluginId: string): PluginConfigSchema[] {
	const plugin = PluginRegistry.getInstance().getPlugin(pluginId);
	return plugin?.configSchema ?? [];
}

/**
 * Get plugin status.
 */
export function getPluginStatus(pluginId: string): PluginStatus | undefined {
	return PluginRegistry.getInstance().getStatus(pluginId);
}

/**
 * Get a plugin manifest by ID.
 */
export function getPluginManifest(pluginId: string): PluginManifestInfo | null {
	const manifest = PluginManifestRegistry.getInstance().getManifest(pluginId);
	if (!manifest) return null;

	return {
		id: manifest.id,
		name: manifest.name,
		shortName: manifest.shortName,
		version: manifest.version,
		description: manifest.description,
		category: manifest.category,
		capabilities: manifest.capabilities || [],
		capabilitiesDetail: manifest.capabilitiesDetail,
		iconUrl: manifest.iconUrl,
	};
}

/**
 * Get all available plugin manifests.
 */
export function getAllPluginManifests(): PluginManifestInfo[] {
	return PluginManifestRegistry.getInstance()
		.getAvailablePlugins()
		.map((manifest) => ({
			id: manifest.id,
			name: manifest.name,
			shortName: manifest.shortName,
			version: manifest.version,
			description: manifest.description,
			category: manifest.category,
			capabilities: manifest.capabilities || [],
			capabilitiesDetail: manifest.capabilitiesDetail,
			iconUrl: manifest.iconUrl,
		}));
}

/**
 * Check if a plugin has a specific capability.
 */
export function hasPluginCapability(pluginId: string, capability: string): boolean {
	const manifest = PluginManifestRegistry.getInstance().getManifest(pluginId);
	return manifest?.capabilities?.includes(capability) ?? false;
}

/**
 * Trigger a library import for a plugin that supports it.
 */
export async function triggerPluginImport(pluginId: string): Promise<void> {
	const plugin = PluginRegistry.getInstance().getPlugin(pluginId);
	if (!plugin || !('import' in plugin)) return;

	const importOps = (plugin as { import: { importLibrary: () => Promise<unknown> } }).import;
	await importOps.importLibrary();
}

/**
 * Subscribe to plugin registry events. Returns unsubscribe function.
 */
export function subscribeToPluginEvents(handler: (event: unknown) => void): () => void {
	return PluginRegistry.getInstance().on(handler);
}
