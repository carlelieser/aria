import type { PlaybackProvider } from '../plugins/core/interfaces/playback-provider';
import type { MetadataProvider } from '../plugins/core/interfaces/metadata-provider';
import {
	type AudioSourceProvider,
	hasAudioSourceCapability,
} from '../plugins/core/interfaces/audio-source-provider';
import { PluginRegistry } from '../plugins/core/registry/plugin-registry';
import { playbackService } from './services/playback-service';
import { searchService } from './services/search-service';
import { downloadService } from './services/download-service';
import { albumService } from './services/album-service';
import { getLogger } from '../shared/services/logger';

const logger = getLogger('Bootstrap');

export interface BootstrapResult {
	playbackService: typeof playbackService;
	searchService: typeof searchService;
	pluginRegistry: PluginRegistry;
}

export interface BootstrapOptions {
	playbackProviders?: PlaybackProvider[];
	metadataProviders?: MetadataProvider[];

	audioSourceProviders?: AudioSourceProvider[];
}

export async function bootstrap(options: BootstrapOptions = {}): Promise<BootstrapResult> {
	logger.info('Initializing Aria application...');

	const registry = PluginRegistry.getInstance();

	const existingPlugins = registry.getAllPlugins();
	if (existingPlugins.length > 0) {
		logger.info('Clearing existing plugin registrations (hot reload detected)');
		await registry.dispose();
	}

	if (options.playbackProviders && options.playbackProviders.length > 0) {
		logger.info(`Registering ${options.playbackProviders.length} playback provider(s)...`);

		for (let i = 0; i < options.playbackProviders.length; i++) {
			const provider = options.playbackProviders[i];
			logger.debug(`Registering playback provider: ${provider.manifest.id}`);

			await registry.registerPlaybackProvider(provider, {
				priority: 10 - i,
				autoActivate: true,
			});
		}

		playbackService.setPlaybackProviders(options.playbackProviders);
	}

	if (options.metadataProviders && options.metadataProviders.length > 0) {
		logger.info(`Registering ${options.metadataProviders.length} metadata provider(s)...`);

		const initializedProviders: MetadataProvider[] = [];

		for (let i = 0; i < options.metadataProviders.length; i++) {
			const provider = options.metadataProviders[i];
			logger.debug(`Registering provider: ${provider.manifest.id}...`);

			const result = await registry.registerMetadataProvider(provider, {
				priority: 10 - i,
				autoActivate: i === 0,
			});

			if (result.success) {
				logger.debug(`Provider ${provider.manifest.id} registered successfully`);
				initializedProviders.push(provider);
			} else {
				logger.error(`Failed to register provider ${provider.manifest.id}`, result.error);
			}
		}

		if (initializedProviders.length > 0) {
			searchService.setMetadataProviders(initializedProviders);
			albumService.setMetadataProviders(initializedProviders);
			logger.info(`${initializedProviders.length} metadata provider(s) ready for use`);
		} else {
			logger.warn('No metadata providers were successfully initialized');
		}

		let audioSources: AudioSourceProvider[] = [];

		if (options.audioSourceProviders && options.audioSourceProviders.length > 0) {
			audioSources = options.audioSourceProviders;
			logger.debug(`Using ${audioSources.length} explicit audio source provider(s)`);
		} else {
			audioSources = initializedProviders.filter(
				hasAudioSourceCapability
			) as unknown as AudioSourceProvider[];
			if (audioSources.length > 0) {
				logger.debug(
					`Auto-detected ${audioSources.length} audio source provider(s) from metadata providers`
				);
			}
		}

		if (audioSources.length > 0) {
			playbackService.setAudioSourceProviders(audioSources);
			downloadService.setAudioSourceProviders(audioSources);
			logger.info(
				`${audioSources.length} audio source provider(s) ready for playback and downloads`
			);
		} else {
			logger.warn('No audio source providers available - playback may not work');
		}
	}

	logger.info('Application initialized successfully');

	return {
		playbackService,
		searchService,
		pluginRegistry: registry,
	};
}

export async function cleanup(): Promise<void> {
	logger.info('Disposing application resources...');
	await playbackService.dispose();
	logger.info('Cleanup complete');
}
