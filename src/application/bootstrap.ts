/**
 * Application Bootstrap
 *
 * Initializes the plugin system and application services.
 * Uses clean architecture with dependency inversion - bootstrap
 * depends on abstractions (PluginModule), not concrete plugins.
 */

import type { PlaybackProvider } from '../plugins/core/interfaces/playback-provider';
import type { MetadataProvider } from '../plugins/core/interfaces/metadata-provider';
import {
	type AudioSourceProvider,
	hasAudioSourceCapability,
} from '../plugins/core/interfaces/audio-source-provider';
import { PluginRegistry } from '../plugins/core/registry/plugin-registry';
import { PluginManifestRegistry } from '../plugins/core/registry/plugin-manifest-registry';
import { PluginLoader } from '../plugins/core/registry/plugin-loader';
import { PLUGIN_ENTRIES } from '../plugins/plugin-index';
import {
	getEnabledPluginsSet,
	getPluginConfigs,
	waitForPluginSettingsHydration,
} from './state/plugin-settings-store';
import { playbackService } from './services/playback-service';
import { searchService } from './services/search-service';
import { downloadService } from './services/download-service';
import { albumService } from './services/album-service';
import { artistService } from './services/artist-service';
import { lyricsService } from './services/lyrics-service';
import { pluginLifecycleService } from './services/plugin-lifecycle-service';
import { getLogger } from '../shared/services/logger';

const logger = getLogger('Bootstrap');

// Lazy bootstrap state
let isBootstrapping = false;
let isBootstrapped = false;
let bootstrapPromise: Promise<BootstrapResult> | null = null;

/**
 * Non-blocking lazy bootstrap - starts initialization in background
 * Safe to call multiple times, will only run once
 */
export function lazyBootstrap(): void {
	if (isBootstrapped || isBootstrapping) return;

	isBootstrapping = true;

	bootstrapAsync()
		.then((result) => {
			bootstrapPromise = Promise.resolve(result);
			isBootstrapped = true;
			isBootstrapping = false;
			logger.info('Lazy bootstrap complete');
		})
		.catch((error) => {
			isBootstrapping = false;
			logger.error('Lazy bootstrap failed:', error instanceof Error ? error : undefined);
		});
}

/**
 * Ensures bootstrap is complete before continuing
 * Returns immediately if already bootstrapped
 */
export async function ensureBootstrapped(): Promise<BootstrapResult | null> {
	if (isBootstrapped && bootstrapPromise) {
		return bootstrapPromise;
	}

	if (!isBootstrapping) {
		lazyBootstrap();
	}

	// Wait for bootstrap to complete
	return new Promise((resolve) => {
		const check = () => {
			if (isBootstrapped) {
				resolve(bootstrapPromise);
			} else {
				setTimeout(check, 50);
			}
		};
		check();
	});
}

export interface BootstrapResult {
	playbackService: typeof playbackService;
	searchService: typeof searchService;
	pluginRegistry: PluginRegistry;
	manifestRegistry: PluginManifestRegistry;
}

/**
 * Main async bootstrap function using the new plugin system
 */
async function bootstrapAsync(): Promise<BootstrapResult> {
	logger.info('Initializing Aria application with plugin system...');

	// Get registries
	const pluginRegistry = PluginRegistry.getInstance();
	const manifestRegistry = PluginManifestRegistry.getInstance();

	// Clear existing registrations (hot reload support)
	const existingPlugins = pluginRegistry.getAllPlugins();
	if (existingPlugins.length > 0) {
		logger.info('Clearing existing plugin registrations (hot reload detected)');
		await pluginRegistry.dispose();
		manifestRegistry.clear();
	}

	// Register all available plugin manifests
	logger.info(`Registering ${PLUGIN_ENTRIES.length} plugin manifest(s)...`);
	manifestRegistry.registerAll(PLUGIN_ENTRIES);

	// Wait for plugin settings to be hydrated from AsyncStorage
	await waitForPluginSettingsHydration();

	// Get enabled plugins from settings
	const userEnabledPlugins = getEnabledPluginsSet();
	const pluginConfigs = getPluginConfigs();

	// Force-enable core plugins regardless of user settings
	const CORE_PLUGINS = ['core-library'];
	const enabledPlugins = new Set([...CORE_PLUGINS, ...userEnabledPlugins]);

	logger.info(`Enabled plugins: ${Array.from(enabledPlugins).join(', ')}`);

	// Create loader and load enabled plugins
	const loader = new PluginLoader(pluginRegistry, manifestRegistry);
	const loadResult = await loader.loadEnabledPlugins(enabledPlugins, {
		configs: pluginConfigs,
		autoActivate: true,
	});

	if (loadResult.failed.length > 0) {
		for (const failure of loadResult.failed) {
			logger.error(`Failed to load plugin "${failure.pluginId}":`, failure.error);
		}
	}

	// Wire up services with loaded providers
	await wireServices(pluginRegistry);

	// Initialize plugin lifecycle service for runtime plugin management
	pluginLifecycleService.initialize(pluginRegistry, loader, manifestRegistry, {
		searchService,
		albumService,
		artistService,
		lyricsService,
		playbackService,
		downloadService,
	});

	logger.info('Application initialized successfully');

	return {
		playbackService,
		searchService,
		pluginRegistry,
		manifestRegistry,
	};
}

