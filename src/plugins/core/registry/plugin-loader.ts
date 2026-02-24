/**
 * PluginLoader
 *
 * Handles loading and instantiating plugins from the manifest registry
 * into the plugin registry. Integrates with plugin settings for
 * enable/disable functionality.
 */

import type { PluginConfig } from '../interfaces/base-plugin';
import type { PluginBatchLoadResult, PluginLoadResult } from '../interfaces/plugin-module';
import { PluginManifestRegistry } from './plugin-manifest-registry';
import { PluginRegistry } from './plugin-registry';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('PluginLoader');

export interface PluginLoaderOptions {
	/** Plugin configurations by plugin ID */
	readonly configs?: Record<string, PluginConfig>;

	/** Whether to auto-activate plugins after loading */
	readonly autoActivate?: boolean;
}

export class PluginLoader {
	constructor(
		private readonly pluginRegistry: PluginRegistry,
		private readonly manifestRegistry: PluginManifestRegistry
	) {}

	async loadPlugin(
		pluginId: string,
		options: PluginLoaderOptions = {}
	): Promise<PluginLoadResult> {
		const { configs = {}, autoActivate = true } = options;

		try {
			if (this.pluginRegistry.getPlugin(pluginId)) {
				logger.debug(`Plugin "${pluginId}" already loaded, skipping`);
				return { pluginId, success: true };
			}

			const module = await this.manifestRegistry.loadPlugin(pluginId);

			if (module.validate) {
				await module.validate();
			}

			const config = {
				...module.defaultConfig,
				...configs[pluginId],
			};

			const plugin = await module.create(config);

			const result = await this.pluginRegistry.register({
				plugin,
				config,
				autoActivate,
			});

			if (!result.success) {
				throw result.error;
			}

			const initResult = await this.pluginRegistry.initialize(pluginId);
			if (!initResult.success) {
				throw initResult.error;
			}

			logger.info(`Plugin "${pluginId}" loaded successfully`);
			return { pluginId, success: true };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`Failed to load plugin "${pluginId}"`, err);
			return { pluginId, success: false, error: err };
		}
	}

	async loadPlugins(
		pluginIds: string[],
		options: PluginLoaderOptions = {}
	): Promise<PluginBatchLoadResult> {
		const loaded: string[] = [];
		const failed: { pluginId: string; error: Error }[] = [];

		for (const pluginId of pluginIds) {
			const result = await this.loadPlugin(pluginId, options);

			if (result.success) {
				loaded.push(pluginId);
			} else if (result.error) {
				failed.push({ pluginId, error: result.error });
			}
		}

		logger.info(`Loaded ${loaded.length}/${pluginIds.length} plugins`);

		return { loaded, failed };
	}

	async loadEnabledPlugins(
		enabledPluginIds: Set<string>,
		options: PluginLoaderOptions = {}
	): Promise<PluginBatchLoadResult> {
		const available = this.manifestRegistry.getAvailablePlugins();
		const toLoad = available
			.filter((manifest) => enabledPluginIds.has(manifest.id))
			.map((manifest) => manifest.id);

		logger.info(`Loading ${toLoad.length} enabled plugins...`);
		return this.loadPlugins(toLoad, options);
	}

	async loadAllPlugins(options: PluginLoaderOptions = {}): Promise<PluginBatchLoadResult> {
		const available = this.manifestRegistry.getAvailablePlugins();
		const pluginIds = available.map((manifest) => manifest.id);

		logger.info(`Loading all ${pluginIds.length} available plugins...`);
		return this.loadPlugins(pluginIds, options);
	}

	async unloadPlugin(pluginId: string): Promise<PluginLoadResult> {
		try {
			const result = await this.pluginRegistry.unregister(pluginId);

			if (!result.success) {
				throw result.error;
			}

			logger.info(`Plugin "${pluginId}" unloaded successfully`);
			return { pluginId, success: true };
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			logger.error(`Failed to unload plugin "${pluginId}"`, err);
			return { pluginId, success: false, error: err };
		}
	}

	async reloadPlugin(
		pluginId: string,
		options: PluginLoaderOptions = {}
	): Promise<PluginLoadResult> {
		await this.unloadPlugin(pluginId);
		return this.loadPlugin(pluginId, options);
	}
}

export function createPluginLoader(): PluginLoader {
	return new PluginLoader(PluginRegistry.getInstance(), PluginManifestRegistry.getInstance());
}
