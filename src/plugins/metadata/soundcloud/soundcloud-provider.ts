import type {
	MetadataCapability,
	MetadataProvider,
	RecommendationSeed,
	RecommendationParams,
	SearchOptions,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type {
	AudioSourceCapability,
	AudioSourceProvider,
	StreamOptions,
	AvailableFormat,
} from '@plugins/core/interfaces/audio-source-provider';
import type { OAuthCapablePlugin } from '@plugins/core/interfaces/oauth-capable-plugin';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { HomeFeedOperations } from '@plugins/core/interfaces/home-feed-provider';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { Playlist } from '@domain/entities/playlist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import type { Result, AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';

import {
	PLUGIN_MANIFEST,
	CONFIG_SCHEMA,
	METADATA_CAPABILITIES,
	AUDIO_CAPABILITIES,
} from './config';
import { SoundCloudClient, createSoundCloudClient, type SoundCloudClientConfig } from './client';
import { createSearchOperations, type SearchOperations } from './search';
import { createInfoOperations, type InfoOperations } from './info';
import { createStreamingOperations, type StreamingOperations } from './streaming';
import { createLibraryOperations, type LibraryOperations } from './library';
import { createRecommendationOperations, type RecommendationOperations } from './recommendations';
import { createImportOperations, type ImportOperations } from './import-operations';
import { createSoundCloudHomeFeedOperations } from './home-feed-operations';

export interface SoundCloudLibraryProvider
	extends MetadataProvider, AudioSourceProvider, OAuthCapablePlugin {
	readonly library: LibraryOperations;
	readonly import: ImportOperations;

	getClient(): SoundCloudClient;
}

export class SoundCloudProvider implements SoundCloudLibraryProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly configSchema = CONFIG_SCHEMA;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);
	readonly audioCapabilities = new Set<AudioSourceCapability>(AUDIO_CAPABILITIES);

	status: PluginStatus = 'uninitialized';

	private config: SoundCloudClientConfig;
	private client: SoundCloudClient | null = null;
	private searchOps: SearchOperations | null = null;
	private infoOps: InfoOperations | null = null;
	private streamingOps: StreamingOperations | null = null;
	private libraryOps: LibraryOperations | null = null;
	private recommendationOps: RecommendationOperations | null = null;
	private importOps: ImportOperations | null = null;
	private homeFeedOps: HomeFeedOperations | null = null;

	constructor(config: SoundCloudClientConfig = {}) {
		this.config = config;
	}

	get library(): LibraryOperations {
		if (!this.libraryOps) throw new Error('Plugin not initialized');
		return this.libraryOps;
	}

	get import(): ImportOperations {
		if (!this.importOps) throw new Error('Plugin not initialized');
		return this.importOps;
	}

	get homeFeed(): HomeFeedOperations {
		if (!this.homeFeedOps) throw new Error('Plugin not initialized');
		return this.homeFeedOps;
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

			this.client = createSoundCloudClient(this.config);
			this.searchOps = createSearchOperations(this.client);
			this.infoOps = createInfoOperations(this.client);
			this.streamingOps = createStreamingOperations(this.client);
			this.libraryOps = createLibraryOperations(this.client);
			this.recommendationOps = createRecommendationOperations(this.client);
			this.importOps = createImportOperations(this.libraryOps, this.client);
			this.homeFeedOps = createSoundCloudHomeFeedOperations(this.client);

			await this.client.initialize();

			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return err(
				error instanceof Error
					? error
					: new Error(`Failed to initialize SoundCloud client: ${String(error)}`)
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
		this.streamingOps = null;
		this.libraryOps = null;
		this.recommendationOps = null;
		this.importOps = null;
		this.homeFeedOps = null;
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	hasAudioCapability(capability: AudioSourceCapability): boolean {
		return this.audioCapabilities.has(capability);
	}

	getClient(): SoundCloudClient {
		if (!this.client) throw new Error('Plugin not initialized');
		return this.client;
	}

	isAuthenticated(): boolean {
		return this.client?.isAuthenticated() ?? false;
	}

	async checkAuthentication(): Promise<boolean> {
		if (!this.client) return false;
		return this.client.checkAuthentication();
	}

	getLoginUrl(): string {
		if (!this.client) throw new Error('Plugin not initialized');
		return this.client.getAuthManager().getLoginUrl();
	}

	async setCredential(credential: string): Promise<Result<void, Error>> {
		if (!this.client) return err(new Error('Plugin not initialized'));
		return this.client.getAuthManager().exchangeAuthCode(credential);
	}

	async logout(): Promise<Result<void, Error>> {
		if (!this.client) return err(new Error('Plugin not initialized'));
		return this.client.getAuthManager().logout();
	}

	// MetadataProvider: Search
	searchTracks(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Track>, Error>> {
		if (!this.searchOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.searchOps.searchTracks(query, options);
	}

	searchAlbums(
		_query: string,
		_options?: SearchOptions
	): Promise<Result<SearchResults<Album>, Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support album search')));
	}

	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>> {
		if (!this.searchOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.searchOps.searchArtists(query, options);
	}

	searchPlaylists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Playlist>, Error>> {
		if (!this.searchOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.searchOps.searchPlaylists(query, options);
	}

	// MetadataProvider: Info
	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
		if (!this.infoOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.infoOps.getTrackInfo(trackId);
	}

	getAlbumInfo(_albumId: string): Promise<Result<Album, Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support albums')));
	}

	getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
		if (!this.infoOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.infoOps.getArtistInfo(artistId);
	}

	getPlaylistInfo(playlistId: string): Promise<Result<Playlist, Error>> {
		if (!this.infoOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.infoOps.getPlaylistInfo(playlistId);
	}

	getAlbumTracks(
		_albumId: string,
		_options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support albums')));
	}

	getArtistAlbums(
		_artistId: string,
		_options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Album>, Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support albums')));
	}

	batchGetTracks(_trackIds: TrackId[]): Promise<Result<Track[], Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support batch operations')));
	}

	batchGetAlbums(_albumIds: string[]): Promise<Result<Album[], Error>> {
		return Promise.resolve(err(new Error('SoundCloud does not support albums')));
	}

	getRecommendations(
		seed: RecommendationSeed,
		_params?: RecommendationParams,
		limit?: number
	): Promise<Result<Track[], Error>> {
		if (!this.recommendationOps) {
			return Promise.resolve(err(new Error('Plugin not initialized')));
		}
		return this.recommendationOps.getRecommendations(seed, limit);
	}

	// AudioSourceProvider
	supportsTrack(track: Track): boolean {
		return this.streamingOps?.supportsTrack(track) ?? false;
	}

	getStreamUrl(track: Track, options?: StreamOptions): AsyncResult<AudioStream, Error> {
		if (!this.streamingOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.streamingOps.getStreamUrl(track, options);
	}

	getAvailableFormats(trackId: TrackId): AsyncResult<AvailableFormat[], Error> {
		if (!this.streamingOps) return Promise.resolve(err(new Error('Plugin not initialized')));
		return this.streamingOps.getAvailableFormats(trackId);
	}
}

export function createSoundCloudProvider(config: SoundCloudClientConfig = {}): SoundCloudProvider {
	return new SoundCloudProvider(config);
}
