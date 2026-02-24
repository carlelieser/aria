import {
	getRandomBytes,
	digestStringAsync,
	CryptoDigestAlgorithm,
	CryptoEncoding,
} from 'expo-crypto';
import { BaseAuthManager, type BaseAuthState } from '@shared/auth';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import {
	SOUNDCLOUD_CLIENT_ID,
	SOUNDCLOUD_CLIENT_SECRET,
	SOUNDCLOUD_REDIRECT_URI,
	SOUNDCLOUD_TOKEN_URL,
	SOUNDCLOUD_AUTH_URL,
	SOUNDCLOUD_SCOPES,
} from './config';

const logger = getLogger('SoundCloudAuth');

const STORAGE_KEY = 'soundcloud_oauth';
const TOKEN_BUFFER_MS = 60 * 1000;
const PKCE_VERIFIER_BYTE_LENGTH = 64;

function base64UrlEncode(bytes: Uint8Array): string {
	let binary = '';
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface StoredAuth {
	readonly refreshToken: string;
	readonly accessToken?: string;
	readonly expiresAt?: number;
}

interface SoundCloudTokenData {
	readonly access_token: string;
	readonly token_type: string;
	readonly expires_in: number;
	readonly refresh_token: string;
	readonly scope: string;
}

export interface SoundCloudAuthState extends BaseAuthState {
	readonly accessToken: string | null;
	readonly expiresAt: number | null;
}

export class SoundCloudAuthManager extends BaseAuthManager<StoredAuth, SoundCloudAuthState> {
	private refreshToken: string | null = null;
	private accessToken: string | null = null;
	private expiresAt: number | null = null;
	private _codeVerifier: string | null = null;
	private _refreshPromise: Promise<Result<string, Error>> | null = null;

	constructor() {
		super({
			storageKey: STORAGE_KEY,
			loginUrl: SOUNDCLOUD_AUTH_URL,
		});
	}

	async generateAuthUrl(): Promise<string> {
		const verifierBytes = getRandomBytes(PKCE_VERIFIER_BYTE_LENGTH);
		this._codeVerifier = base64UrlEncode(verifierBytes);

		const codeChallenge = await digestStringAsync(
			CryptoDigestAlgorithm.SHA256,
			this._codeVerifier,
			{ encoding: CryptoEncoding.BASE64 }
		);
		const codeChallengeSafe = codeChallenge
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=+$/, '');

		const stateBytes = getRandomBytes(32);
		const state = base64UrlEncode(stateBytes);

		const params = new URLSearchParams({
			client_id: SOUNDCLOUD_CLIENT_ID,
			response_type: 'code',
			redirect_uri: SOUNDCLOUD_REDIRECT_URI,
			scope: SOUNDCLOUD_SCOPES,
			code_challenge_method: 'S256',
			code_challenge: codeChallengeSafe,
			state,
			display: 'popup',
		});

		return `${SOUNDCLOUD_AUTH_URL}?${params.toString()}`;
	}

	isAuthenticated(): boolean {
		return this.refreshToken !== null;
	}

	invalidateAccessToken(): void {
		this.accessToken = null;
		this.expiresAt = null;
	}

	getAuthState(): SoundCloudAuthState {
		return {
			isAuthenticated: this.refreshToken !== null,
			accessToken: this.accessToken,
			expiresAt: this.expiresAt,
		};
	}

	protected clearCredentials(): void {
		this.refreshToken = null;
		this.accessToken = null;
		this.expiresAt = null;
		this._refreshPromise = null;
	}

	protected serializeForStorage(): StoredAuth | null {
		if (!this.refreshToken) return null;
		return {
			refreshToken: this.refreshToken,
			accessToken: this.accessToken ?? undefined,
			expiresAt: this.expiresAt ?? undefined,
		};
	}

	protected deserializeFromStorage(stored: StoredAuth): void {
		this.refreshToken = stored.refreshToken;
		this.accessToken = stored.accessToken ?? null;
		this.expiresAt = stored.expiresAt ?? null;
	}

	async exchangeAuthCode(code: string): Promise<Result<void, Error>> {
		if (!this._codeVerifier) {
			return err(new Error('No PKCE code verifier — call generateAuthUrl() first'));
		}

		try {
			const result = await this._tokenRequest({
				grant_type: 'authorization_code',
				code,
				redirect_uri: SOUNDCLOUD_REDIRECT_URI,
				code_verifier: this._codeVerifier,
			});

			this._codeVerifier = null;

			if (!result.success) return result;

			await this.persistCredentials();
			return ok(undefined);
		} catch (error) {
			this._codeVerifier = null;
			this.clearCredentials();
			return err(this.wrapError(error));
		}
	}

	async getAccessToken(): Promise<Result<string, Error>> {
		if (!this.refreshToken) {
			const loadResult = await this._loadStoredAuth();
			if (!loadResult.success || !loadResult.data) {
				return err(new Error('Not authenticated'));
			}
		}

		if (!this.refreshToken) {
			return err(new Error('Not authenticated'));
		}

		if (this.accessToken && this.expiresAt && Date.now() + TOKEN_BUFFER_MS < this.expiresAt) {
			return ok(this.accessToken);
		}

		// Deduplicate concurrent refresh calls — all callers share a single in-flight request
		if (this._refreshPromise) {
			return this._refreshPromise;
		}

		this._refreshPromise = this._refreshAccessToken();
		try {
			return await this._refreshPromise;
		} finally {
			this._refreshPromise = null;
		}
	}

	private async _refreshAccessToken(): Promise<Result<string, Error>> {
		if (!this.refreshToken) {
			return err(new Error('No refresh token available'));
		}

		logger.info('Refreshing access token');

		const result = await this._tokenRequest({
			grant_type: 'refresh_token',
			refresh_token: this.refreshToken,
		});

		if (!result.success) {
			logger.error('Token refresh failed — clearing credentials', result.error);
			this.clearCredentials();
			this.logout().catch(() => {});
			return err(new Error('Session expired. Please log in again.'));
		}

		this.persistCredentials().catch((e) =>
			logger.error('Failed to persist credentials', e instanceof Error ? e : undefined)
		);

		if (!this.accessToken) {
			return err(new Error('No access token available after refresh'));
		}

		return ok(this.accessToken);
	}

	private async _tokenRequest(params: Record<string, string>): Promise<Result<void, Error>> {
		try {
			const body = new URLSearchParams({
				...params,
				client_id: SOUNDCLOUD_CLIENT_ID,
				client_secret: SOUNDCLOUD_CLIENT_SECRET,
			}).toString();

			const response = await fetch(SOUNDCLOUD_TOKEN_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body,
			});

			if (!response.ok) {
				const errorBody = await response.text();
				logger.error(`Token request failed: ${response.status} - ${errorBody}`);
				return err(new Error(`Token request failed: ${response.status}`));
			}

			const data: SoundCloudTokenData = await response.json();
			this.accessToken = data.access_token;
			this.expiresAt = Date.now() + data.expires_in * 1000;

			if (data.refresh_token) {
				this.refreshToken = data.refresh_token;
			}

			return ok(undefined);
		} catch (error) {
			return err(this.wrapError(error));
		}
	}
}
