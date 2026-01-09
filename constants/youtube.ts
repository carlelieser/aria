import { Innertube } from 'youtubei.js';
import { getYouTubeMusicProvider } from '../src/plugins/metadata/youtube-music';
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

let pluginProvider: ReturnType<typeof getYouTubeMusicProvider> | null = null;

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
			logger,
		});
	}
	return pluginProvider;
}

let youtubeClientInstance: Innertube | null = null;
let clientInitPromise: Promise<Innertube> | null = null;

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
