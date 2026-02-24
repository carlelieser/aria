import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { SoundCloudAuthManager } from './auth';
import { SOUNDCLOUD_API_BASE_URL, SOUNDCLOUD_CLIENT_ID } from './config';
import type {
	SoundCloudTrack,
	SoundCloudUser,
	SoundCloudPlaylist,
	SoundCloudStreamsResponse,
	SoundCloudSearchResponse,
	SoundCloudRelatedTracksResponse,
	SoundCloudLikesResponse,
	SoundCloudPlaylistsResponse,
	SoundCloudErrorResponse,
} from './types';

interface RateLimitState {
	retryAfter: number | null;
	requestCount: number;
	windowStart: number;
}

export interface SoundCloudClientConfig {
	readonly clientId?: string;
}

export class SoundCloudClient {
	private readonly authManager: SoundCloudAuthManager;
	private readonly clientId: string;
	private rateLimit: RateLimitState = {
		retryAfter: null,
		requestCount: 0,
		windowStart: Date.now(),
	};

	constructor(config: SoundCloudClientConfig = {}) {
		this.clientId = config.clientId ?? SOUNDCLOUD_CLIENT_ID;
		this.authManager = new SoundCloudAuthManager();
	}

	getAuthManager(): SoundCloudAuthManager {
		return this.authManager;
	}

	private async _request<T>(
		endpoint: string,
		options: RequestInit & { requiresAuth?: boolean } = {},
		isRetry = false
	): Promise<Result<T, Error>> {
		if (this.rateLimit.retryAfter && Date.now() < this.rateLimit.retryAfter) {
			const waitTime = Math.ceil((this.rateLimit.retryAfter - Date.now()) / 1000);
			return err(new Error(`Rate limited. Retry after ${waitTime} seconds`));
		}

		const url = this._buildUrl(endpoint);
		const headers: Record<string, string> = {
			Accept: 'application/json; charset=utf-8',
			...((options.headers as Record<string, string>) ?? {}),
		};

		if (options.requiresAuth) {
			const tokenResult = await this.authManager.getAccessToken();
			if (tokenResult.success) {
				headers.Authorization = `OAuth ${tokenResult.data}`;
			} else {
				return err(tokenResult.error);
			}
		}

		try {
			const response = await fetch(url, { ...options, headers });

			if (response.status === 429) {
				const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
				this.rateLimit.retryAfter = Date.now() + retryAfter * 1000;
				return err(new Error(`Rate limited. Retry after ${retryAfter} seconds`));
			}

			if (
				(response.status === 401 || response.status === 403) &&
				options.requiresAuth &&
				!isRetry
			) {
				this.authManager.invalidateAccessToken();
				const tokenResult = await this.authManager.getAccessToken();
				if (tokenResult.success) {
					return this._request<T>(endpoint, options, true);
				}
				return err(new Error('Authentication expired. Please log in again.'));
			}

			if (!response.ok) {
				return this._handleErrorResponse(response);
			}

			if (response.status === 204) {
				return ok(undefined as T);
			}

			const data = await response.json();
			return ok(data as T);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	private _buildUrl(endpoint: string): string {
		if (endpoint.startsWith('http')) return endpoint;

		const url = new URL(`${SOUNDCLOUD_API_BASE_URL}${endpoint}`);
		if (!url.searchParams.has('client_id')) {
			url.searchParams.set('client_id', this.clientId);
		}
		return url.toString();
	}

	private async _handleErrorResponse<T>(response: Response): Promise<Result<T, Error>> {
		try {
			const errorData: SoundCloudErrorResponse = await response.json();
			const message = errorData.errors?.[0]?.error_message ?? `API error: ${response.status}`;
			return err(new Error(message));
		} catch {
			return err(new Error(`API error: ${response.status}`));
		}
	}

	async searchTracks(
		query: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudSearchResponse<SoundCloudTrack>, Error>> {
		const params = new URLSearchParams({
			q: query,
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudSearchResponse<SoundCloudTrack>>(
			`/search/tracks?${params.toString()}`
		);
	}

	async searchUsers(
		query: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudSearchResponse<SoundCloudUser>, Error>> {
		const params = new URLSearchParams({
			q: query,
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudSearchResponse<SoundCloudUser>>(
			`/search/users?${params.toString()}`
		);
	}

	async searchPlaylists(
		query: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudSearchResponse<SoundCloudPlaylist>, Error>> {
		const params = new URLSearchParams({
			q: query,
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudSearchResponse<SoundCloudPlaylist>>(
			`/search/playlists?${params.toString()}`
		);
	}

	async getTrack(trackUrn: string): Promise<Result<SoundCloudTrack, Error>> {
		return this._request<SoundCloudTrack>(`/tracks/${trackUrn}`);
	}

	async getTrackStreams(trackUrn: string): Promise<Result<SoundCloudStreamsResponse, Error>> {
		return this._request<SoundCloudStreamsResponse>(`/tracks/${trackUrn}/streams`);
	}

	async getRelatedTracks(
		trackUrn: string
	): Promise<Result<SoundCloudRelatedTracksResponse, Error>> {
		return this._request<SoundCloudRelatedTracksResponse>(`/tracks/${trackUrn}/related`);
	}

	async getUser(userUrn: string): Promise<Result<SoundCloudUser, Error>> {
		return this._request<SoundCloudUser>(`/users/${userUrn}`);
	}

	async getUserTracks(
		userUrn: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudSearchResponse<SoundCloudTrack>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudSearchResponse<SoundCloudTrack>>(
			`/users/${userUrn}/tracks?${params.toString()}`
		);
	}

	async getPlaylist(playlistUrn: string): Promise<Result<SoundCloudPlaylist, Error>> {
		return this._request<SoundCloudPlaylist>(`/playlists/${playlistUrn}`);
	}

	async resolve(url: string): Promise<Result<SoundCloudTrack | SoundCloudPlaylist, Error>> {
		const params = new URLSearchParams({ url });
		return this._request<SoundCloudTrack | SoundCloudPlaylist>(`/resolve?${params.toString()}`);
	}

	async getLikes(
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudLikesResponse, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudLikesResponse>(`/me/likes?${params.toString()}`, {
			requiresAuth: true,
		});
	}

	async getUserPlaylists(
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SoundCloudPlaylistsResponse, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		return this._request<SoundCloudPlaylistsResponse>(`/me/playlists?${params.toString()}`, {
			requiresAuth: true,
		});
	}

	async likeTrack(trackUrn: string): Promise<Result<void, Error>> {
		return this._request<void>(`/me/likes/tracks/${trackUrn}`, {
			method: 'POST',
			requiresAuth: true,
		});
	}

	async unlikeTrack(trackUrn: string): Promise<Result<void, Error>> {
		return this._request<void>(`/me/likes/tracks/${trackUrn}`, {
			method: 'DELETE',
			requiresAuth: true,
		});
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
		this.rateLimit = {
			retryAfter: null,
			requestCount: 0,
			windowStart: Date.now(),
		};
	}
}

export function createSoundCloudClient(config: SoundCloudClientConfig = {}): SoundCloudClient {
	return new SoundCloudClient(config);
}
