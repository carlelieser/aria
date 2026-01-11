import InnertubeClient from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { YouTubeMusicConfig } from './config';

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
			cache: innertubeCache,
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
