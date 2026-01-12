import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

const STORAGE_KEY = 'youtube_music_web_auth';
const YOUTUBE_MUSIC_LOGIN_URL =
	'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com';

const REQUIRED_COOKIES = ['SID', 'HSID', 'SSID', 'SAPISID'] as const;

interface StoredAuth {
	readonly cookies: string;
}

export interface YouTubeMusicAuthState {
	readonly isAuthenticated: boolean;
	readonly cookies: string | null;
}

export class YouTubeMusicAuthManager {
	private _cookies: string | null = null;

	getLoginUrl(): string {
		return YOUTUBE_MUSIC_LOGIN_URL;
	}

	async setCookies(cookies: string): Promise<Result<void, Error>> {
		try {
			const validationResult = this._validateCookies(cookies);
			if (!validationResult.success) {
				return validationResult;
			}

			this._cookies = cookies;

			const storedAuth: StoredAuth = {
				cookies,
			};
			await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storedAuth));

			return ok(undefined);
		} catch (error) {
			this._cookies = null;
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async getCookies(): Promise<Result<string, Error>> {
		if (!this._cookies) {
			const loadResult = await this._loadStoredAuth();
			if (!loadResult.success || !loadResult.data) {
				return err(new Error('Not authenticated'));
			}
		}

		if (!this._cookies) {
			return err(new Error('Not authenticated'));
		}

		return ok(this._cookies);
	}

	getAuthState(): YouTubeMusicAuthState {
		return {
			isAuthenticated: this._cookies !== null,
			cookies: this._cookies,
		};
	}

	isAuthenticated(): boolean {
		return this._cookies !== null;
	}

	async checkAuthentication(): Promise<boolean> {
		if (!this._cookies) {
			await this._loadStoredAuth();
		}
		return this._cookies !== null;
	}

	async loadStoredAuth(): Promise<Result<boolean, Error>> {
		return this._loadStoredAuth();
	}

	async logout(): Promise<Result<void, Error>> {
		try {
			this._cookies = null;
			await AsyncStorage.removeItem(STORAGE_KEY);
			return ok(undefined);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private _validateCookies(cookies: string): Result<void, Error> {
		const cookieMap = new Map<string, string>();

		for (const part of cookies.split(';')) {
			const [name, value] = part.trim().split('=');
			if (name && value) {
				cookieMap.set(name.trim(), value.trim());
			}
		}

		const missingCookies = REQUIRED_COOKIES.filter((name) => !cookieMap.has(name));

		if (missingCookies.length > 0) {
			return err(
				new Error(
					`Missing required cookies: ${missingCookies.join(', ')}. Please complete the login process.`
				)
			);
		}

		return ok(undefined);
	}

	private async _loadStoredAuth(): Promise<Result<boolean, Error>> {
		try {
			const stored = await AsyncStorage.getItem(STORAGE_KEY);
			if (!stored) {
				return ok(false);
			}

			const auth: StoredAuth = JSON.parse(stored);
			this._cookies = auth.cookies;

			return ok(true);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}
}
