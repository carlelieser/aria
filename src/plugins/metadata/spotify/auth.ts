/**
 * Spotify Authentication Manager
 *
 * Holds the user's Spotify web session (the `sp_dc` cookie captured by the
 * login WebView, plus the account identifier) and validates it against the
 * spot-api proxy. Unlike the official OAuth flow, no access tokens are minted
 * on-device: the proxy performs the browser-impersonation handshake and all
 * authenticated reads server-side. This manager only persists the session and
 * answers "are we logged in".
 */

import { BaseAuthManager, type BaseAuthState } from '@shared/auth';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { SPOTIFY_LOGIN_URL } from './config';
import { createSpotifyProxyClient, type ProxySession } from './proxy-client';

const STORAGE_KEY = 'spotify_web_session';

// The upstream session requires a non-empty identifier to construct, but the
// real username is resolved from `sp_dc`; any placeholder works.
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

	/**
	 * Stores the captured `sp_dc` cookie and validates it against the proxy.
	 * The account identifier is resolved from `sp_dc` alone by the proxy
	 * (a placeholder is sent upstream), so the login WebView only needs to
	 * capture the cookie.
	 */
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

	/** Returns the current session for proxy calls, or null if not logged in. */
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
