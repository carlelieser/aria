/**
 * Spotify Auth Facade
 *
 * Application-layer facade for Spotify OAuth operations.
 * Provides the redirect URI and auth manager access without
 * components needing to import from the plugins layer.
 */

import { SPOTIFY_REDIRECT_URI } from '@/src/plugins/metadata/spotify/config';
import { getTypedPlugin } from '@/src/application/services/plugin-registry-facade';

interface SpotifyAuthManager {
	generateAuthUrl(): Promise<string>;
}

interface SpotifyClient {
	getAuthManager(): SpotifyAuthManager | undefined;
}

interface SpotifyProvider {
	getClient(): SpotifyClient;
}

export const SPOTIFY_OAUTH_REDIRECT_URI = SPOTIFY_REDIRECT_URI;

export function getSpotifyAuthManager(): SpotifyAuthManager | undefined {
	const plugin = getTypedPlugin<SpotifyProvider>('spotify');
	return plugin?.getClient().getAuthManager();
}
