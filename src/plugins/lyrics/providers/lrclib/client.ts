import { tryCatchAsync, type Result } from '@shared/types/result';

const LRCLIB_BASE_URL = 'https://lrclib.net/api';
const USER_AGENT = 'Aria Music Player/1.0.0';

export interface LrcLibSearchParams {
	readonly trackName: string;
	readonly artistName?: string;
	readonly albumName?: string;
	readonly duration?: number;
}

export interface LrcLibLyricsResponse {
	readonly id: number;
	readonly name: string;
	readonly trackName: string;
	readonly artistName: string;
	readonly albumName: string;
	readonly duration: number;
	readonly instrumental: boolean;
	readonly plainLyrics: string | null;
	readonly syncedLyrics: string | null;
}

export class LrcLibClient {
	private readonly _baseUrl: string;

	constructor(baseUrl: string = LRCLIB_BASE_URL) {
		this._baseUrl = baseUrl;
	}

	async searchLyrics(
		params: LrcLibSearchParams
	): Promise<Result<LrcLibLyricsResponse | null, Error>> {
		return tryCatchAsync(async () => {
			const queryParams = new URLSearchParams();
			queryParams.set('track_name', params.trackName);

			if (params.artistName) {
				queryParams.set('artist_name', params.artistName);
			}
			if (params.albumName) {
				queryParams.set('album_name', params.albumName);
			}
			if (params.duration !== undefined) {
				queryParams.set('duration', String(Math.round(params.duration / 1000)));
			}

			const url = `${this._baseUrl}/get?${queryParams.toString()}`;

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'application/json',
				},
			});

			if (response.status === 404) {
				return null;
			}

			if (!response.ok) {
				throw new Error(`LRCLib API error: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as LrcLibLyricsResponse;
			return data;
		});
	}

	async searchLyricsByQuery(query: string): Promise<Result<LrcLibLyricsResponse[], Error>> {
		return tryCatchAsync(async () => {
			const url = `${this._baseUrl}/search?q=${encodeURIComponent(query)}`;

			const response = await fetch(url, {
				method: 'GET',
				headers: {
					'User-Agent': USER_AGENT,
					Accept: 'application/json',
				},
			});

			if (!response.ok) {
				throw new Error(`LRCLib API error: ${response.status} ${response.statusText}`);
			}

			const data = (await response.json()) as LrcLibLyricsResponse[];
			return data;
		});
	}
}
