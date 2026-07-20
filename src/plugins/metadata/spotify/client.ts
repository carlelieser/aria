/** Holds the auth manager and proxy client; issues no catalog requests itself. */

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

	destroy(): void {}
}

export function createSpotifyClient(config: SpotifyClientConfig = {}): SpotifyClient {
	return new SpotifyClient(config);
}