/**
 * Wire services with loaded providers from the registry
 */
async function wireServices(registry: PluginRegistry): Promise<void> {
	// Get playback providers
	const playbackProviders = registry.getAllPlaybackProviders();
	if (playbackProviders.length > 0) {
		logger.info(`Wiring ${playbackProviders.length} playback provider(s) to services...`);

		// Initialize playback providers
		for (const provider of playbackProviders) {
			if (provider.status === 'uninitialized') {
				await provider.onInit({
					manifest: provider.manifest,
					eventBus: registry.getEventBus().scope(`plugin:${provider.manifest.id}`),
					config: {},
					logger: getLogger(provider.manifest.id),
				});
			}
		}

		playbackService.setPlaybackProviders(playbackProviders);
	}

	// Get metadata providers
	const metadataProviders = registry.getAllMetadataProviders();
	if (metadataProviders.length > 0) {
		logger.info(`Wiring ${metadataProviders.length} metadata provider(s) to services...`);

		searchService.setMetadataProviders(metadataProviders);
		albumService.setMetadataProviders(metadataProviders);
		artistService.setMetadataProviders(metadataProviders);
		lyricsService.setMetadataProviders(metadataProviders);

		// Discover audio source providers from metadata providers
		const audioSources = metadataProviders.filter(
			hasAudioSourceCapability
		) as unknown as AudioSourceProvider[];

		if (audioSources.length > 0) {
			logger.info(`Discovered ${audioSources.length} audio source provider(s)`);
			playbackService.setAudioSourceProviders(audioSources);
			downloadService.setAudioSourceProviders(audioSources);
		}
	} else {
		logger.warn('No metadata providers loaded - search may not work');
	}
}

/**
 * Legacy bootstrap interface for backwards compatibility
 * @deprecated Use lazyBootstrap() instead
 */
export interface BootstrapOptions {
	playbackProviders?: PlaybackProvider[];
	metadataProviders?: MetadataProvider[];
	audioSourceProviders?: AudioSourceProvider[];
}

/**
 * Legacy bootstrap function for backwards compatibility
 * @deprecated Use lazyBootstrap() instead
 */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
	logger.warn('Using deprecated bootstrap() - consider migrating to lazyBootstrap()');

	const registry = PluginRegistry.getInstance();
	const manifestRegistry = PluginManifestRegistry.getInstance();

	// Handle legacy options
	if (options.playbackProviders && options.playbackProviders.length > 0) {
		for (let i = 0; i < options.playbackProviders.length; i++) {
			const provider = options.playbackProviders[i];
			await registry.registerPlaybackProvider(provider, {
				priority: 10 - i,
				autoActivate: true,
			});
		}
		playbackService.setPlaybackProviders(options.playbackProviders);
	}

	if (options.metadataProviders && options.metadataProviders.length > 0) {
		const initializedProviders: MetadataProvider[] = [];

		for (let i = 0; i < options.metadataProviders.length; i++) {
			const provider = options.metadataProviders[i];
			const result = await registry.registerMetadataProvider(provider, {
				priority: 10 - i,
				autoActivate: i === 0,
			});

			if (result.success) {
				initializedProviders.push(provider);
			}
		}

		if (initializedProviders.length > 0) {
			searchService.setMetadataProviders(initializedProviders);
			albumService.setMetadataProviders(initializedProviders);
			artistService.setMetadataProviders(initializedProviders);
			lyricsService.setMetadataProviders(initializedProviders);

			const audioSources =
				options.audioSourceProviders ??
				(initializedProviders.filter(
					hasAudioSourceCapability
				) as unknown as AudioSourceProvider[]);

			if (audioSources.length > 0) {
				playbackService.setAudioSourceProviders(audioSources);
				downloadService.setAudioSourceProviders(audioSources);
			}
		}
	}

	return {
		playbackService,
		searchService,
		pluginRegistry: registry,
		manifestRegistry,
	};
}

export async function cleanup(): Promise<void> {
	logger.info('Disposing application resources...');
	await playbackService.dispose();
	await PluginRegistry.getInstance().dispose();
	PluginManifestRegistry.resetInstance();
	logger.info('Cleanup complete');
}
