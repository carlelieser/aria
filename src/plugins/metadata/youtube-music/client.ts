import InnertubeClient from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { YouTubeMusicConfig } from './config';
import type { YouTubeMusicAuthManager } from './auth';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('InnertubeClient');
const CACHE_DIR = 'innertube/';

class InnertubeCache {
	private readonly _cacheDir: string;

	constructor() {
		this._cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	}

	get cache_dir(): string {
		return this._cacheDir;
	}

	/**
	 * Clear session data from cache.
	 * This forces youtubei.js to regenerate session data with fresh visitor_data
	 * on the next client creation, which is necessary when authentication changes.
	 */
	async clearSessionData(): Promise<void> {
		try {
			await this.remove('innertube_session_data');
			logger.debug('Cleared innertube session data from cache');
		} catch {
			// Ignore errors - cache might not exist
		}
	}

	async get(key: string): Promise<ArrayBuffer | undefined> {
		try {
			const filePath = this._cacheDir + key;
			const info = await FileSystem.getInfoAsync(filePath);
			if (!info.exists) return undefined;

			const content = await FileSystem.readAsStringAsync(filePath, {
				encoding: FileSystem.EncodingType.Base64,
			});
			const binary = atob(content);
			const bytes = new Uint8Array(binary.length);
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i);
			}
			return bytes.buffer;
		} catch {
			return undefined;
		}
	}

	async set(key: string, value: ArrayBuffer): Promise<void> {
		try {
			await FileSystem.makeDirectoryAsync(this._cacheDir, { intermediates: true }).catch(
				() => {}
			);
			const filePath = this._cacheDir + key;
			const bytes = new Uint8Array(value);
			let binary = '';
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i]);
			}
			const base64 = btoa(binary);
			await FileSystem.writeAsStringAsync(filePath, base64, {
				encoding: FileSystem.EncodingType.Base64,
			});
		} catch {
			// Ignore cache write errors
		}
	}

	async remove(key: string): Promise<void> {
		try {
			const filePath = this._cacheDir + key;
			await FileSystem.deleteAsync(filePath, { idempotent: true });
		} catch {
			// Ignore cache removal errors
		}
	}
}

const innertubeCache = new InnertubeCache();

// Shared preloaded client instance for faster startup
let preloadedClient: InnertubeClient | null = null;
let preloadPromise: Promise<InnertubeClient> | null = null;

/**
 * Preload the innertube client in the background.
 * Call this early in app startup to have the client ready when needed.
 */
export function preloadInnertubeClient(config?: Partial<YouTubeMusicConfig>): void {
	if (preloadedClient || preloadPromise) return;

	preloadPromise = (async () => {
		try {
			preloadedClient = await InnertubeClient.create({
				lang: config?.lang ?? 'en',
				location: config?.location,
				cache: innertubeCache,
			});
			logger.info('Innertube client preloaded successfully');
			return preloadedClient;
		} catch (error) {
			logger.error(
				'Failed to preload innertube client:',
				error instanceof Error ? error : undefined
			);
			preloadPromise = null;
			throw error;
		}
	})();
}

/**
 * Get the preloaded client if available, otherwise return null.
 */
export function getPreloadedClient(): InnertubeClient | null {
	return preloadedClient;
}

/**
 * Get the preload promise if preloading is in progress.
 */
export function getPreloadPromise(): Promise<InnertubeClient> | null {
	return preloadPromise;
}

export interface ClientManager {
	getClient(): Promise<InnertubeClient>;
	createFreshClient(): Promise<InnertubeClient>;
	refreshAuth(): Promise<void>;
	destroy(): void;
	isInitialized(): boolean;
	getCookies(): Promise<string | undefined>;
}

export function createClientManager(
	config: YouTubeMusicConfig,
	authManager?: YouTubeMusicAuthManager
): ClientManager {
	let client: InnertubeClient | null = null;
	let initPromise: Promise<InnertubeClient> | null = null;

	async function createClient(): Promise<InnertubeClient> {
		// Get cookies from auth manager if available
		let cookie: string | undefined;
		if (authManager) {
			const cookiesResult = await authManager.getCookies();
			if (cookiesResult.success) {
				cookie = cookiesResult.data;
				// Log cookie names for debugging (not values for security)
				const cookieNames = cookie
					.split(';')
					.map((c) => c.trim().split('=')[0])
					.filter(Boolean);
				logger.info(`Creating authenticated client with ${cookieNames.length} cookies`);
				logger.debug(`Cookie names: ${cookieNames.join(', ')}`);
			} else {
				logger.info('Creating unauthenticated client (no cookies available)');
			}
		} else {
			logger.info('Creating unauthenticated client (no auth manager)');
		}

		const client = await InnertubeClient.create({
			lang: config.lang,
			location: config.location,
			cache: innertubeCache,
			cookie,
		});

		logger.info(`Client created - logged_in: ${client.session.logged_in}`);
		return client;
	}

	return {
		async getClient(): Promise<InnertubeClient> {
			// Return cached client if available
			if (client) {
				logger.debug(`Returning cached client - logged_in: ${client.session.logged_in}`);
				return client;
			}

			// If auth manager is provided, create a client with current auth state
			if (authManager) {
				logger.debug('Creating new client with auth manager');
				initPromise = createClient();

				try {
					client = await initPromise;
					logger.debug(
						`New authenticated client ready - logged_in: ${client.session.logged_in}`
					);
					return client;
				} catch (error) {
					initPromise = null;
					throw error;
				}
			}

			// Use preloaded client if available (for unauthenticated access only)
			if (preloadedClient) {
				logger.debug('Using preloaded unauthenticated client');
				client = preloadedClient;
				return client;
			}

			// Use preload promise if preloading is in progress
			if (preloadPromise && !initPromise) {
				logger.debug('Waiting for preload to complete');
				initPromise = preloadPromise;
			}

			if (initPromise) return initPromise;

			// Fall back to creating a new unauthenticated client
			logger.debug('Creating new unauthenticated client (no auth manager)');
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

		async getCookies(): Promise<string | undefined> {
			if (!authManager) {
				return undefined;
			}
			const result = await authManager.getCookies();
			return result.success ? result.data : undefined;
		},

		async refreshAuth(): Promise<void> {
			// Clear all client instances to force recreation with new auth
			client = null;
			initPromise = null;

			// Also clear the preloaded client since it was created without auth
			preloadedClient = null;
			preloadPromise = null;

			// Clear session cache to ensure fresh visitor_data with new auth
			await innertubeCache.clearSessionData();

			logger.info('Auth refreshed, all clients cleared and session cache purged');
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
