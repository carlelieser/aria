/**
 * Spotify Proxy Client
 *
 * Transport for the spot-api proxy (SpotAPI-backed) that fronts a user's
 * Spotify library. The app cannot talk to Spotify's private web endpoints
 * directly — they reject non-browser TLS fingerprints — so the proxy performs
 * the browser-impersonation handshake server-side and exposes a small REST
 * surface. This client only carries bytes; SpotAPI's GraphQL shapes are
 * normalized to domain entities by proxy-mappers.
 */

import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { SPOT_API_URL, SPOT_API_KEY } from './config';

const logger = getLogger('Spotify:ProxyClient');

/** Credentials the proxy needs on every authenticated call. */
export interface ProxySession {
	readonly identifier: string;
	readonly spDc: string;
}

/** One page of track results from a paginated proxy endpoint. */
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
	/** Fetch one page of an album (carries the `album` metadata field). */
	getAlbumPage(session: ProxySession, albumId: string): Promise<Result<unknown, Error>>;
	/** Fetch every saved (liked) track, paging to completion. */
	getAllSavedTracks(session: ProxySession): Promise<Result<unknown[], Error>>;
	/** Fetch every track of an album, paging to completion. */
	getAllAlbumTracks(session: ProxySession, albumId: string): Promise<Result<unknown[], Error>>;
	/** Fetch every track of a playlist, paging to completion. */
	getAllPlaylistTracks(
		session: ProxySession,
		playlistId: string
	): Promise<Result<unknown[], Error>>;
	/** Fetch an artist's overview (profile, image, stats). */
	getArtistInfo(session: ProxySession, artistId: string): Promise<Result<unknown, Error>>;
	/** Fetch an artist's full discography, paging to completion. */
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

/** Fetch one page, retrying transient failures with exponential backoff. */
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

/** Page through a track endpoint until `has_more` is false, collecting all items. */
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
