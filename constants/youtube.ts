/**
 * YouTube Music API - Backwards Compatibility Bridge
 *
 * This module maintains the existing API shape while delegating
 * to the new plugin-based architecture.
 *
 * @deprecated Use the YouTube Music plugin directly from src/plugins/metadata/youtube-music
 */

import { Innertube } from 'youtubei.js';
import { getYouTubeMusicProvider } from '../src/plugins/metadata/youtube-music';

/**
 * YouTube client configuration
 */
interface YouTubeClientConfig {
  lang?: string;
  location?: string;
  fetchOptions?: RequestInit;
  enableLogging?: boolean;
}

/**
 * Default configuration for the YouTube client
 */
const defaultConfig: YouTubeClientConfig = {
  lang: 'en',
  enableLogging: false,
};

// Reference to the plugin provider
let pluginProvider: ReturnType<typeof getYouTubeMusicProvider> | null = null;

/**
 * Get or initialize the plugin provider
 */
async function getProvider() {
  if (!pluginProvider) {
    pluginProvider = getYouTubeMusicProvider({
      lang: defaultConfig.lang,
      enableLogging: defaultConfig.enableLogging,
    });
    await pluginProvider.onInit({
      manifest: pluginProvider.manifest,
      eventBus: {
        emit: () => {},
        on: () => () => {},
        once: () => () => {},
        off: () => {},
      },
      config: {
        lang: defaultConfig.lang,
        enableLogging: defaultConfig.enableLogging,
      },
      logger: {
        debug: console.debug.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
      },
    });
  }
  return pluginProvider;
}

// Legacy client instance for direct access if needed
let youtubeClientInstance: Innertube | null = null;
let clientInitPromise: Promise<any> | null = null;

/**
 * Creates and returns a YouTube client instance
 * Uses a singleton pattern to ensure only one instance is created
 *
 * @deprecated Use the YouTube Music plugin instead
 * @param config Optional configuration for the YouTube client
 * @returns Promise resolving to the YouTube client instance
 */
export async function getYouTubeClient(
  config: YouTubeClientConfig = defaultConfig
): Promise<Innertube> {
  // If we already have an instance, return it
  if (youtubeClientInstance) {
    return youtubeClientInstance;
  }

  // If we're already initializing, return the existing promise
  if (clientInitPromise) {
    return clientInitPromise;
  }

  // Start initialization
  clientInitPromise = (async () => {
    try {
      youtubeClientInstance = await Innertube.create({
        ...defaultConfig,
        ...config,
      });
      return youtubeClientInstance;
    } catch (error) {
      console.error('Failed to initialize YouTube client:', error);
      // Reset the promise so we can try again
      clientInitPromise = null;
    }
  })();

  return clientInitPromise;
}

/**
 * YouTube client API wrapper
 * Provides methods to interact with YouTube API while handling client initialization
 *
 * @deprecated Use the YouTube Music plugin directly for better type safety and error handling
 */
export const youtube = {
  /**
   * Gets the home feed from YouTube
   * @deprecated Use YouTubeMusicProvider.getHomeFeed() instead
   */
  async getHomeFeed() {
    const client = await getYouTubeClient();
    return client.music.getHomeFeed();
  },

  /**
   * Searches for content on YouTube
   * @param query Search query
   * @deprecated Use YouTubeMusicProvider.search() instead
   */
  async search(query: string) {
    const client = await getYouTubeClient();
    return client.music.search(query);
  },

  /**
   * Gets search suggestions for a query
   * @param query Partial search query
   * @deprecated Use YouTubeMusicProvider.getSearchSuggestions() instead
   */
  async getSearchSuggestions(query: string) {
    const client = await getYouTubeClient();
    return client.getSearchSuggestions(query);
  },

  /**
   * Gets information about a YouTube video
   * @param videoId YouTube video ID
   * @deprecated Use YouTubeMusicProvider.getTrack() instead
   */
  async getInfo(videoId: string) {
    const client = await getYouTubeClient();
    return client.getInfo(videoId);
  },
};

/**
 * Get the YouTube Music plugin provider
 *
 * This is the recommended way to access YouTube Music functionality
 * going forward.
 */
export { getYouTubeMusicProvider } from '../src/plugins/metadata/youtube-music';
