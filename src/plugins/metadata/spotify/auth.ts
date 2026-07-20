/**
 * Persists the `sp_dc` web-session cookie and validates it against the proxy.
 * No tokens are minted on-device; the proxy does all authenticated reads.
 */

import { BaseAuthManager, type BaseAuthState } from '@shared/auth';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { SPOTIFY_LOGIN_URL } from './config';
import { createSpotifyProxyClient, type ProxySession } from './proxy-client';

const STORAGE_KEY = 'spotify_web_session';

// Placeholder: the proxy resolves the real username from `sp_dc`.
const SESSION_IDENTIFIER_PLACEHOLDER = 'aria';

interface StoredAuth {
	readonly identifier: string;
	readonly spDc: string;
}

export interface AuthState extends BaseAuthState {
	readonly identifier: string | null;
}

export class SpotifyAuthManager extends BaseAuthManager<StoredAuth, AuthState> {
	private identifier: string | null = null;
	private spDc: string | null = null;
	private readonly proxy = createSpotifyProxyClient();

	constructor() {
		super({
			storageKey: STORAGE_KEY,
			loginUrl: SPOTIFY_LOGIN_URL,
		});
	}

	async setSession(spDc: string): Promise<Result<void, Error>> {
		const session: ProxySession = { identifier: SESSION_IDENTIFIER_PLACEHOLDER, spDc };
		const result = await this.proxy.verify(session);
		if (!result.success) {
			this.clearCredentials();
			return err(result.error);
		}

		this.spDc = spDc;
		this.identifier = result.data;
		await this.persistCredentials();
		return ok(undefined);
	}

	getSession(): ProxySession | null {
		if (!this.spDc || !this.identifier) return null;
		return { identifier: this.identifier, spDc: this.spDc };
	}

	isAuthenticated(): boolean {
		return this.spDc !== null && this.identifier !== null;
	}

	getAuthState(): AuthState {
		return {
			isAuthenticated: this.isAuthenticated(),
			identifier: this.identifier,
		};
	}

	protected clearCredentials(): void {
		this.spDc = null;
		this.identifier = null;
	}

	protected serializeForStorage(): StoredAuth | null {
		if (!this.spDc || !this.identifier) return null;
		return { identifier: this.identifier, spDc: this.spDc };
	}

	protected deserializeFromStorage(stored: StoredAuth): void {
		this.identifier = stored.identifier;
		this.spDc = stored.spDc;
	}
}
