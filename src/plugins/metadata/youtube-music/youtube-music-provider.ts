import type {
	MetadataCapability,
	MetadataProvider,
	RecommendationParams,
	RecommendationSeed,
	SearchOptions,
	SearchResults,
} from '@plugins/core/interfaces/metadata-provider';
import type {
	AudioSourceCapability,
	AudioSourceProvider,
	StreamOptions,
} from '@plugins/core/interfaces/audio-source-provider';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import type { Result } from '@shared/types/result';
import { ok } from '@shared/types/result';

import { installEvaluator } from './evaluator';
import { YouTubeMusicAuthManager } from './auth';
import {
	type YouTubeMusicConfig,
	DEFAULT_CONFIG,
	PLUGIN_MANIFEST,
	CONFIG_SCHEMA,
	METADATA_CAPABILITIES,
	AUDIO_CAPABILITIES,
} from './config';
import { createClientManager, ClientManager } from './client';
import { createSearchOperations, SearchOperations } from './search';
import { createInfoOperations, InfoOperations } from './info';
import { createStreamingOperations, StreamingOperations } from './streaming';
import { createRecommendationOperations, RecommendationOperations } from './recommendations';

installEvaluator();

export interface YouTubeMusicLibraryProvider extends MetadataProvider, AudioSourceProvider {
	isAuthenticated(): boolean;
	checkAuthentication(): Promise<boolean>;
	getLoginUrl(): string;
	setCookies(cookies: string): Promise<Result<void, Error>>;
	logout(): Promise<Result<void, Error>>;
}

export class YouTubeMusicProvider implements YouTubeMusicLibraryProvider {
	readonly manifest = PLUGIN_MANIFEST;
	readonly configSchema = CONFIG_SCHEMA;
	readonly capabilities = new Set<MetadataCapability>(METADATA_CAPABILITIES);
	readonly audioCapabilities = new Set<AudioSourceCapability>(AUDIO_CAPABILITIES);

	status: PluginStatus = 'uninitialized';

	private config: YouTubeMusicConfig;
	private clientManager: ClientManager | null = null;
	private searchOps: SearchOperations | null = null;
	private infoOps: InfoOperations | null = null;
	private streamingOps: StreamingOperations | null = null;
	private recommendationOps: RecommendationOperations | null = null;
	private readonly _authManager: YouTubeMusicAuthManager;

	constructor(config: YouTubeMusicConfig = DEFAULT_CONFIG) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this._authManager = new YouTubeMusicAuthManager();
	}

	private _getSearchOps(): SearchOperations {
		if (!this.searchOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.searchOps;
	}

	private _getInfoOps(): InfoOperations {
		if (!this.infoOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.infoOps;
	}

	private _getStreamingOps(): StreamingOperations {
		if (!this.streamingOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.streamingOps;
	}

	private _getRecommendationOps(): RecommendationOperations {
		if (!this.recommendationOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.recommendationOps;
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

			// Load any stored authentication
			await this._authManager.loadStoredAuth();

			const mergedConfig: YouTubeMusicConfig = {
				...this.config,
				lang: (context.config.lang as string) || this.config.lang,
				location: (context.config.location as string) || this.config.location,
			};

			this.clientManager = createClientManager(mergedConfig, this._authManager);
			this.searchOps = createSearchOperations(this.clientManager);
			this.infoOps = createInfoOperations(this.clientManager);
			this.streamingOps = createStreamingOperations(this.clientManager);
			this.recommendationOps = createRecommendationOperations(this.clientManager);

			await this.clientManager.getClient();

			this.status = 'ready';
			return ok(undefined);
		} catch (error) {
			this.status = 'error';
			return {
				success: false,
				error:
					error instanceof Error
						? error
						: new Error(`Failed to initialize YouTube Music client: ${String(error)}`),
			};
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
		this.clientManager?.destroy();
		this.clientManager = null;
		this.searchOps = null;
		this.infoOps = null;
		this.streamingOps = null;
		this.recommendationOps = null;
		this.status = 'uninitialized';
		return ok(undefined);
	}

	hasCapability(capability: MetadataCapability): boolean {
		return this.capabilities.has(capability);
	}

	hasAudioCapability(capability: AudioSourceCapability): boolean {
		return this.audioCapabilities.has(capability);
	}

	supportsTrack(track: Track): boolean {
		return track.source.type === 'streaming' && track.source.sourcePlugin === 'youtube-music';
	}

	searchTracks(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Track>, Error>> {
		return this._getSearchOps().searchTracks(query, options);
	}

	searchAlbums(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Album>, Error>> {
		return this._getSearchOps().searchAlbums(query, options);
	}

	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>> {
		return this._getSearchOps().searchArtists(query, options);
	}

	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
		return this._getInfoOps().getTrackInfo(trackId);
	}

	getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
		return this._getInfoOps().getAlbumInfo(albumId);
	}

	getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
		return this._getInfoOps().getArtistInfo(artistId);
	}

	getAlbumTracks(
		albumId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>> {
		return this._getInfoOps().getAlbumTracks(albumId, options);
	}

	getArtistAlbums(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Album>, Error>> {
		return this._getInfoOps().getArtistAlbums(artistId, options);
	}

	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>> {
		return this._getStreamingOps().getStreamUrl(trackId, options);
	}

	getRecommendations(
		seed: RecommendationSeed,
		params?: RecommendationParams,
		limit?: number
	): Promise<Result<Track[], Error>> {
		return this._getRecommendationOps().getRecommendations(seed, params, limit);
	}

	// Authentication methods
	isAuthenticated(): boolean {
		return this._authManager.isAuthenticated();
	}

	async checkAuthentication(): Promise<boolean> {
		return this._authManager.checkAuthentication();
	}

	getLoginUrl(): string {
		return this._authManager.getLoginUrl();
	}

	async setCookies(cookies: string): Promise<Result<void, Error>> {
		const result = await this._authManager.setCookies(cookies);
		if (result.success && this.clientManager) {
			// Refresh client with new authentication
			await this.clientManager.refreshAuth();
		}
		return result;
	}

	async logout(): Promise<Result<void, Error>> {
		const result = await this._authManager.logout();
		if (result.success && this.clientManager) {
			// Refresh client to use unauthenticated access
			await this.clientManager.refreshAuth();
		}
		return result;
	}
}

export function createYouTubeMusicProvider(config?: YouTubeMusicConfig): YouTubeMusicProvider {
	return new YouTubeMusicProvider(config);
}
