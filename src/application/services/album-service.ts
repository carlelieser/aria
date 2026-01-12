import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import { useAlbumStore } from '../state/album-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';
import { CachedService } from '../../shared/cache';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import { AlbumId } from '../../domain/value-objects/album-id';

const logger = getLogger('AlbumService');

export interface AlbumDetailResult {
	album: Album | null;
	tracks: Track[];
}

const CACHE_TTL_MS = 10 * 60 * 1000;

export class AlbumService {
	private metadataProviders: MetadataProvider[] = [];
	private readonly _cachedService = new CachedService<string, AlbumDetailResult>({
		ttlMs: CACHE_TTL_MS,
		logger,
		name: 'AlbumService',
	});

	setMetadataProviders(providers: MetadataProvider[]): void {
		this.metadataProviders = providers;
		this.clearCache();
	}

	addMetadataProvider(provider: MetadataProvider): void {
		if (!this.metadataProviders.includes(provider)) {
			this.metadataProviders.push(provider);
			this.clearCache();
		}
	}

	removeMetadataProvider(providerId: string): void {
		this.metadataProviders = this.metadataProviders.filter((p) => p.manifest.id !== providerId);
		this.clearCache();
	}

	clearCache(): void {
		this._cachedService.clearCache();
	}

	async getAlbumDetail(albumId: string): Promise<Result<AlbumDetailResult, Error>> {
		const store = useAlbumStore.getState();

		return this._cachedService.getOrFetch(
			albumId,
			() => this._fetchAlbumDetail(albumId),
			(result) => store.setAlbumDetail(albumId, result.album, result.tracks)
		);
	}

	private async _fetchAlbumDetail(
		albumIdString: string
	): Promise<Result<AlbumDetailResult, Error>> {
		const store = useAlbumStore.getState();
		store.setLoading(albumIdString, true);

		if (this.metadataProviders.length === 0) {
			const error = new Error('No metadata providers available');
			store.setError(albumIdString, error.message);
			return err(error);
		}

		const albumId = AlbumId.tryFromString(albumIdString);
		if (!albumId) {
			const error = new Error(
				`Invalid album ID format: ${albumIdString}. Expected "provider:id" format.`
			);
			store.setError(albumIdString, error.message);
			return err(error);
		}

		const targetProvider = this.metadataProviders.find(
			(p) => p.manifest.id === albumId.sourceType
		);

		if (!targetProvider) {
			const error = new Error(`No provider found for album source: ${albumId.sourceType}`);
			store.setError(albumIdString, error.message);
			return err(error);
		}

		if (!targetProvider.hasCapability('get-album-tracks')) {
			const error = new Error(
				`Provider ${targetProvider.manifest.id} does not support album tracks`
			);
			store.setError(albumIdString, error.message);
			return err(error);
		}

		try {
			logger.debug(`Fetching album ${albumId.sourceId} from ${targetProvider.manifest.id}`);

			const [albumInfoResult, tracksResult] = await Promise.all([
				targetProvider.getAlbumInfo(albumId.sourceId),
				targetProvider.getAlbumTracks(albumId.sourceId, { limit: 100 }),
			]);

			if (!tracksResult.success) {
				const error = new Error(
					`Failed to fetch tracks from ${targetProvider.manifest.id}: ${tracksResult.error?.message}`
				);
				store.setError(albumIdString, error.message);
				return err(error);
			}

			const album = albumInfoResult.success ? albumInfoResult.data : null;
			const tracks = tracksResult.data.items;

			const sortedTracks = [...tracks].sort((a, b) => {
				const numA = a.metadata.trackNumber ?? 0;
				const numB = b.metadata.trackNumber ?? 0;
				return numA - numB;
			});

			const result: AlbumDetailResult = {
				album,
				tracks: sortedTracks,
			};

			store.setAlbumDetail(albumIdString, album, sortedTracks);
			return ok(result);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.warn(
				`Error fetching album from ${targetProvider.manifest.id}`,
				error instanceof Error ? error : undefined
			);
			store.setError(albumIdString, errorMessage);
			return err(error instanceof Error ? error : new Error(errorMessage));
		}
	}
}

export const albumService = new AlbumService();
