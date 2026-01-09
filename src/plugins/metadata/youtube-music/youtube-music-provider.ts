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

export class YouTubeMusicProvider implements MetadataProvider, AudioSourceProvider {
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

	constructor(config: YouTubeMusicConfig = DEFAULT_CONFIG) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	async onInit(context: PluginInitContext): Promise<Result<void, Error>> {
		try {
			this.status = 'initializing';

			const mergedConfig: YouTubeMusicConfig = {
				...this.config,
				lang: (context.config.lang as string) || this.config.lang,
				location: (context.config.location as string) || this.config.location,
			};

			this.clientManager = createClientManager(mergedConfig);
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
		return this.searchOps!.searchTracks(query, options);
	}

	searchAlbums(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Album>, Error>> {
		return this.searchOps!.searchAlbums(query, options);
	}

	searchArtists(
		query: string,
		options?: SearchOptions
	): Promise<Result<SearchResults<Artist>, Error>> {
		return this.searchOps!.searchArtists(query, options);
	}

	getTrackInfo(trackId: TrackId): Promise<Result<Track, Error>> {
		return this.infoOps!.getTrackInfo(trackId);
	}

	getAlbumInfo(albumId: string): Promise<Result<Album, Error>> {
		return this.infoOps!.getAlbumInfo(albumId);
	}

	getArtistInfo(artistId: string): Promise<Result<Artist, Error>> {
		return this.infoOps!.getArtistInfo(artistId);
	}

	getAlbumTracks(
		albumId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Track>, Error>> {
		return this.infoOps!.getAlbumTracks(albumId, options);
	}

	getArtistAlbums(
		artistId: string,
		options?: Pick<SearchOptions, 'limit' | 'offset'>
	): Promise<Result<SearchResults<Album>, Error>> {
		return this.infoOps!.getArtistAlbums(artistId, options);
	}

	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>> {
		return this.streamingOps!.getStreamUrl(trackId, options);
	}

	getRecommendations(
		seed: RecommendationSeed,
		params?: RecommendationParams,
		limit?: number
	): Promise<Result<Track[], Error>> {
		return this.recommendationOps!.getRecommendations(seed, params, limit);
	}
}

export function createYouTubeMusicProvider(config?: YouTubeMusicConfig): YouTubeMusicProvider {
	return new YouTubeMusicProvider(config);
}
