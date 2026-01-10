import InnertubeClient from 'youtubei.js/react-native';
import type { YouTubeMusicConfig } from './config';

export interface ClientManager {
	getClient(): Promise<InnertubeClient>;
	createFreshClient(): Promise<InnertubeClient>;
	destroy(): void;
	isInitialized(): boolean;
}

export function createClientManager(config: YouTubeMusicConfig): ClientManager {
	let client: InnertubeClient | null = null;
	let initPromise: Promise<InnertubeClient> | null = null;

	async function createClient(): Promise<InnertubeClient> {
		return InnertubeClient.create({
			lang: config.lang,
			location: config.location,
		});
	}

	return {
		async getClient(): Promise<InnertubeClient> {
			if (client) return client;

			if (initPromise) return initPromise;

			initPromise = createClient();

			try {
				client = await initPromise;
				return client;
			} catch (error) {
				initPromise = null;
				throw error;
			}
		},

		async createFreshClient(): Promise<InnertubeClient> {
			return createClient();
		},

		destroy(): void {
			client = null;
			initPromise = null;
		},

		isInitialized(): boolean {
			return client !== null;
		},
	};
}
