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
import type { OAuthCapablePlugin } from '@plugins/core/interfaces/oauth-capable-plugin';
import type { PluginInitContext, PluginStatus } from '@plugins/core/interfaces/base-plugin';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { Artist } from '@domain/entities/artist';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import { getArtistNames } from '@domain/entities/track';

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
import {
	createLibraryOperations as createYTLibraryOperations,
	type YouTubeMusicLibraryOperations,
} from './library';
import { createImportOperations, type ImportOperations } from './import-operations';
import { createHomeFeedOperations, type HomeFeedOperations } from './home-feed-operations';

installEvaluator();

const logger = getLogger('YouTubeMusic');

export interface YouTubeMusicLibraryProvider
	extends MetadataProvider, AudioSourceProvider, OAuthCapablePlugin {
	readonly import: ImportOperations;
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
	private ytLibraryOps: YouTubeMusicLibraryOperations | null = null;
	private importOps: ImportOperations | null = null;
	private homeFeedOps: HomeFeedOperations | null = null;
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

	get import(): ImportOperations {
		if (!this.importOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.importOps;
	}

	get homeFeed(): HomeFeedOperations {
		if (!this.homeFeedOps) {
			throw new Error('YouTube Music provider not initialized');
		}
		return this.homeFeedOps;
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

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
			this.ytLibraryOps = createYTLibraryOperations(this.clientManager);
			this.importOps = createImportOperations(this.ytLibraryOps);
			this.homeFeedOps = createHomeFeedOperations(this.clientManager);

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
		this.ytLibraryOps = null;
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

	supportsTrack(track: Track): boolean {
		return track.source.type === 'streaming';
	}

	async onStreamError(): Promise<void> {
		if (!this.clientManager) return;
		logger.info('Stream error reported — refreshing innertube client');
		await this.clientManager.refreshAuth();
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

	async getStreamUrl(track: Track, options?: StreamOptions): Promise<Result<AudioStream, Error>> {
		if (track.id.sourceType === 'youtube-music' && !this._needsEnrichment(track)) {
			return this._getStreamingOps().getStreamUrl(track.id, options);
		}

		// Non-YouTube track or unenriched YouTube track (video thumbnail / zero duration):
		// search by title + artist to find the proper song match before streaming.
		const query = `${track.title} ${getArtistNames(track)}`;
		logger.debug(`Resolving non-YouTube track via search: "${query}"`);

		const searchResult = await this._getSearchOps().searchTracks(query, { limit: 1 });
		if (!searchResult.success || searchResult.data.items.length === 0) {
			return err(new Error(`Could not find "${track.title}" on YouTube Music`));
		}

		const matched = searchResult.data.items[0];
		logger.debug(`Resolved to YouTube video: ${matched.id.sourceId}`);
		return this._getStreamingOps().getStreamUrl(matched.id, options);
	}

	private _needsEnrichment(track: Track): boolean {
		if (track.duration.isZero()) return true;
		if (!track.artwork || track.artwork.length === 0) return true;
		return track.artwork.some((art) => art.url.includes('i.ytimg.com'));
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

	async setCredential(credential: string): Promise<Result<void, Error>> {
		const result = await this._authManager.setCookies(credential);
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
