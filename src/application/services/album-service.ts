import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import { useAlbumStore } from '../state/album-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';

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

	private async _fetchAlbumDetail(albumId: string): Promise<Result<AlbumDetailResult, Error>> {
		const store = useAlbumStore.getState();
		store.setLoading(albumId, true);

		if (this.metadataProviders.length === 0) {
			const error = new Error('No metadata providers available');
			store.setError(albumId, error.message);
			return err(error);
		}

		const [providerPrefix, rawId] = this._parseAlbumId(albumId);
		const targetProviders = providerPrefix
			? this.metadataProviders.filter((p) => p.manifest.id === providerPrefix)
			: this.metadataProviders;

		if (targetProviders.length === 0) {
			const error = new Error(`No provider found for album ID: ${albumId}`);
			store.setError(albumId, error.message);
			return err(error);
		}

		for (const provider of targetProviders) {
			try {
				if (!provider.hasCapability('get-album-tracks')) {
					logger.debug(`Provider ${provider.manifest.id} does not support album tracks`);
					continue;
				}

				const idToUse = rawId || albumId;
				logger.debug(`Fetching album ${idToUse} from ${provider.manifest.id}`);

				const [albumInfoResult, tracksResult] = await Promise.all([
					provider.getAlbumInfo(idToUse),
					provider.getAlbumTracks(idToUse, { limit: 100 }),
				]);

				if (!tracksResult.success) {
					logger.warn(
						`Failed to fetch tracks from ${provider.manifest.id}`,
						tracksResult.error
					);
					continue;
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

				this.cache.set(albumId, {
					result,
					timestamp: Date.now(),
				});

				store.setAlbumDetail(albumId, album, sortedTracks);
				return ok(result);
			} catch (error) {
				logger.warn(
					`Error fetching album from ${provider.manifest.id}`,
					error instanceof Error ? error : undefined
				);
			}
		}

		const error = new Error('Failed to fetch album from any provider');
		store.setError(albumId, error.message);
		return err(error);
	}

	private _parseAlbumId(albumId: string): [string | null, string | null] {
		const colonIndex = albumId.indexOf(':');
		if (colonIndex === -1) {
			return [null, null];
		}

		const prefix = albumId.substring(0, colonIndex);
		const rawId = albumId.substring(colonIndex + 1);

		const isKnownProvider = this.metadataProviders.some((p) => p.manifest.id === prefix);
		if (isKnownProvider) {
			return [prefix, rawId];
		}

		return [null, null];
	}
}

export const albumService = new AlbumService();
