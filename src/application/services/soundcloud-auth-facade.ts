/**
 * SoundCloud Auth Facade
 *
 * Application-layer facade for SoundCloud OAuth operations.
 * Provides the redirect URI and auth manager access without
 * components needing to import from the plugins layer.
 */

import { SOUNDCLOUD_REDIRECT_URI } from '@/src/plugins/metadata/soundcloud/config';
import { getTypedPlugin } from '@/src/application/services/plugin-registry-facade';

interface SoundCloudAuthManager {
	generateAuthUrl(): Promise<string>;
}

interface SoundCloudClient {
	getAuthManager(): SoundCloudAuthManager | undefined;
}

interface SoundCloudProvider {
	getClient(): SoundCloudClient;
}

export const SOUNDCLOUD_OAUTH_REDIRECT_URI = SOUNDCLOUD_REDIRECT_URI;

export function getSoundCloudAuthManager(): SoundCloudAuthManager | undefined {
	const plugin = getTypedPlugin<SoundCloudProvider>('soundcloud');
	return plugin?.getClient().getAuthManager();
}
