import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import { useAlbumStore } from '../state/album-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import { AlbumId } from '../../domain/value-objects/album-id';

const logger = getLogger('AlbumService');

export interface AlbumDetailResult {
	album: Album | null;
	tracks: Track[];
}

interface CacheEntry {
	result: AlbumDetailResult;
	timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;

export class AlbumService {
	private metadataProviders: MetadataProvider[] = [];
	private pendingRequests = new Map<string, Promise<Result<AlbumDetailResult, Error>>>();
	private cache = new Map<string, CacheEntry>();

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
		this.cache.clear();
		logger.debug('Album cache cleared');
	}

	async getAlbumDetail(albumId: string): Promise<Result<AlbumDetailResult, Error>> {
		const store = useAlbumStore.getState();

		const cachedEntry = this.cache.get(albumId);
		if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
			logger.debug(`Returning cached album detail for: ${albumId}`);
			store.setAlbumDetail(albumId, cachedEntry.result.album, cachedEntry.result.tracks);
			return ok(cachedEntry.result);
		}

		const pendingRequest = this.pendingRequests.get(albumId);
		if (pendingRequest) {
			logger.debug(`Deduplicating album request for: ${albumId}`);
			return pendingRequest;
		}

		const fetchPromise = this._fetchAlbumDetail(albumId);
		this.pendingRequests.set(albumId, fetchPromise);

		try {
			return await fetchPromise;
		} finally {
			this.pendingRequests.delete(albumId);
		}
	}

	private async _fetchAlbumDetail(albumIdString: string): Promise<Result<AlbumDetailResult, Error>> {
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
			const error = new Error(
				`No provider found for album source: ${albumId.sourceType}`
			);
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

			this.cache.set(albumIdString, {
				result,
				timestamp: Date.now(),
			});

			store.setAlbumDetail(albumIdString, album, sortedTracks);
			return ok(result);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			logger.warn(`Error fetching album from ${targetProvider.manifest.id}`, error instanceof Error ? error : undefined);
			store.setError(albumIdString, errorMessage);
			return err(error instanceof Error ? error : new Error(errorMessage));
		}
	}
}

export const albumService = new AlbumService();
