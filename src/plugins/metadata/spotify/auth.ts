import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

const STORAGE_KEY = 'spotify_web_auth';
const TOKEN_ENDPOINT = 'https://open.spotify.com/get_access_token?reason=transport&productType=web_player';

interface StoredAuth {
	readonly spDcCookie: string;
	readonly accessToken?: string;
	readonly expiresAt?: number;
}

interface SpotifyWebTokenResponse {
	readonly accessToken: string;
	readonly accessTokenExpirationTimestampMs: number;
	readonly isAnonymous: boolean;
	readonly clientId: string;
}

export interface AuthState {
	readonly isAuthenticated: boolean;
	readonly accessToken: string | null;
	readonly expiresAt: number | null;
}

export class SpotifyAuthManager {
	private spDcCookie: string | null = null;
	private accessToken: string | null = null;
	private expiresAt: number | null = null;

	getLoginUrl(): string {
		return 'https://accounts.spotify.com/login';
	}

	async setSpDcCookie(cookie: string): Promise<Result<void, Error>> {
		try {
			this.spDcCookie = cookie;

			// Immediately try to get an access token to validate the cookie
			const tokenResult = await this._fetchAccessToken();
			if (!tokenResult.success) {
				this.spDcCookie = null;
				return err(tokenResult.error);
			}

			// Store the cookie
			const storedAuth: StoredAuth = {
				spDcCookie: cookie,
				accessToken: this.accessToken ?? undefined,
				expiresAt: this.expiresAt ?? undefined,
			};
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedAuth));

			return ok(undefined);
		} catch (error) {
			this.spDcCookie = null;
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async getAccessToken(): Promise<Result<string, Error>> {
		// Try to load stored auth if not already loaded
		if (!this.spDcCookie) {
			const loadResult = await this._loadStoredAuth();
			if (!loadResult.success || !loadResult.data) {
				return err(new Error('Not authenticated'));
			}
		}

		if (!this.spDcCookie) {
			return err(new Error('Not authenticated'));
		}

		// Check if we have a valid cached token
		const bufferMs = 60 * 1000;
		if (this.accessToken && this.expiresAt && Date.now() + bufferMs < this.expiresAt) {
			return ok(this.accessToken);
		}

		// Fetch a new access token
		return this._fetchAccessToken();
	}

	private async _fetchAccessToken(): Promise<Result<string, Error>> {
		if (!this.spDcCookie) {
			return err(new Error('No sp_dc cookie available'));
		}

		try {
			const response = await fetch(TOKEN_ENDPOINT, {
				headers: {
					Cookie: `sp_dc=${this.spDcCookie}`,
					'User-Agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
				},
			});

			if (!response.ok) {
				return err(new Error(`Failed to get access token: ${response.status}`));
			}

			const data: SpotifyWebTokenResponse = await response.json();

			if (data.isAnonymous) {
				return err(new Error('Session expired. Please log in again.'));
			}

			this.accessToken = data.accessToken;
			this.expiresAt = data.accessTokenExpirationTimestampMs;

			// Update stored auth with new token
			const storedAuth: StoredAuth = {
				spDcCookie: this.spDcCookie,
				accessToken: this.accessToken,
				expiresAt: this.expiresAt,
			};
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedAuth));

			return ok(this.accessToken);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	getAuthState(): AuthState {
		return {
			isAuthenticated: this.spDcCookie !== null,
			accessToken: this.accessToken,
			expiresAt: this.expiresAt,
		};
	}

	isAuthenticated(): boolean {
		return this.spDcCookie !== null;
	}

	async loadStoredAuth(): Promise<Result<boolean, Error>> {
		return this._loadStoredAuth();
	}

	async logout(): Promise<Result<void, Error>> {
		try {
			this.spDcCookie = null;
			this.accessToken = null;
			this.expiresAt = null;
			await AsyncStorage.removeItem(STORAGE_KEY);
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private async _loadStoredAuth(): Promise<Result<boolean, Error>> {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (!stored) {
				return ok(false);
			}

			const auth: StoredAuth = JSON.parse(stored);
			this.spDcCookie = auth.spDcCookie;
			this.accessToken = auth.accessToken ?? null;
			this.expiresAt = auth.expiresAt ?? null;

			return ok(true);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
