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
			}
		}

		return InnertubeClient.create({
			lang: config.lang,
			location: config.location,
			cache: innertubeCache,
			cookie,
		});
	}

	return {
		async getClient(): Promise<InnertubeClient> {
			if (client) return client;

			// If auth manager is provided, always create a fresh client
			// to ensure we have the latest auth state
			if (authManager) {
				initPromise = createClient();

				try {
					client = await initPromise;
					return client;
				} catch (error) {
					initPromise = null;
					throw error;
				}
			}

			// Use preloaded client if available (for unauthenticated access)
			if (preloadedClient) {
				client = preloadedClient;
				return client;
			}

			// Use preload promise if preloading is in progress
			if (preloadPromise && !initPromise) {
				initPromise = preloadPromise;
			}

			if (initPromise) return initPromise;

			// Fall back to creating a new client
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

		async refreshAuth(): Promise<void> {
			// Clear current client to force recreation with new auth
			client = null;
			initPromise = null;
			logger.info('Auth refreshed, client will be recreated on next request');
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
