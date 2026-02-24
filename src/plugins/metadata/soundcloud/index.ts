export {
	SoundCloudProvider,
	createSoundCloudProvider,
	type SoundCloudLibraryProvider,
} from './soundcloud-provider';

export { SoundCloudPluginModule } from './plugin-module';

export {
	PLUGIN_MANIFEST,
	CONFIG_SCHEMA,
	METADATA_CAPABILITIES,
	AUDIO_CAPABILITIES,
	SOUNDCLOUD_API_BASE_URL,
	SOUNDCLOUD_CLIENT_ID,
	SOUNDCLOUD_REDIRECT_URI,
	SOUNDCLOUD_AUTH_URL,
	SOUNDCLOUD_SCOPES,
	SOUNDCLOUD_LOGIN_URL,
} from './config';

export { SoundCloudClient, createSoundCloudClient, type SoundCloudClientConfig } from './client';

export { SoundCloudAuthManager, type SoundCloudAuthState } from './auth';

export { createSearchOperations, type SearchOperations } from './search';
export { createInfoOperations, type InfoOperations } from './info';
export { createStreamingOperations, type StreamingOperations } from './streaming';
export { createLibraryOperations, type LibraryOperations } from './library';
export { createRecommendationOperations, type RecommendationOperations } from './recommendations';

export {
	mapSoundCloudTrack,
	mapSoundCloudTracks,
	mapSoundCloudLikedTrack,
	mapSoundCloudLikedTracks,
	mapSoundCloudUser,
	mapSoundCloudUsers,
	mapSoundCloudPlaylist,
	mapSoundCloudSimplifiedPlaylist,
	mapSoundCloudSimplifiedPlaylists,
	mapSoundCloudArtistReference,
	extractIdFromUrn,
} from './mappers';

export type {
	SoundCloudTrack,
	SoundCloudUser,
	SoundCloudPlaylist,
	SoundCloudTranscoding,
	SoundCloudStreamsResponse,
	SoundCloudSearchResponse,
	SoundCloudErrorResponse,
	SoundCloudLike,
} from './types';
