/**
 * Application Bootstrap
 *
 * Initializes the plugin system and application services.
 * Uses clean architecture with dependency inversion - bootstrap
 * depends on abstractions (PluginModule), not concrete plugins.
 */

import {
	type PlaybackProvider,
	type MetadataProvider,
	type AudioSourceProvider,
	hasAudioSourceCapability,
	PluginRegistry,
} from '@plugins/core';
import { PluginManifestRegistry } from '@plugins/core/registry/plugin-manifest-registry';
import { PluginLoader } from '@plugins/core/registry/plugin-loader';
import { PLUGIN_ENTRIES } from '@plugins/plugin-index';
import {
	getEnabledPluginsSet,
	getPluginConfigs,
	waitForPluginSettingsHydration,
} from './state/plugin-settings-store';
import { playbackService, searchService } from '@application/services';
import { downloadService } from './services/download-service';
import { albumService } from './services/album-service';
import { artistService } from './services/artist-service';
import { lyricsService } from './services/lyrics-service';
import { pluginLifecycleService } from './services/plugin-lifecycle-service';
import { homeFeedService } from './services/home-feed-service';
import { getLogger } from '@shared/services/logger';
import { getBootstrapProgressState } from './state/bootstrap-progress-store';

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

const CORE_PLUGINS = ['core-library'];

async function bootstrapAsync(): Promise<BootstrapResult> {
	logger.info('Initializing Aria...');
	const progress = getBootstrapProgressState();
	progress.reset();

	const pluginRegistry = PluginRegistry.getInstance();
	const manifestRegistry = PluginManifestRegistry.getInstance();

	progress.advance('Loading settings...');
	await hydrateSettings(pluginRegistry, manifestRegistry);

	const pluginCount = manifestRegistry.getAvailablePlugins().length;
	progress.setTotalSteps(1 + pluginCount + 1);

	await loadPlugins(pluginRegistry, manifestRegistry);

	progress.advance('Starting services...');
	await initAllServices(pluginRegistry);

	logger.info('Application initialized successfully');

	return { playbackService, searchService, pluginRegistry, manifestRegistry };
}

async function hydrateSettings(
	pluginRegistry: PluginRegistry,
	manifestRegistry: PluginManifestRegistry
): Promise<void> {
	await _clearExistingPlugins(pluginRegistry, manifestRegistry);
	manifestRegistry.registerAll(PLUGIN_ENTRIES);
	await waitForPluginSettingsHydration();
}

async function _clearExistingPlugins(
	pluginRegistry: PluginRegistry,
	manifestRegistry: PluginManifestRegistry
): Promise<void> {
	const existingPlugins = pluginRegistry.getAllPlugins();
	if (existingPlugins.length === 0) return;

	logger.info('Clearing existing plugin registrations (hot reload detected)');
	await pluginRegistry.dispose();
	manifestRegistry.clear();
}

async function loadPlugins(
	pluginRegistry: PluginRegistry,
	manifestRegistry: PluginManifestRegistry
): Promise<void> {
	const enabledPlugins = new Set([...CORE_PLUGINS, ...getEnabledPluginsSet()]);
	logger.info(`Enabled plugins: ${Array.from(enabledPlugins).join(', ')}`);

	const loader = new PluginLoader(pluginRegistry, manifestRegistry);
	const configs = getPluginConfigs();
	const progress = getBootstrapProgressState();

	// Register ALL plugins so config/metadata is always accessible.
	// Only auto-activate enabled ones.
	const available = manifestRegistry.getAvailablePlugins();
	for (const manifest of available) {
		progress.advance(`Loading ${manifest.name}...`);
		const isEnabled = enabledPlugins.has(manifest.id);
		const result = await loader.loadPlugin(manifest.id, {
			configs,
			autoActivate: isEnabled,
		});
		if (!result.success && result.error) {
			logger.error(`Failed to load plugin "${manifest.id}":`, result.error);
		}
	}
}

async function initAllServices(pluginRegistry: PluginRegistry): Promise<void> {
	await initServices(pluginRegistry);
	pluginLifecycleService.initialize(pluginRegistry, {
		searchService,
		albumService,
		artistService,
		lyricsService,
		playbackService,
		downloadService,
		homeFeedService,
	});
}

async function initServices(registry: PluginRegistry): Promise<void> {
	await initPlaybackProviders(registry);
	initMetadataProviders(registry);
}

