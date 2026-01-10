import type { BasePlugin } from './base-plugin';
import type { AsyncResult } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';

export type MetadataCapability =
	| 'search-tracks'
	| 'search-albums'
	| 'search-artists'
	| 'search-playlists'
	| 'get-track-info'
	| 'get-album-info'
	| 'get-artist-info'
	| 'get-playlist-info'
	| 'get-album-tracks'
	| 'get-artist-albums'
	| 'get-lyrics'
	| 'get-recommendations'
	| 'get-charts';

export interface SearchFilters {
	readonly genre?: string;

	readonly year?: number;

	readonly yearRange?: { from: number; to: number };

	readonly durationRange?: { min: number; max: number };

	readonly explicit?: boolean;

	readonly minPopularity?: number;
}

export interface SearchOptions {
	readonly limit?: number;

	readonly offset?: number;

	readonly filters?: SearchFilters;

	readonly sortBy?: 'relevance' | 'popularity' | 'date' | 'duration' | 'title';

	readonly sortOrder?: 'asc' | 'desc';
}

export interface SearchResults<T> {
	readonly items: T[];

	readonly total?: number;

	readonly offset: number;

	readonly limit: number;

	readonly hasMore: boolean;

	readonly nextPageToken?: string;
}

export interface LyricsLine {
	readonly startTime: number;

	readonly endTime?: number;

	readonly text: string;
}

export interface Lyrics {
	readonly trackId: TrackId;

	readonly language?: string;

	readonly syncedLyrics?: LyricsLine[];

	readonly plainLyrics?: string;

	readonly source?: string;

	readonly isVerified?: boolean;

	readonly attribution?: string;
}

export interface RecommendationSeed {
	readonly tracks?: TrackId[];

	readonly artists?: string[];

	readonly genres?: string[];
}

export interface RecommendationParams {
	readonly targetEnergy?: number;

	readonly targetDanceability?: number;

	readonly targetValence?: number;

	readonly targetTempo?: number;

	readonly targetPopularity?: number;
}

export type ChartType = 'top-tracks' | 'top-albums' | 'top-artists' | 'trending' | 'new-releases';

export interface ChartParams {
	readonly type: ChartType;

	readonly region?: string;

	readonly genre?: string;

	readonly limit?: number;
}

export interface MetadataProvider extends BasePlugin {
	readonly capabilities: Set<MetadataCapability>;

	searchTracks(query: string, options?: SearchOptions): AsyncResult<SearchResults<Track>, Error>;

	searchAlbums(query: string, options?: SearchOptions): AsyncResult<SearchResults<Album>, Error>;

	searchArtists(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Artist>, Error>;

	searchPlaylists?(
		query: string,
		options?: SearchOptions
	): AsyncResult<SearchResults<Playlist>, Error>;

	getTrackInfo(trackId: TrackId): AsyncResult<Track, Error>;

	getAlbumInfo(albumId: string): AsyncResult<Album, Error>;

	getArtistInfo(artistId: string): AsyncResult<Artist, Error>;

	getPlaylistInfo?(playlistId: string): AsyncResult<Playlist, Error>;

	getAlbumTracks(
		albumId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): AsyncResult<SearchResults<Track>, Error>;

	getArtistAlbums(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): AsyncResult<SearchResults<Album>, Error>;

	getLyrics?(trackId: TrackId): AsyncResult<Lyrics, Error>;

	getRecommendations?(
		seed: RecommendationSeed,
		params?: RecommendationParams,
		limit?: number
	): AsyncResult<Track[], Error>;

	getCharts?(params: ChartParams): AsyncResult<Track[] | Album[] | Artist[], Error>;

	batchGetTracks?(trackIds: TrackId[]): AsyncResult<Track[], Error>;

	batchGetAlbums?(albumIds: string[]): AsyncResult<Album[], Error>;

	hasCapability(capability: MetadataCapability): boolean;
}

export function createSearchResults<T>(
	items: T[],
	options: {
		total?: number;
		offset?: number;
		limit?: number;
		hasMore?: boolean;
		nextPageToken?: string;
	} = {}
): SearchResults<T> {
	const offset = options.offset ?? 0;
	const limit = options.limit ?? items.length;

	return {
		items,
		total: options.total,
		offset,
		limit,
		hasMore: options.hasMore ?? (options.total ? offset + items.length < options.total : false),
		nextPageToken: options.nextPageToken,
	};
}

export function emptySearchResults<T>(offset = 0, limit = 0): SearchResults<T> {
	return {
		items: [],
		total: 0,
		offset,
		limit,
		hasMore: false,
	};
}

export function isMetadataProvider(plugin: BasePlugin): plugin is MetadataProvider {
	return (
		plugin.manifest.category === 'metadata-provider' &&
		'searchTracks' in plugin &&
		'getTrackInfo' in plugin &&
		'capabilities' in plugin
	);
}
