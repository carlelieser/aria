/**
 * Plugin Lifecycle Service
 *
 * Manages plugin loading/unloading at runtime and coordinates
 * with other services to add/remove providers when plugins are toggled.
 */

import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import {
	type AudioSourceProvider,
	hasAudioSourceCapability,
} from '../../plugins/core/interfaces/audio-source-provider';
import type { PlaybackProvider } from '../../plugins/core/interfaces/playback-provider';
import type {
	PluginRegistry,
	PluginRegistryEvent,
} from '../../plugins/core/registry/plugin-registry';
import { usePluginSettingsStore, REQUIRED_PLUGINS } from '../state/plugin-settings-store';
import type { HomeFeedOperations } from '../../plugins/core/interfaces/home-feed-provider';
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
		addPlaybackProvider: (p: PlaybackProvider) => void;
		removePlaybackProvider: (id: string) => void;
	};
	downloadService: {
		addAudioSourceProvider: (p: AudioSourceProvider) => void;
		removeAudioSourceProvider: (id: string) => void;
	};
	homeFeedService: {
		addHomeFeedProvider: (id: string, ops: HomeFeedOperations) => void;
		removeHomeFeedProvider: (id: string) => void;
	};
}

export class PluginLifecycleService {
	private static instance: PluginLifecycleService | null = null;

	private pluginRegistry: PluginRegistry | null = null;
	private services: ServiceRefs | null = null;
	private unsubscribe: (() => void) | null = null;

	private constructor() {}

	static getInstance(): PluginLifecycleService {
		if (!PluginLifecycleService.instance) {
			PluginLifecycleService.instance = new PluginLifecycleService();
		}
		return PluginLifecycleService.instance;
	}

	initialize(pluginRegistry: PluginRegistry, services: ServiceRefs): void {
		this.pluginRegistry = pluginRegistry;
		this.services = services;

		this.unsubscribe = pluginRegistry.on(this._handleRegistryEvent.bind(this));
		logger.info('Plugin lifecycle service initialized');
	}

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
	 * Disable a plugin (deactivate but keep registered)
	 */
	private async _disablePlugin(pluginId: string): Promise<void> {
		logger.info(`Disabling plugin: ${pluginId}`);

		usePluginSettingsStore.getState().disablePlugin(pluginId);

		if (this.pluginRegistry) {
			const result = await this.pluginRegistry.deactivate(pluginId);
			if (!result.success) {
				logger.error(`Failed to deactivate plugin: ${pluginId}`, result.error);
			}
		}
	}

	/**
	 * Enable a plugin (activate an already-registered plugin)
	 */
	private async _enablePlugin(pluginId: string): Promise<void> {
		logger.info(`Enabling plugin: ${pluginId}`);

		usePluginSettingsStore.getState().enablePlugin(pluginId);

		if (this.pluginRegistry) {
			const result = await this.pluginRegistry.activate(pluginId);
			if (!result.success) {
				logger.error(`Failed to activate plugin: ${pluginId}`, result.error);
				usePluginSettingsStore.getState().disablePlugin(pluginId);
			}
		}
	}

	private _handleRegistryEvent(event: PluginRegistryEvent): void {
		if (!this.services || !this.pluginRegistry) return;

		switch (event.type) {
			case 'plugin-deactivated':
				this._removeProviderFromServices(event.pluginId);
				break;
			case 'plugin-activated':
				this._addProviderToServices(event.pluginId);
				break;
		}
	}

	private _removeProviderFromServices(pluginId: string): void {
		if (!this.services) return;

		logger.debug(`Removing provider from services: ${pluginId}`);

		this.services.searchService.removeMetadataProvider(pluginId);
		this.services.albumService.removeMetadataProvider(pluginId);
		this.services.artistService.removeMetadataProvider(pluginId);
		this.services.lyricsService.removeMetadataProvider(pluginId);

		this.services.homeFeedService.removeHomeFeedProvider(pluginId);

		this.services.playbackService.removeAudioSourceProvider(pluginId);
		this.services.downloadService.removeAudioSourceProvider(pluginId);

		this.services.playbackService.removePlaybackProvider(pluginId);
	}

	private _addProviderToServices(pluginId: string): void {
		if (!this.services || !this.pluginRegistry) return;

		const plugin = this.pluginRegistry.getPlugin(pluginId);
		if (!plugin) return;

		logger.debug(`Adding provider to services: ${pluginId}`);

		const metadataProviders = this.pluginRegistry.getAllMetadataProviders();
		const metadataProvider = metadataProviders.find((p) => p.manifest.id === pluginId);

		if (metadataProvider) {
			this.services.searchService.addMetadataProvider(metadataProvider);
			this.services.albumService.addMetadataProvider(metadataProvider);
			this.services.artistService.addMetadataProvider(metadataProvider);
			this.services.lyricsService.addMetadataProvider(metadataProvider);

			// Wire home feed operations if the provider supports it
			if ('homeFeed' in metadataProvider) {
				const providerWithFeed = metadataProvider as MetadataProvider & {
					homeFeed: HomeFeedOperations;
				};
				this.services.homeFeedService.addHomeFeedProvider(
					pluginId,
					providerWithFeed.homeFeed
				);
			}

			// Re-sync audio source providers from all metadata providers.
			// Metadata providers with audio source capability (e.g. YouTube Music)
			// may have been removed when they were deactivated due to the
			// single-active-per-category rule. Re-add all that qualify.
			for (const mp of metadataProviders) {
				if (hasAudioSourceCapability(mp)) {
					this.services.playbackService.addAudioSourceProvider(
						mp as unknown as AudioSourceProvider
					);
					this.services.downloadService.addAudioSourceProvider(
						mp as unknown as AudioSourceProvider
					);
				}
			}
		}

		const playbackProviders = this.pluginRegistry.getAllPlaybackProviders();
		const playbackProvider = playbackProviders.find((p) => p.manifest.id === pluginId);

		if (playbackProvider) {
			this.services.playbackService.addPlaybackProvider(playbackProvider);
		}
	}

	dispose(): void {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
		this.pluginRegistry = null;
		this.services = null;
	}
}

export const pluginLifecycleService = PluginLifecycleService.getInstance();

export async function togglePluginRuntime(pluginId: string): Promise<void> {
	return pluginLifecycleService.togglePlugin(pluginId);
}
