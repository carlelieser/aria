/**
 * PluginManifestRegistry
 *
 * A registry for plugin manifests that supports lazy loading.
 * Allows discovery of available plugins without instantiating them.
 */

import type { PluginManifest, PluginCategory } from '../interfaces/base-plugin';
import type { PluginManifestEntry, PluginModule } from '../interfaces/plugin-module';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('PluginManifestRegistry');

export class PluginManifestRegistry {
	private static _instance: PluginManifestRegistry | null = null;

	private readonly entries = new Map<string, PluginManifestEntry>();

	private constructor() {}

	static getInstance(): PluginManifestRegistry {
		if (!PluginManifestRegistry._instance) {
			PluginManifestRegistry._instance = new PluginManifestRegistry();
		}
		return PluginManifestRegistry._instance;
	}

	static resetInstance(): void {
		PluginManifestRegistry._instance = null;
	}

	/**
	 * Register a plugin manifest entry for lazy loading
	 */
	register(entry: PluginManifestEntry): void {
		const { manifest } = entry;

		if (this.entries.has(manifest.id)) {
			logger.warn(`Plugin "${manifest.id}" is already registered, replacing`);
		}

		this.entries.set(manifest.id, entry);
		logger.debug(`Registered manifest for plugin: ${manifest.id}`);
	}

	/**
	 * Register multiple plugin manifest entries
	 */
	registerAll(entries: PluginManifestEntry[]): void {
		for (const entry of entries) {
			this.register(entry);
		}
	}

	/**
	 * Get all registered plugin manifests
	 */
	getAvailablePlugins(): PluginManifest[] {
		return Array.from(this.entries.values()).map((entry) => entry.manifest);
	}

	/**
	 * Get manifests filtered by category
	 */
	getPluginsByCategory(category: PluginCategory): PluginManifest[] {
		return Array.from(this.entries.values())
			.filter((entry) => entry.manifest.category === category)
			.map((entry) => entry.manifest);
	}

	/**
	 * Get built-in plugins only
	 */
	getBuiltInPlugins(): PluginManifest[] {
		return Array.from(this.entries.values())
			.filter((entry) => entry.isBuiltIn === true)
			.map((entry) => entry.manifest);
	}

	/**
	 * Get a specific plugin manifest
	 */
	getManifest(pluginId: string): PluginManifest | undefined {
		return this.entries.get(pluginId)?.manifest;
	}

	/**
	 * Check if a plugin is registered
	 */
	has(pluginId: string): boolean {
		return this.entries.has(pluginId);
	}

	/**
	 * Load a plugin module (lazy loading)
	 */
	async loadPlugin(pluginId: string): Promise<PluginModule> {
		const entry = this.entries.get(pluginId);

		if (!entry) {
			throw new Error(`Plugin "${pluginId}" is not registered`);
		}

		logger.debug(`Loading plugin module: ${pluginId}`);

		try {
			const module = await entry.load();
			logger.debug(`Plugin module loaded: ${pluginId}`);
			return module;
		} catch (error) {
			logger.error(
				`Failed to load plugin "${pluginId}"`,
				error instanceof Error ? error : undefined
			);
			throw error;
		}
	}

	/**
	 * Unregister a plugin manifest
	 */
	unregister(pluginId: string): boolean {
		const deleted = this.entries.delete(pluginId);
		if (deleted) {
			logger.debug(`Unregistered manifest for plugin: ${pluginId}`);
		}
		return deleted;
	}

	/**
	 * Clear all registered manifests
	 */
	clear(): void {
		this.entries.clear();
		logger.debug('Cleared all plugin manifests');
	}

	/**
	 * Get the count of registered plugins
	 */
	get size(): number {
		return this.entries.size;
	}
}

export function getPluginManifestRegistry(): PluginManifestRegistry {
	return PluginManifestRegistry.getInstance();
}
