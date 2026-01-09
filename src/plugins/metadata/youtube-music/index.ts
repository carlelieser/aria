/**
 * YouTube Music Plugin
 *
 * Barrel export for the YouTube Music metadata provider plugin
 */

export * from './types';
export * from './mappers';
export * from './config';
export * from './youtube-music-provider';

import { createYouTubeMusicProvider, type YouTubeMusicConfig } from './youtube-music-provider';
import { getLogger } from '../../../shared/services/logger';

const logger = getLogger('YouTubeMusic');

/**
 * Singleton instance for convenience
 */
let defaultInstance: ReturnType<typeof createYouTubeMusicProvider> | null = null;

/**
 * Get or create the default YouTube Music provider instance
 */
export function getYouTubeMusicProvider(config?: YouTubeMusicConfig): ReturnType<typeof createYouTubeMusicProvider> {
  if (!defaultInstance) {
    defaultInstance = createYouTubeMusicProvider(config);
  }
  return defaultInstance;
}

/**
 * Reset the default instance (useful for testing or reconfiguration)
 */
export function resetYouTubeMusicProvider(): void {
  if (defaultInstance) {
    defaultInstance.onDestroy().catch((error) => {
      logger.error('Failed to destroy provider', error instanceof Error ? error : undefined);
    });
    defaultInstance = null;
  }
}
