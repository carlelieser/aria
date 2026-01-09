import type { MetadataProvider } from '../../plugins/core/interfaces/metadata-provider';
import { useArtistStore } from '../state/artist-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';
import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type { Artist } from '../../domain/entities/artist';

const logger = getLogger('ArtistService');

export interface ArtistDetailResult {
	artist: Artist | null;
	topTracks: Track[];
	albums: Album[];
}

interface CacheEntry {
	result: ArtistDetailResult;
	timestamp: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;

export class ArtistService {
	private metadataProviders: MetadataProvider[] = [];
	private pendingRequests = new Map<string, Promise<Result<ArtistDetailResult, Error>>>();
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
		logger.debug('Artist cache cleared');
	}

	async getArtistDetail(artistId: string): Promise<Result<ArtistDetailResult, Error>> {
		const store = useArtistStore.getState();

		const cachedEntry = this.cache.get(artistId);
		if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
			logger.debug(`Returning cached artist detail for: ${artistId}`);
			store.setArtistDetail(
				artistId,
				cachedEntry.result.artist,
				cachedEntry.result.topTracks,
				cachedEntry.result.albums
			);
			return ok(cachedEntry.result);
		}

		const pendingRequest = this.pendingRequests.get(artistId);
		if (pendingRequest) {
			logger.debug(`Deduplicating artist request for: ${artistId}`);
			return pendingRequest;
		}

		const fetchPromise = this._fetchArtistDetail(artistId);
		this.pendingRequests.set(artistId, fetchPromise);

		try {
			return await fetchPromise;
		} finally {
			this.pendingRequests.delete(artistId);
		}
	}

	private async _fetchArtistDetail(artistId: string): Promise<Result<ArtistDetailResult, Error>> {
		const store = useArtistStore.getState();
		store.setLoading(artistId, true);

		if (this.metadataProviders.length === 0) {
			const error = new Error('No metadata providers available');
			store.setError(artistId, error.message);
			return err(error);
		}

		const [providerPrefix, rawId] = this._parseArtistId(artistId);
		const targetProviders = providerPrefix
			? this.metadataProviders.filter((p) => p.manifest.id === providerPrefix)
			: this.metadataProviders;

		if (targetProviders.length === 0) {
			const error = new Error(`No provider found for artist ID: ${artistId}`);
			store.setError(artistId, error.message);
			return err(error);
		}

		for (const provider of targetProviders) {
			try {
				const idToUse = rawId || artistId;
				logger.debug(`Fetching artist ${idToUse} from ${provider.manifest.id}`);

				const artistInfoResult = provider.hasCapability('get-artist-info')
					? await provider.getArtistInfo(idToUse)
					: { success: false as const, error: new Error('Not supported') };

				const albumsResult = provider.hasCapability('get-artist-albums')
					? await provider.getArtistAlbums(idToUse, { limit: 20 })
					: { success: true as const, data: { items: [], offset: 0, limit: 0, hasMore: false } };

				if (!artistInfoResult.success && !albumsResult.success) {
					logger.warn(`Failed to fetch artist data from ${provider.manifest.id}`);
					continue;
				}

				const artist = artistInfoResult.success ? artistInfoResult.data : null;
				const albums = albumsResult.success ? albumsResult.data.items : [];

				const result: ArtistDetailResult = {
					artist,
					topTracks: [],
					albums,
				};

				this.cache.set(artistId, {
					result,
					timestamp: Date.now(),
				});

				store.setArtistDetail(artistId, artist, [], albums);
				return ok(result);
			} catch (error) {
				logger.warn(
					`Error fetching artist from ${provider.manifest.id}`,
					error instanceof Error ? error : undefined
				);
			}
		}

		const error = new Error('Failed to fetch artist from any provider');
		store.setError(artistId, error.message);
		return err(error);
	}

	private _parseArtistId(artistId: string): [string | null, string | null] {
		const colonIndex = artistId.indexOf(':');
		if (colonIndex === -1) {
			return [null, null];
		}

		const prefix = artistId.substring(0, colonIndex);
		const rawId = artistId.substring(colonIndex + 1);

		const isKnownProvider = this.metadataProviders.some((p) => p.manifest.id === prefix);
		if (isKnownProvider) {
			return [prefix, rawId];
		}

		return [null, null];
	}
}

export const artistService = new ArtistService();
