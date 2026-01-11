import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { SpotifyAuthManager } from './auth';
import { SPOTIFY_API_BASE_URL } from './config';
import type {
	SpotifyErrorResponse,
	SpotifySearchResponse,
	SpotifyTrack,
	SpotifyAlbum,
	SpotifyArtist,
	SpotifyPlaylist,
	SpotifyPagingObject,
	SpotifySavedTrack,
	SpotifySavedAlbum,
	SpotifySimplifiedAlbum,
	SpotifySimplifiedPlaylist,
	SpotifySimplifiedTrack,
	SpotifyFollowedArtistsResponse,
	SpotifyRecommendationsResponse,
	SpotifyNewReleasesResponse,
} from './types';

interface RateLimitState {
	retryAfter: number | null;
	requestCount: number;
	windowStart: number;
}

export interface SpotifyClientConfig {
	readonly market?: string;
}

export class SpotifyClient {
	private authManager: SpotifyAuthManager;
	private config: SpotifyClientConfig;
	private rateLimit: RateLimitState = {
		retryAfter: null,
		requestCount: 0,
		windowStart: Date.now(),
	};

	constructor(config: SpotifyClientConfig = {}) {
		this.config = config;
		this.authManager = new SpotifyAuthManager();
	}

	getAuthManager(): SpotifyAuthManager {
		return this.authManager;
	}

