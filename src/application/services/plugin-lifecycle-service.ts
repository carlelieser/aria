/**
 * Plugin Lifecycle Service
 *
 * Manages plugin loading/unloading at runtime and coordinates
 * with other services to add/remove providers when plugins are toggled.
 */

import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import type { AudioSourceProvider } from '../../plugins/core/interfaces/audio-source-provider';
import type { PluginRegistry, PluginRegistryEvent } from '../../plugins/core/registry/plugin-registry';
import type { PluginLoader } from '../../plugins/core/registry/plugin-loader';
import type { PluginManifestRegistry } from '../../plugins/core/registry/plugin-manifest-registry';
import { usePluginSettingsStore, REQUIRED_PLUGINS } from '../state/plugin-settings-store';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('PluginLifecycleService');

interface ServiceRefs {
	searchService: {
		addMetadataProvider: (p: MetadataProvider) => void;
		removeMetadataProvider: (id: string) => void;
	};
	albumService: {
		addMetadataProvider: (p: MetadataProvider) => void;
		removeMetadataProvider: (id: string) => void;
	};
	artistService: {
		addMetadataProvider: (p: MetadataProvider) => void;
		removeMetadataProvider: (id: string) => void;
	};
	lyricsService: {
		addMetadataProvider: (p: MetadataProvider) => void;
		removeMetadataProvider: (id: string) => void;
	};
	playbackService: {
		addAudioSourceProvider: (p: AudioSourceProvider) => void;
		removeAudioSourceProvider: (id: string) => void;
	};
	downloadService: {
		addAudioSourceProvider: (p: AudioSourceProvider) => void;
		removeAudioSourceProvider: (id: string) => void;
	};
}

export class PluginLifecycleService {
	private static instance: PluginLifecycleService | null = null;

	private pluginRegistry: PluginRegistry | null = null;
	private pluginLoader: PluginLoader | null = null;
	private manifestRegistry: PluginManifestRegistry | null = null;
	private services: ServiceRefs | null = null;
	private unsubscribe: (() => void) | null = null;

	private constructor() {}

	static getInstance(): PluginLifecycleService {
		if (!PluginLifecycleService.instance) {
			PluginLifecycleService.instance = new PluginLifecycleService();
		}
		return PluginLifecycleService.instance;
	}

	/**
	 * Initialize the lifecycle service with required dependencies
	 */
	initialize(
		pluginRegistry: PluginRegistry,
		pluginLoader: PluginLoader,
		manifestRegistry: PluginManifestRegistry,
		services: ServiceRefs
	): void {
		this.pluginRegistry = pluginRegistry;
		this.pluginLoader = pluginLoader;
		this.manifestRegistry = manifestRegistry;
		this.services = services;

		this.unsubscribe = pluginRegistry.on(this._handleRegistryEvent.bind(this));
		logger.info('Plugin lifecycle service initialized');
	}

	/**
	 * Toggle a plugin's enabled state and load/unload accordingly
	 */
	async togglePlugin(pluginId: string): Promise<void> {
		if (REQUIRED_PLUGINS.includes(pluginId)) {
			logger.warn(`Cannot toggle required plugin: ${pluginId}`);
			return;
		}

		const store = usePluginSettingsStore.getState();
		const isCurrentlyEnabled = store.isPluginEnabled(pluginId);

		if (isCurrentlyEnabled) {
			await this._disablePlugin(pluginId);
		} else {
			await this._enablePlugin(pluginId);
		}
	}

	/**
	 * Disable and unload a plugin
	 */
	private async _disablePlugin(pluginId: string): Promise<void> {
		logger.info(`Disabling plugin: ${pluginId}`);

		// Update store first
		usePluginSettingsStore.getState().disablePlugin(pluginId);

		// Unload the plugin (this triggers registry events)
		if (this.pluginLoader) {
			const result = await this.pluginLoader.unloadPlugin(pluginId);
			if (!result.success) {
				logger.error(`Failed to unload plugin: ${pluginId}`, result.error);
			}
		}
	}

	/**
	 * Enable and load a plugin
	 */
	private async _enablePlugin(pluginId: string): Promise<void> {
		logger.info(`Enabling plugin: ${pluginId}`);

		// Update store first
		usePluginSettingsStore.getState().enablePlugin(pluginId);

		// Load the plugin (this triggers registry events)
		if (this.pluginLoader) {
			const configs = usePluginSettingsStore.getState().pluginConfigs;
			const result = await this.pluginLoader.loadPlugin(pluginId, {
				configs,
				autoActivate: true,
			});
			if (!result.success) {
				logger.error(`Failed to load plugin: ${pluginId}`, result.error);
				// Revert store state on failure
				usePluginSettingsStore.getState().disablePlugin(pluginId);
			}
		}
	}

	/**
	 * Handle registry events to update services
	 */
	private _handleRegistryEvent(event: PluginRegistryEvent): void {
		if (!this.services || !this.pluginRegistry) return;

		switch (event.type) {
			case 'plugin-unregistered':
				this._removeProviderFromServices(event.pluginId);
				break;
			case 'plugin-initialized':
				this._addProviderToServices(event.pluginId);
				break;
		}
	}

	/**
	 * Remove a provider from all services
	 */
	private _removeProviderFromServices(pluginId: string): void {
		if (!this.services) return;

		logger.debug(`Removing provider from services: ${pluginId}`);

		// Remove from metadata-consuming services
		this.services.searchService.removeMetadataProvider(pluginId);
		this.services.albumService.removeMetadataProvider(pluginId);
		this.services.artistService.removeMetadataProvider(pluginId);
		this.services.lyricsService.removeMetadataProvider(pluginId);

		// Remove from audio source services
		this.services.playbackService.removeAudioSourceProvider(pluginId);
		this.services.downloadService.removeAudioSourceProvider(pluginId);
	}

	/**
	 * Add a provider to all relevant services
	 */
	private _addProviderToServices(pluginId: string): void {
		if (!this.services || !this.pluginRegistry) return;

		const plugin = this.pluginRegistry.getPlugin(pluginId);
		if (!plugin) return;

		logger.debug(`Adding provider to services: ${pluginId}`);

		// Check if it's a metadata provider
		const metadataProviders = this.pluginRegistry.getAllMetadataProviders();
		const metadataProvider = metadataProviders.find((p) => p.manifest.id === pluginId);

		if (metadataProvider) {
			this.services.searchService.addMetadataProvider(metadataProvider);
			this.services.albumService.addMetadataProvider(metadataProvider);
			this.services.artistService.addMetadataProvider(metadataProvider);
			this.services.lyricsService.addMetadataProvider(metadataProvider);

			// Check if it also has audio source capability
			const audioSourceProviders = this.pluginRegistry.getAllAudioSourceProviders();
			const audioSourceProvider = audioSourceProviders.find((p) => p.manifest.id === pluginId);

			if (audioSourceProvider) {
				this.services.playbackService.addAudioSourceProvider(audioSourceProvider);
				this.services.downloadService.addAudioSourceProvider(audioSourceProvider);
			}
		}
	}

	/**
	 * Dispose the service
	 */
	dispose(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.pluginRegistry = null;
		this.pluginLoader = null;
		this.manifestRegistry = null;
		this.services = null;
	}
}

export const pluginLifecycleService = PluginLifecycleService.getInstance();

/**
 * Toggle a plugin at runtime (convenience function)
 */
export async function togglePluginRuntime(pluginId: string): Promise<void> {
	return pluginLifecycleService.togglePlugin(pluginId);
}
