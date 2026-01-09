import { createYouTubeMusicProvider } from './youtube-music-provider';
import type { YouTubeMusicConfig } from './config';
import { getLogger } from '@shared/services/logger';

export * from './types';
export * from './mappers';
export * from './config';
export * from './youtube-music-provider';

const logger = getLogger('YouTubeMusic');

let defaultInstance: ReturnType<typeof createYouTubeMusicProvider> | null = null;

export function getYouTubeMusicProvider(
	config?: YouTubeMusicConfig
): ReturnType<typeof createYouTubeMusicProvider> {
	if (!defaultInstance) {
		defaultInstance = createYouTubeMusicProvider(config);
	}
	return defaultInstance;
}

export function resetYouTubeMusicProvider(): void {
	if (defaultInstance) {
		defaultInstance.onDestroy().catch((error) => {
			logger.error('Failed to destroy provider', error instanceof Error ? error : undefined);
		});
		defaultInstance = null;
	}
}
