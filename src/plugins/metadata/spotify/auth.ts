import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { SPOTIFY_AUTH_URL, SPOTIFY_SCOPES, type SpotifyConfig } from './config';
import type { SpotifyTokenResponse } from './types';

const STORAGE_KEY = 'spotify_auth_tokens';

interface StoredTokens {
	readonly accessToken: string;
	readonly refreshToken: string;
	readonly expiresAt: number;
	readonly scope: string;
}

export interface AuthState {
	readonly isAuthenticated: boolean;
	readonly accessToken: string | null;
	readonly expiresAt: number | null;
}

export class SpotifyAuthManager {
	private accessToken: string | null = null;
	private refreshToken: string | null = null;
	private expiresAt: number | null = null;
	private config: SpotifyConfig;

	constructor(config: SpotifyConfig) {
		this.config = config;
	}

	getAuthorizationUrl(state: string): string {
		const params = new URLSearchParams({
			client_id: this.config.clientId,
			response_type: 'code',
			redirect_uri: this.config.redirectUri,
			scope: SPOTIFY_SCOPES.join(' '),
			state,
			show_dialog: 'true',
		});

		return `${SPOTIFY_AUTH_URL}/authorize?${params.toString()}`;
	}

	async exchangeCode(code: string): Promise<Result<void, Error>> {
		try {
			const response = await fetch(`${SPOTIFY_AUTH_URL}/api/token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
				},
				body: new URLSearchParams({
					grant_type: 'authorization_code',
					code,
					redirect_uri: this.config.redirectUri,
				}).toString(),
			});

			if (!response.ok) {
				const error = await response.json();
				return err(
					new Error(`Token exchange failed: ${error.error_description || error.error}`)
				);
			}

			const data: SpotifyTokenResponse = await response.json();
			await this._setTokens(data);

			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async refreshAccessToken(): Promise<Result<void, Error>> {
		if (!this.refreshToken) {
			return err(new Error('No refresh token available'));
		}

		try {
			const response = await fetch(`${SPOTIFY_AUTH_URL}/api/token`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded',
					Authorization: `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`,
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: this.refreshToken,
				}).toString(),
			});

			if (!response.ok) {
				const error = await response.json();
				return err(
					new Error(`Token refresh failed: ${error.error_description || error.error}`)
				);
			}

			const data: SpotifyTokenResponse = await response.json();
			await this._setTokens(data);

			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async getAccessToken(): Promise<Result<string, Error>> {
		if (!this.accessToken) {
			const loadResult = await this._loadStoredTokens();
			if (!loadResult.success) {
				return err(new Error('Not authenticated'));
			}
		}

		if (!this.accessToken || !this.expiresAt) {
			return err(new Error('Not authenticated'));
		}

		const bufferMs = 60 * 1000;
		if (Date.now() + bufferMs >= this.expiresAt) {
			const refreshResult = await this.refreshAccessToken();
			if (!refreshResult.success) {
				return err(refreshResult.error);
			}
		}

		return ok(this.accessToken);
	}

	getAuthState(): AuthState {
		return {
			isAuthenticated: this.accessToken !== null,
			accessToken: this.accessToken,
			expiresAt: this.expiresAt,
		};
	}

	isAuthenticated(): boolean {
		return this.accessToken !== null;
	}

	async loadStoredTokens(): Promise<Result<boolean, Error>> {
		return this._loadStoredTokens();
	}

	async logout(): Promise<Result<void, Error>> {
		try {
			this.accessToken = null;
			this.refreshToken = null;
			this.expiresAt = null;
			await AsyncStorage.removeItem(STORAGE_KEY);
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private async _setTokens(data: SpotifyTokenResponse): Promise<void> {
		this.accessToken = data.access_token;
		this.expiresAt = Date.now() + data.expires_in * 1000;

		if (data.refresh_token) {
			this.refreshToken = data.refresh_token;
		}

		const storedTokens: StoredTokens = {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken!,
			expiresAt: this.expiresAt,
			scope: data.scope,
		};

		await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedTokens));
	}

	private async _loadStoredTokens(): Promise<Result<boolean, Error>> {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (!stored) {
				return ok(false);
			}

			const tokens: StoredTokens = JSON.parse(stored);
			this.accessToken = tokens.accessToken;
			this.refreshToken = tokens.refreshToken;
			this.expiresAt = tokens.expiresAt;

			return ok(true);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}
}

export function generateAuthState(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
