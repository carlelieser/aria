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
	SPOTIFY_CLIENT_ID,
	SPOTIFY_REDIRECT_URI,
	SPOTIFY_TOKEN_URL,
	SPOTIFY_AUTH_URL,
	SPOTIFY_SCOPES,
} from './config';

const logger = getLogger('SpotifyAuth');

const STORAGE_KEY = 'spotify_oauth';
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

interface SpotifyTokenResponse {
	readonly access_token: string;
	readonly token_type: string;
	readonly scope: string;
	readonly expires_in: number;
	readonly refresh_token?: string;
}

export interface AuthState extends BaseAuthState {
	readonly accessToken: string | null;
	readonly expiresAt: number | null;
}

export class SpotifyAuthManager extends BaseAuthManager<StoredAuth, AuthState> {
	private refreshToken: string | null = null;
	private accessToken: string | null = null;
	private expiresAt: number | null = null;
	private _codeVerifier: string | null = null;

	constructor() {
		super({
			storageKey: STORAGE_KEY,
			loginUrl: 'https://accounts.spotify.com/authorize',
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

		const params = new URLSearchParams({
			client_id: SPOTIFY_CLIENT_ID,
			response_type: 'code',
			redirect_uri: SPOTIFY_REDIRECT_URI,
			scope: SPOTIFY_SCOPES,
			show_dialog: 'true',
			code_challenge_method: 'S256',
			code_challenge: codeChallengeSafe,
		});

		return `${SPOTIFY_AUTH_URL}?${params.toString()}`;
	}

	isAuthenticated(): boolean {
		return this.refreshToken !== null;
	}

	getAuthState(): AuthState {
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
				redirect_uri: SPOTIFY_REDIRECT_URI,
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

		return this._refreshAccessToken();
	}

	private async _refreshAccessToken(): Promise<Result<string, Error>> {
		if (!this.refreshToken) {
			return err(new Error('No refresh token available'));
		}

		const result = await this._tokenRequest({
			grant_type: 'refresh_token',
			refresh_token: this.refreshToken,
		});

		if (!result.success) return err(result.error);

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
				client_id: SPOTIFY_CLIENT_ID,
			}).toString();

			const response = await fetch(SPOTIFY_TOKEN_URL, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body,
			});

			if (!response.ok) {
				const errorBody = await response.text();
				logger.error(`Token request failed: ${response.status} - ${errorBody}`);
				return err(new Error(`Token request failed: ${response.status}`));
			}

			const data: SpotifyTokenResponse = await response.json();
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
