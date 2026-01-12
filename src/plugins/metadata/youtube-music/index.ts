import { createYouTubeMusicProvider } from './youtube-music-provider';
import type { YouTubeMusicConfig } from './config';
import { getLogger } from '@shared/services/logger';

export * from './types';
export * from './mappers';
export * from './config';
export * from './auth';
export * from './youtube-music-provider';
export * from './plugin-module';

const logger = getLogger('YouTubeMusic');

let defaultInstance: ReturnType<typeof createYouTubeMusicProvider> | null = null;

/**
 * @deprecated Use YouTubeMusicPluginModule.create() instead for clean architecture
 */
export function getYouTubeMusicProvider(
	config?: YouTubeMusicConfig
): ReturnType<typeof createYouTubeMusicProvider> {
	if (!defaultInstance) {
		defaultInstance = createYouTubeMusicProvider(config);
	}
	return defaultInstance;
}

/**
 * @deprecated Use plugin system for lifecycle management
 */
export function resetYouTubeMusicProvider(): void {
	if (defaultInstance) {
		defaultInstance.onDestroy().catch((error) => {
			logger.error('Failed to destroy provider', error instanceof Error ? error : undefined);
		});
		defaultInstance = null;
	}
}
