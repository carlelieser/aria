import { BaseAuthManager, type BaseAuthState } from '@shared/auth';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('YouTubeMusic:Auth');
const STORAGE_KEY = 'youtube_music_web_auth';
const YOUTUBE_MUSIC_LOGIN_URL =
	'https://accounts.google.com/ServiceLogin?service=youtube&continue=https://music.youtube.com';

const REQUIRED_COOKIES = ['SID', 'HSID', 'SSID', 'SAPISID'] as const;

interface StoredAuth {
	readonly cookies: string;
}

export interface YouTubeMusicAuthState extends BaseAuthState {
	readonly cookies: string | null;
}

export class YouTubeMusicAuthManager extends BaseAuthManager<StoredAuth, YouTubeMusicAuthState> {
	private _cookies: string | null = null;

	constructor() {
		super({
			storageKey: STORAGE_KEY,
			loginUrl: YOUTUBE_MUSIC_LOGIN_URL,
		});
	}

	isAuthenticated(): boolean {
		return this._cookies !== null;
	}

	getAuthState(): YouTubeMusicAuthState {
		return {
			isAuthenticated: this._cookies !== null,
			cookies: this._cookies,
		};
	}

	protected clearCredentials(): void {
		this._cookies = null;
	}

	protected serializeForStorage(): StoredAuth | null {
		if (!this._cookies) return null;
		return {
			cookies: this._cookies,
		};
	}

	protected deserializeFromStorage(stored: StoredAuth): void {
		this._cookies = stored.cookies;
	}

	async setCookies(cookies: string): Promise<Result<void, Error>> {
		try {
			const validationResult = this._validateCookies(cookies);
			if (!validationResult.success) {
				logger.error('Cookie validation failed', validationResult.error);
				return validationResult;
			}

			this._cookies = cookies;

			const cookieNames = cookies
				.split(';')
				.map((c) => c.trim().split('=')[0])
				.filter(Boolean);
			logger.info(`Cookies set successfully (${cookieNames.length} cookies)`);
			logger.debug(`Cookie names: ${cookieNames.join(', ')}`);

			await this.persistCredentials();

			return ok(undefined);
		} catch (error) {
			this._cookies = null;
			logger.error('Failed to set cookies', error instanceof Error ? error : undefined);
			return err(this.wrapError(error));
		}
	}

	async getCookies(): Promise<Result<string, Error>> {
		if (!this._cookies) {
			logger.debug('No cookies in memory, loading from storage');
			const loadResult = await this._loadStoredAuth();
			if (!loadResult.success || !loadResult.data) {
				logger.debug('No stored cookies found');
				return err(new Error('Not authenticated'));
			}
		}

		if (!this._cookies) {
			logger.debug('Still no cookies after load attempt');
			return err(new Error('Not authenticated'));
		}

		const cookieNames = this._cookies
			.split(';')
			.map((c) => c.trim().split('=')[0])
			.filter(Boolean);
		logger.debug(`Returning ${cookieNames.length} cookies`);

		return ok(this._cookies);
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
}
