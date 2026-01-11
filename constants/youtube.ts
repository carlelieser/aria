import { Innertube } from 'youtubei.js';
import { getLogger } from '../src/shared/services/logger';

const logger = getLogger('YouTube');

interface YouTubeClientConfig {
	lang?: string;
	location?: string;
	fetchOptions?: RequestInit;
	enableLogging?: boolean;
}

const defaultConfig: YouTubeClientConfig = {
	lang: 'en',
	enableLogging: false,
};

let youtubeClientInstance: Innertube | null = null;
let clientInitPromise: Promise<Innertube> | null = null;

/**
 * Preload the innertube client in the background.
 * Call this early in app startup to have the client ready when needed.
 */
export function preloadYouTubeClient(): void {
	if (youtubeClientInstance || clientInitPromise) return;

	clientInitPromise = (async () => {
		try {
			youtubeClientInstance = await Innertube.create({
				...defaultConfig,
			});
			logger.info('YouTube client preloaded successfully');
			return youtubeClientInstance;
		} catch (error) {
			logger.error(
				'Failed to preload YouTube client:',
				error instanceof Error ? error : undefined
			);
			clientInitPromise = null;
			throw error;
		}
	})();
}

export async function getYouTubeClient(
	config: YouTubeClientConfig = defaultConfig
): Promise<Innertube> {
	if (youtubeClientInstance) {
		return youtubeClientInstance;
	}

	if (clientInitPromise) {
		return clientInitPromise;
	}

	clientInitPromise = (async () => {
		try {
			youtubeClientInstance = await Innertube.create({
				...defaultConfig,
				...config,
			});
			return youtubeClientInstance;
		} catch (error) {
			logger.error(
				'Failed to initialize YouTube client:',
				error instanceof Error ? error : undefined
			);
			clientInitPromise = null;
			throw error;
		}
	})();

	return clientInitPromise;
}

export const youtube = {
	async getHomeFeed() {
		const client = await getYouTubeClient();
		return client.music.getHomeFeed();
	},

	async search(query: string) {
		const client = await getYouTubeClient();
		return client.music.search(query);
	},

	async getSearchSuggestions(query: string) {
		const client = await getYouTubeClient();
		return client.getSearchSuggestions(query);
	},

	async getInfo(videoId: string) {
		const client = await getYouTubeClient();
		return client.getInfo(videoId);
	},
};

export { getYouTubeMusicProvider } from '../src/plugins/metadata/youtube-music';
