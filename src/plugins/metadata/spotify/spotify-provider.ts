import type {
	MetadataCapability,
	MetadataProvider,
	RecommendationParams,
	RecommendationSeed,
	SearchOptions,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

import { PLUGIN_MANIFEST, CONFIG_SCHEMA, METADATA_CAPABILITIES } from './config';
import { SpotifyClient, createSpotifyClient, type SpotifyClientConfig } from './client';
import { createSearchOperations, type SearchOperations } from './search';
import { createInfoOperations, type InfoOperations } from './info';
import { createLibraryOperations, type LibraryOperations } from './library';
import { createRecommendationOperations, type RecommendationOperations } from './recommendations';

export interface SpotifyLibraryProvider extends MetadataProvider {
	readonly library: LibraryOperations;

	getClient(): SpotifyClient;

	isAuthenticated(): boolean;

	getLoginUrl(): string;

	setSpDcCookie(cookie: string): Promise<Result<void, Error>>;

	logout(): Promise<Result<void, Error>>;
}

export class SpotifyProvider implements SpotifyLibraryProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly configSchema = CONFIG_SCHEMA;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);

	status: PluginStatus = 'uninitialized';

	private config: SpotifyClientConfig;
	private client: SpotifyClient | null = null;
	private searchOps: SearchOperations | null = null;
	private infoOps: InfoOperations | null = null;
	private libraryOps: LibraryOperations | null = null;
	private recommendationOps: RecommendationOperations | null = null;

	constructor(config: SpotifyClientConfig = {}) {
		this.config = config;
	}

	get library(): LibraryOperations {
		if (!this.libraryOps) {
			throw new Error('Plugin not initialized');
		}
		return this.libraryOps;
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

			const mergedConfig: SpotifyClientConfig = {
				market: (context.config.market as string) || this.config.market || 'US',
			};

			this.client = createSpotifyClient(mergedConfig);
			this.searchOps = createSearchOperations(this.client);
			this.infoOps = createInfoOperations(this.client);
			this.libraryOps = createLibraryOperations(this.client);
			this.recommendationOps = createRecommendationOperations(this.client);

			await this.client.initialize();

			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to initialize Spotify client: ${String(error)}`)
			);
		}
	}

	async onActivate(): Promise<Result<void, Error>> {
		this.status = 'active';
		return ok(undefined);
	}

	async onDeactivate(): Promise<Result<void, Error>> {
		this.status = 'ready';
		return ok(undefined);
	}

	async onDestroy(): Promise<Result<void, Error>> {
		this.client?.destroy();
		this.client = null;
		this.searchOps = null;
		this.infoOps = null;
		this.libraryOps = null;
		this.recommendationOps = null;
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	getClient(): SpotifyClient {
		if (!this.client) {
			throw new Error('Plugin not initialized');
		}
		return this.client;
	}

	isAuthenticated(): boolean {
		return this.client?.isAuthenticated() ?? false;
	}

	getLoginUrl(): string {
		if (!this.client) {
			throw new Error('Plugin not initialized');
		}
		return this.client.getAuthManager().getLoginUrl();
	}

	async setSpDcCookie(cookie: string): Promise<Result<void, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		return this.client.getAuthManager().setSpDcCookie(cookie);
	}

	async logout(): Promise<Result<void, Error>> {
		if (!this.client) {
			return err(new Error('Plugin not initialized'));
		}
		return this.client.getAuthManager().logout();
	}

	searchTracks(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Track>, Error>> {
		if (!this.searchOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.searchOps.searchTracks(query, options);
	}

	searchAlbums(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Album>, Error>> {
		if (!this.searchOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.searchOps.searchAlbums(query, options);
	}

	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>> {
		if (!this.searchOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.searchOps.searchArtists(query, options);
	}

	searchPlaylists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Playlist>, Error>> {
		if (!this.searchOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.searchOps.searchPlaylists(query, options);
	}

	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getTrackInfo(trackId);
	}

	getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getAlbumInfo(albumId);
	}

	getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getArtistInfo(artistId);
	}

	getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getPlaylistInfo(playlistId);
	}

	getAlbumTracks(
		albumId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getAlbumTracks(albumId, options);
	}

	getArtistAlbums(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Album>, Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.getArtistAlbums(artistId, options);
	}

	batchGetTracks(trackIds: TrackId[]): Promise<Result<Track[], Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.batchGetTracks(trackIds);
	}

	batchGetAlbums(albumIds: string[]): Promise<Result<Album[], Error>> {
		if (!this.infoOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.infoOps.batchGetAlbums(albumIds);
	}

	getRecommendations(
		seed: RecommendationSeed,
		params?: RecommendationParams,
		limit?: number
	): Promise<Result<Track[], Error>> {
		if (!this.recommendationOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.recommendationOps.getRecommendations(seed, params, limit);
	}
}

export function createSpotifyProvider(config: SpotifyClientConfig = {}): SpotifyProvider {
	return new SpotifyProvider(config);
}
