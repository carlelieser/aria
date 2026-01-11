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
	SPOTIFY_API_BASE_URL,
	SPOTIFY_LOGIN_URL,
} from './config';

export { SpotifyClient, createSpotifyClient, type SpotifyClientConfig } from './client';

export { SpotifyAuthManager, type AuthState } from './auth';

export { createSearchOperations, type SearchOperations } from './search';
export { createInfoOperations, type InfoOperations } from './info';
export { createLibraryOperations, type LibraryOperations } from './library';
export { createRecommendationOperations, type RecommendationOperations } from './recommendations';

export {
	mapSpotifyTrack,
	mapSpotifyTracks,
	mapSpotifySavedTrack,
	mapSpotifySavedTracks,
	mapSpotifySimplifiedTrack,
	mapSpotifyAlbum,
	mapSpotifySimplifiedAlbum,
	mapSpotifySimplifiedAlbums,
	mapSpotifyArtist,
	mapSpotifyArtists,
	mapSpotifyPlaylist,
	mapSpotifySimplifiedPlaylist,
	mapSpotifySimplifiedPlaylists,
	mapSpotifyImages,
	mapSpotifyArtistReference,
	mapSpotifyArtistReferences,
} from './mappers';

export type {
	SpotifyTrack,
	SpotifySimplifiedTrack,
	SpotifyAlbum,
	SpotifySimplifiedAlbum,
	SpotifyArtist,
	SpotifySimplifiedArtist,
	SpotifyPlaylist,
	SpotifySimplifiedPlaylist,
	SpotifyPlaylistTrack,
	SpotifySavedTrack,
	SpotifySavedAlbum,
	SpotifyImage,
	SpotifyPagingObject,
	SpotifySearchResponse,
	SpotifyErrorResponse,
} from './types';
