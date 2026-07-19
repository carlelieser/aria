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

export interface SpotifyProxyClient {
	verify(session: ProxySession): Promise<Result<string, Error>>;
	getSavedTracks(session: ProxySession): Promise<Result<unknown, Error>>;
	getLibrary(session: ProxySession): Promise<Result<unknown, Error>>;
}

async function post<T>(path: string, session: ProxySession): Promise<Result<T, Error>> {
	if (!SPOT_API_URL || !SPOT_API_KEY) {
		return err(new Error('Spotify proxy is not configured'));
	}

	try {
		const response = await fetch(`${SPOT_API_URL}${path}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-Key': SPOT_API_KEY,
			},
			body: JSON.stringify({ identifier: session.identifier, sp_dc: session.spDc }),
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

export function createSpotifyProxyClient(): SpotifyProxyClient {
	return {
		async verify(session: ProxySession): Promise<Result<string, Error>> {
			const result = await post<{ username: string }>('/verify', session);
			if (!result.success) return err(result.error);
			return ok(result.data.username);
		},

		getSavedTracks(session: ProxySession): Promise<Result<unknown, Error>> {
			return post<unknown>('/library/tracks', session);
		},

		getLibrary(session: ProxySession): Promise<Result<unknown, Error>> {
			return post<unknown>('/library/playlists', session);
		},
	};
}
