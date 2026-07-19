/**
 * Spotify Client
 *
 * Holds the Spotify web session (auth manager) and the spot-api proxy client.
 * The direct Spotify Web API is no longer reachable from the app, so this
 * client no longer issues catalog/library requests itself — library import
 * goes through the proxy. Retained methods cover session lifecycle only.
 */

import type { Result } from '@shared/types/result';
import { SpotifyAuthManager } from './auth';
import { createSpotifyProxyClient, type SpotifyProxyClient } from './proxy-client';

export interface SpotifyClientConfig {
	readonly market?: string;
}

export class SpotifyClient {
	private authManager: SpotifyAuthManager;
	private proxyClient: SpotifyProxyClient;

	constructor(_config: SpotifyClientConfig = {}) {
		this.authManager = new SpotifyAuthManager();
		this.proxyClient = createSpotifyProxyClient();
	}

	getAuthManager(): SpotifyAuthManager {
		return this.authManager;
	}

	getProxyClient(): SpotifyProxyClient {
		return this.proxyClient;
	}

	async initialize(): Promise<Result<boolean, Error>> {
		return this.authManager.loadStoredAuth();
	}

	isAuthenticated(): boolean {
		return this.authManager.isAuthenticated();
	}

	async checkAuthentication(): Promise<boolean> {
		return this.authManager.checkAuthentication();
	}

	destroy(): void {
		// No persistent resources to release.
	}
}

export function createSpotifyClient(config: SpotifyClientConfig = {}): SpotifyClient {
	return new SpotifyClient(config);
}