async function initPlaybackProviders(registry: PluginRegistry): Promise<void> {
	const providers = registry.getActivePlaybackProviders();
	if (providers.length === 0) return;

	logger.info(`Wiring ${providers.length} active playback provider(s)...`);

	for (const provider of providers) {
		if (provider.status === 'uninitialized') {
			await provider.onInit({
				manifest: provider.manifest,
				eventBus: registry.getEventBus().scope(`plugin:${provider.manifest.id}`),
				config: {},
				logger: getLogger(provider.manifest.id),
			});
		}
	}

	playbackService.setPlaybackProviders(providers);
}

function initFeedService(registry: PluginRegistry) {
	const providers = registry.getActiveMetadataProviders();

	for (const provider of providers) {
		if ('homeFeed' in provider) {
			const providerWithFeed = provider as MetadataProvider & {
				homeFeed: Parameters<typeof homeFeedService.addHomeFeedProvider>[1];
			};
			homeFeedService.addHomeFeedProvider(provider.manifest.id, providerWithFeed.homeFeed);
		}
	}
}

function initAudioServices(registry: PluginRegistry) {
	const providers = registry.getActiveMetadataProviders();

	const audioSources = providers.filter(
		hasAudioSourceCapability
	) as unknown as AudioSourceProvider[];

	if (audioSources.length > 0) {
		logger.info(`Discovered ${audioSources.length} audio source provider(s)`);
		playbackService.setAudioSourceProviders(audioSources);
		downloadService.setAudioSourceProviders(audioSources);
	}
}

function initMetadataProviders(registry: PluginRegistry): void {
	const providers = registry.getActiveMetadataProviders();

	if (providers.length === 0) {
		logger.warn('No active metadata providers - search may not work');
		return;
	}

	logger.info(`Wiring ${providers.length} active metadata provider(s)...`);

	searchService.setMetadataProviders(providers);
	albumService.setMetadataProviders(providers);
	artistService.setMetadataProviders(providers);
	lyricsService.setMetadataProviders(providers);

	initFeedService(registry);
	homeFeedService.markReady();
	initAudioServices(registry);
}

/** @deprecated Use lazyBootstrap() instead */
export interface BootstrapOptions {
	playbackProviders?: PlaybackProvider[];
	metadataProviders?: MetadataProvider[];
	audioSourceProviders?: AudioSourceProvider[];
}

/** @deprecated Use lazyBootstrap() instead */
export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
	logger.warn('Using deprecated bootstrap() - migrate to lazyBootstrap()');

	const registry = PluginRegistry.getInstance();
	const manifestRegistry = PluginManifestRegistry.getInstance();

	if (options.playbackProviders?.length) {
		await _registerLegacyPlaybackProviders(registry, options.playbackProviders);
	}

	if (options.metadataProviders?.length) {
		await _registerLegacyMetadataProviders(registry, options);
	}

	return { playbackService, searchService, pluginRegistry: registry, manifestRegistry };
}

async function _registerLegacyPlaybackProviders(
	registry: PluginRegistry,
	providers: PlaybackProvider[]
): Promise<void> {
	for (let i = 0; i < providers.length; i++) {
		await registry.registerPlaybackProvider(providers[i], {
			priority: 10 - i,
			autoActivate: true,
		});
	}
	playbackService.setPlaybackProviders(providers);
}

async function _registerLegacyMetadataProviders(
	registry: PluginRegistry,
	options: BootstrapOptions
): Promise<void> {
	const providers = options.metadataProviders;
	if (!providers) return;
	const initializedProviders: MetadataProvider[] = [];

	for (let i = 0; i < providers.length; i++) {
		const result = await registry.registerMetadataProvider(providers[i], {
			priority: 10 - i,
			autoActivate: i === 0,
		});
		if (result.success) {
			initializedProviders.push(providers[i]);
		}
	}

	if (initializedProviders.length === 0) return;

	searchService.setMetadataProviders(initializedProviders);
	albumService.setMetadataProviders(initializedProviders);
	artistService.setMetadataProviders(initializedProviders);
	lyricsService.setMetadataProviders(initializedProviders);

	const audioSources =
		options.audioSourceProviders ??
		(initializedProviders.filter(hasAudioSourceCapability) as unknown as AudioSourceProvider[]);

	if (audioSources.length > 0) {
		playbackService.setAudioSourceProviders(audioSources);
		downloadService.setAudioSourceProviders(audioSources);
	}
}

export async function cleanup(): Promise<void> {
	logger.info('Disposing application resources...');
	await playbackService.dispose();
	await PluginRegistry.getInstance().dispose();
	PluginManifestRegistry.resetInstance();
	logger.info('Cleanup complete');
}
