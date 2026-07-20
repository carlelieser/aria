export {
	SpotifyProvider,
	createSpotifyProvider,
	type SpotifyLibraryProvider,
} from './spotify-provider';

export { SpotifyPluginModule } from './plugin-module';

export {
	PLUGIN_MANIFEST,
	CONFIG_SCHEMA,
	METADATA_CAPABILITIES,
	SPOT_API_URL,
	SPOT_API_KEY,
	SPOTIFY_LOGIN_URL,
} from './config';

export { SpotifyClient, createSpotifyClient, type SpotifyClientConfig } from './client';

export { SpotifyAuthManager, type AuthState } from './auth';

export {
	createSpotifyProxyClient,
	type SpotifyProxyClient,
	type ProxySession,
} from './proxy-client';

export { createImportOperations, type ImportOperations } from './import-operations';
