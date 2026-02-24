export {
	type Result,
	type AsyncResult,
	ok,
	err,
	isOk,
	isErr,
	unwrap,
	unwrapOr,
	map,
	mapErr,
	andThen,
	tryCatch,
	tryCatchAsync,
} from './result';

export type { PluginConfigSchema } from './plugin-config-schema';
export type { PluginStatus, PluginCategory } from './plugin-types';
export type { LyricsLine, Lyrics } from './lyrics';
export type {
	ScanProgress,
	FolderInfo,
	LocalTrack,
	LocalAlbum,
	LocalArtist,
} from './local-library-types';
export { isOAuthCapable, type OAuthCapablePlugin } from './oauth-capable-plugin';
