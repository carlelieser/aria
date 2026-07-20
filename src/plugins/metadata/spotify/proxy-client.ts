/**
 * Transport for the spot-api proxy. Spotify's private endpoints reject
 * non-browser TLS fingerprints, so the proxy makes the calls server-side.
 * This client only carries bytes; proxy-mappers normalizes the shapes.
 */

import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { SPOT_API_URL, SPOT_API_KEY } from './config';

const logger = getLogger('Spotify:ProxyClient');

export interface ProxySession {
	readonly identifier: string;
	readonly spDc: string;
}

export interface ProxyPage {
	readonly items: unknown[];
	readonly total: number;
	readonly offset: number;
	readonly limit: number;
	readonly has_more: boolean;
}

const PAGE_SIZE = 100;

export interface SpotifyProxyClient {
	verify(session: ProxySession): Promise<Result<string, Error>>;
	getLibrary(session: ProxySession): Promise<Result<unknown, Error>>;
	/** One page only — reads the `album` metadata field it carries. */
	getAlbumPage(session: ProxySession, albumId: string): Promise<Result<unknown, Error>>;
	getAllSavedTracks(session: ProxySession): Promise<Result<unknown[], Error>>;
	getAllAlbumTracks(session: ProxySession, albumId: string): Promise<Result<unknown[], Error>>;
	getAllPlaylistTracks(
		session: ProxySession,
		playlistId: string
	): Promise<Result<unknown[], Error>>;
	getArtistInfo(session: ProxySession, artistId: string): Promise<Result<unknown, Error>>;
	getAllArtistAlbums(session: ProxySession, artistId: string): Promise<Result<unknown[], Error>>;
}

async function post<T>(
	path: string,
	session: ProxySession,
	extra?: Record<string, string>,
	query?: Record<string, number>
): Promise<Result<T, Error>> {
	if (!SPOT_API_URL || !SPOT_API_KEY) {
		return err(new Error('Spotify proxy is not configured'));
	}

	const qs = query
		? `?${new URLSearchParams(
				Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)]))
			).toString()}`
		: '';

	try {
		const response = await fetch(`${SPOT_API_URL}${path}${qs}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': SPOT_API_KEY,
			},
			body: JSON.stringify({
				identifier: session.identifier,
				sp_dc: session.spDc,
				...extra,
			}),
		});

		if (response.status === 401) {
			return err(new Error('Spotify session expired. Please log in again.'));
		}

		if (!response.ok) {
			const body = await response.text();
			logger.error(`Proxy ${path} failed: ${response.status} - ${body.slice(0, 200)}`);
			return err(new Error(`Spotify proxy error: ${response.status}`));
		}

		return ok((await response.json()) as T);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)));
	}
}

const MAX_PAGE_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPageWithRetry(
	path: string,
	session: ProxySession,
	extra: Record<string, string> | undefined,
	offset: number
): Promise<Result<ProxyPage, Error>> {
	let lastError: Error | null = null;
	for (let attempt = 0; attempt <= MAX_PAGE_RETRIES; attempt++) {
		if (attempt > 0) {
			await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
		}
		const result = await post<ProxyPage>(path, session, extra, {
			limit: PAGE_SIZE,
			offset,
		});
		if (result.success) return result;
		lastError = result.error;
	}
	return err(lastError ?? new Error('Pagination failed'));
}

async function collectAllPages(
	path: string,
	session: ProxySession,
	extra?: Record<string, string>
): Promise<Result<unknown[], Error>> {
	const all: unknown[] = [];
	let offset = 0;

	// Bounded to avoid an unterminated loop if the server misreports has_more.
	for (let guard = 0; guard < 10000; guard++) {
		const result = await fetchPageWithRetry(path, session, extra, offset);
		if (!result.success) return err(result.error);

		const page = result.data;
		all.push(...page.items);

		if (!page.has_more || page.items.length === 0) {
			return ok(all);
		}
		offset += page.items.length;

		// Space out sequential pages to stay under Spotify's rate limiter.
		await delay(150);
	}

	return ok(all);
}

export function createSpotifyProxyClient(): SpotifyProxyClient {
	return {
		async verify(session: ProxySession): Promise<Result<string, Error>> {
			const result = await post<{ username: string }>('/verify', session);
			if (!result.success) return err(result.error);
			return ok(result.data.username);
		},

		getLibrary(session: ProxySession): Promise<Result<unknown, Error>> {
			return post<unknown>('/library/playlists', session);
		},

		getAlbumPage(session: ProxySession, albumId: string): Promise<Result<unknown, Error>> {
			return post<unknown>(
				'/album/tracks',
				session,
				{ album_id: albumId },
				{
					limit: 1,
					offset: 0,
				}
			);
		},

		getAllSavedTracks(session: ProxySession): Promise<Result<unknown[], Error>> {
			return collectAllPages('/library/tracks', session);
		},

		getAllAlbumTracks(
			session: ProxySession,
			albumId: string
		): Promise<Result<unknown[], Error>> {
			return collectAllPages('/album/tracks', session, { album_id: albumId });
		},

		getAllPlaylistTracks(
			session: ProxySession,
			playlistId: string
		): Promise<Result<unknown[], Error>> {
			return collectAllPages('/playlist/tracks', session, { playlist_id: playlistId });
		},

		getArtistInfo(session: ProxySession, artistId: string): Promise<Result<unknown, Error>> {
			return post<unknown>('/artist/info', session, { artist_id: artistId });
		},

		getAllArtistAlbums(
			session: ProxySession,
			artistId: string
		): Promise<Result<unknown[], Error>> {
			return collectAllPages('/artist/albums', session, { artist_id: artistId });
		},
	};
}