	private async _request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<Result<T, Error>> {
		if (this.rateLimit.retryAfter && Date.now() < this.rateLimit.retryAfter) {
			const waitTime = Math.ceil((this.rateLimit.retryAfter - Date.now()) / 1000);
			return err(new Error(`Rate limited. Retry after ${waitTime} seconds`));
		}

		const tokenResult = await this.authManager.getAccessToken();
		if (!tokenResult.success) {
			return err(tokenResult.error);
		}

		const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_API_BASE_URL}${endpoint}`;

		try {
			const response = await fetch(url, {
				...options,
				headers: {
					Authorization: `Bearer ${tokenResult.data}`,
					'Content-Type': 'application/json',
					...options.headers,
				},
			});

			if (response.status === 429) {
				const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
				this.rateLimit.retryAfter = Date.now() + retryAfter * 1000;
				return err(new Error(`Rate limited. Retry after ${retryAfter} seconds`));
			}

			if (response.status === 401) {
				// Token expired - try to get a new one
				const tokenResult = await this.authManager.getAccessToken();
				if (tokenResult.success) {
					return this._request<T>(endpoint, options);
				}
				return err(new Error('Authentication expired. Please log in again.'));
			}

			if (!response.ok) {
				const errorData: SpotifyErrorResponse = await response.json();
				return err(new Error(errorData.error?.message || `API error: ${response.status}`));
			}

			if (response.status === 204) {
				return ok(undefined as T);
			}

			const data = await response.json();
			// Debug: Log raw API response for search requests
			if (endpoint.includes('/search')) {
				console.log(
					'[SpotifyClient] Search response:',
					JSON.stringify(data, null, 2).slice(0, 2000)
				);
			}
			return ok(data as T);
		} catch (error) {
			return err(error instanceof Error ? error : new Error(String(error)));
		}
	}

	async search(
		query: string,
		types: ('track' | 'album' | 'artist' | 'playlist')[],
		options: { limit?: number; offset?: number; market?: string } = {}
	): Promise<Result<SpotifySearchResponse, Error>> {
		const params = new URLSearchParams({
			q: query,
			type: types.join(','),
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		if (options.market || this.config.market) {
			params.set('market', options.market || this.config.market!);
		}

		return this._request<SpotifySearchResponse>(`/search?${params.toString()}`);
	}

	async getTrack(trackId: string): Promise<Result<SpotifyTrack, Error>> {
		const params = this.config.market ? `?market=${this.config.market}` : '';
		return this._request<SpotifyTrack>(`/tracks/${trackId}${params}`);
	}

	async getTracks(trackIds: string[]): Promise<Result<{ tracks: SpotifyTrack[] }, Error>> {
		const params = new URLSearchParams({
			ids: trackIds.slice(0, 50).join(','),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<{ tracks: SpotifyTrack[] }>(`/tracks?${params.toString()}`);
	}

	async getAlbum(albumId: string): Promise<Result<SpotifyAlbum, Error>> {
		const params = this.config.market ? `?market=${this.config.market}` : '';
		return this._request<SpotifyAlbum>(`/albums/${albumId}${params}`);
	}

	async getAlbums(albumIds: string[]): Promise<Result<{ albums: SpotifyAlbum[] }, Error>> {
		const params = new URLSearchParams({
			ids: albumIds.slice(0, 20).join(','),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<{ albums: SpotifyAlbum[] }>(`/albums?${params.toString()}`);
	}

	async getAlbumTracks(
		albumId: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SpotifyPagingObject<SpotifySimplifiedTrack>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyPagingObject<SpotifySimplifiedTrack>>(
			`/albums/${albumId}/tracks?${params.toString()}`
		);
	}

	async getArtist(artistId: string): Promise<Result<SpotifyArtist, Error>> {
		return this._request<SpotifyArtist>(`/artists/${artistId}`);
	}

	async getArtists(artistIds: string[]): Promise<Result<{ artists: SpotifyArtist[] }, Error>> {
		const params = new URLSearchParams({
			ids: artistIds.slice(0, 50).join(','),
		});

		return this._request<{ artists: SpotifyArtist[] }>(`/artists?${params.toString()}`);
	}

	async getArtistAlbums(
		artistId: string,
		options: {
			include_groups?: ('album' | 'single' | 'appears_on' | 'compilation')[];
			limit?: number;
			offset?: number;
		} = {}
	): Promise<Result<SpotifyPagingObject<SpotifySimplifiedAlbum>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		if (options.include_groups) {
			params.set('include_groups', options.include_groups.join(','));
		}

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyPagingObject<SpotifySimplifiedAlbum>>(
			`/artists/${artistId}/albums?${params.toString()}`
		);
	}

	async getArtistTopTracks(artistId: string): Promise<Result<{ tracks: SpotifyTrack[] }, Error>> {
		const market = this.config.market || 'US';
		return this._request<{ tracks: SpotifyTrack[] }>(
			`/artists/${artistId}/top-tracks?market=${market}`
		);
	}

	async getPlaylist(playlistId: string): Promise<Result<SpotifyPlaylist, Error>> {
		const params = this.config.market ? `?market=${this.config.market}` : '';
		return this._request<SpotifyPlaylist>(`/playlists/${playlistId}${params}`);
	}

	async getPlaylistTracks(
		playlistId: string,
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SpotifyPagingObject<{ track: SpotifyTrack; added_at: string }>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyPagingObject<{ track: SpotifyTrack; added_at: string }>>(
			`/playlists/${playlistId}/tracks?${params.toString()}`
		);
	}

	async getSavedTracks(
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SpotifyPagingObject<SpotifySavedTrack>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyPagingObject<SpotifySavedTrack>>(
			`/me/tracks?${params.toString()}`
		);
	}

	async saveTracks(trackIds: string[]): Promise<Result<void, Error>> {
		return this._request<void>('/me/tracks', {
			method: 'PUT',
			body: JSON.stringify({ ids: trackIds.slice(0, 50) }),
		});
	}

	async removeSavedTracks(trackIds: string[]): Promise<Result<void, Error>> {
		return this._request<void>('/me/tracks', {
			method: 'DELETE',
			body: JSON.stringify({ ids: trackIds.slice(0, 50) }),
		});
	}

	async checkSavedTracks(trackIds: string[]): Promise<Result<boolean[], Error>> {
		const params = new URLSearchParams({
			ids: trackIds.slice(0, 50).join(','),
		});

		return this._request<boolean[]>(`/me/tracks/contains?${params.toString()}`);
	}

	async getSavedAlbums(
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SpotifyPagingObject<SpotifySavedAlbum>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyPagingObject<SpotifySavedAlbum>>(
			`/me/albums?${params.toString()}`
		);
	}

	async saveAlbums(albumIds: string[]): Promise<Result<void, Error>> {
		return this._request<void>('/me/albums', {
			method: 'PUT',
			body: JSON.stringify({ ids: albumIds.slice(0, 20) }),
		});
	}

	async removeSavedAlbums(albumIds: string[]): Promise<Result<void, Error>> {
		return this._request<void>('/me/albums', {
			method: 'DELETE',
			body: JSON.stringify({ ids: albumIds.slice(0, 20) }),
		});
	}

	async getUserPlaylists(
		options: { limit?: number; offset?: number } = {}
	): Promise<Result<SpotifyPagingObject<SpotifySimplifiedPlaylist>, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 50),
			offset: String(options.offset ?? 0),
		});

		return this._request<SpotifyPagingObject<SpotifySimplifiedPlaylist>>(
			`/me/playlists?${params.toString()}`
		);
	}

	async getFollowedArtists(
		options: { limit?: number; after?: string } = {}
	): Promise<Result<SpotifyFollowedArtistsResponse, Error>> {
		const params = new URLSearchParams({
			type: 'artist',
			limit: String(options.limit ?? 50),
		});

		if (options.after) {
			params.set('after', options.after);
		}

		return this._request<SpotifyFollowedArtistsResponse>(`/me/following?${params.toString()}`);
	}

	async followArtists(artistIds: string[]): Promise<Result<void, Error>> {
		const params = new URLSearchParams({
			type: 'artist',
			ids: artistIds.slice(0, 50).join(','),
		});

		return this._request<void>(`/me/following?${params.toString()}`, {
			method: 'PUT',
		});
	}

	async unfollowArtists(artistIds: string[]): Promise<Result<void, Error>> {
		const params = new URLSearchParams({
			type: 'artist',
			ids: artistIds.slice(0, 50).join(','),
		});

		return this._request<void>(`/me/following?${params.toString()}`, {
			method: 'DELETE',
		});
	}

	async getRecommendations(options: {
		seed_artists?: string[];
		seed_genres?: string[];
		seed_tracks?: string[];
		limit?: number;
		target_energy?: number;
		target_danceability?: number;
		target_valence?: number;
		target_tempo?: number;
		target_popularity?: number;
	}): Promise<Result<SpotifyRecommendationsResponse, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 20),
		});

		if (options.seed_artists?.length) {
			params.set('seed_artists', options.seed_artists.slice(0, 5).join(','));
		}
		if (options.seed_genres?.length) {
			params.set('seed_genres', options.seed_genres.slice(0, 5).join(','));
		}
		if (options.seed_tracks?.length) {
			params.set('seed_tracks', options.seed_tracks.slice(0, 5).join(','));
		}
		if (options.target_energy !== undefined) {
			params.set('target_energy', String(options.target_energy));
		}
		if (options.target_danceability !== undefined) {
			params.set('target_danceability', String(options.target_danceability));
		}
		if (options.target_valence !== undefined) {
			params.set('target_valence', String(options.target_valence));
		}
		if (options.target_tempo !== undefined) {
			params.set('target_tempo', String(options.target_tempo));
		}
		if (options.target_popularity !== undefined) {
			params.set('target_popularity', String(options.target_popularity));
		}

		if (this.config.market) {
			params.set('market', this.config.market);
		}

		return this._request<SpotifyRecommendationsResponse>(
			`/recommendations?${params.toString()}`
		);
	}

	async getNewReleases(
		options: { limit?: number; offset?: number; country?: string } = {}
	): Promise<Result<SpotifyNewReleasesResponse, Error>> {
		const params = new URLSearchParams({
			limit: String(options.limit ?? 20),
			offset: String(options.offset ?? 0),
		});

		if (options.country || this.config.market) {
			params.set('country', options.country || this.config.market!);
		}

		return this._request<SpotifyNewReleasesResponse>(
			`/browse/new-releases?${params.toString()}`
		);
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

export function createSpotifyClient(config: SpotifyClientConfig = {}): SpotifyClient {
	return new SpotifyClient(config);
}
