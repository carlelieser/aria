import type { Track } from '../../domain/entities/track';
import type { Album } from '../../domain/entities/album';
import type {
	MetadataProvider,
	SearchOptions,
} from '../../plugins/core/interfaces/metadata-provider';
import {
	useSearchStore,
	type SearchSuggestion,
	type SearchResults as AppSearchResults,
} from '../state/search-store';
import { ok, err, type Result } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('SearchService');

interface CacheEntry {
	results: AppSearchResults;
	timestamp: number;
}

const CACHE_TTL_MS = 5 * 60 * 1000;

export class SearchService {
	private metadataProviders: MetadataProvider[] = [];

	private pendingSearches = new Map<string, Promise<Result<AppSearchResults, Error>>>();

	private searchCache = new Map<string, CacheEntry>();

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
		this.searchCache.clear();
		logger.debug('Search cache cleared');
	}

	async search(query: string, options?: SearchOptions): Promise<Result<AppSearchResults, Error>> {
		const store = useSearchStore.getState();
		const cacheKey = this._getCacheKey(query, options);

		const cachedEntry = this.searchCache.get(cacheKey);
		if (cachedEntry && Date.now() - cachedEntry.timestamp < CACHE_TTL_MS) {
			logger.debug(`Returning cached results for query: ${query}`);
			store.setQuery(query);
			store.setResults(cachedEntry.results);
			return ok(cachedEntry.results);
		}

		const pendingSearch = this.pendingSearches.get(cacheKey);
		if (pendingSearch) {
			logger.debug(`Deduplicating search request for query: ${query}`);
			return pendingSearch;
		}

		const searchPromise = this._executeSearch(query, options, cacheKey);
		this.pendingSearches.set(cacheKey, searchPromise);

		try {
			return await searchPromise;
		} finally {
			this.pendingSearches.delete(cacheKey);
		}
	}

	private _getCacheKey(query: string, options?: SearchOptions): string {
		const normalizedQuery = query.trim().toLowerCase();
		const optionsKey = options ? JSON.stringify(options) : '';
		return `${normalizedQuery}:${optionsKey}`;
	}

	private async _executeSearch(
		query: string,
		options: SearchOptions | undefined,
		cacheKey: string
	): Promise<Result<AppSearchResults, Error>> {
		const store = useSearchStore.getState();
		store.setSearching(true);
		store.setQuery(query);

		if (this.metadataProviders.length === 0) {
			const error = new Error('No metadata providers available');
			store.setError(error.message);
			return err(error);
		}

		try {
			const searchPromises = this.metadataProviders.map(async (provider) => {
				try {
					const [tracksResult, albumsResult, artistsResult] = await Promise.all([
						provider.searchTracks(query, options),
						provider.searchAlbums(query, options),
						provider.searchArtists(query, options),
					]);

					return {
						tracks: tracksResult.success ? tracksResult.data.items : [],
						albums: albumsResult.success ? albumsResult.data.items : [],
						artists: artistsResult.success ? artistsResult.data.items : [],
					};
				} catch (error) {
					logger.warn(
						`Search failed for provider ${provider.manifest.id}`,
						error instanceof Error ? error : undefined
					);
					return { tracks: [], albums: [], artists: [] };
				}
			});

			const results = await Promise.all(searchPromises);

			const aggregated: AppSearchResults = {
				tracks: [],
				albums: [],
				artists: [],
			};

			for (const result of results) {
				aggregated.tracks.push(...result.tracks);
				aggregated.albums.push(...result.albums);
				aggregated.artists.push(...result.artists);
			}

			aggregated.tracks = this.deduplicateTracks(aggregated.tracks);
			aggregated.albums = this.deduplicateAlbums(aggregated.albums);
			aggregated.artists = this.deduplicateById(aggregated.artists);

			this.searchCache.set(cacheKey, {
				results: aggregated,
				timestamp: Date.now(),
			});

			store.setResults(aggregated);
			store.addRecentSearch(query);

			return ok(aggregated);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Search failed';
			store.setError(errorMessage);
			return err(error instanceof Error ? error : new Error(errorMessage));
		}
	}

	async getSuggestions(query: string): Promise<Result<SearchSuggestion[], Error>> {
		const store = useSearchStore.getState();

		if (!query.trim()) {
			const recentSuggestions: SearchSuggestion[] = store.recentSearches.map((q) => ({
				query: q,
				type: 'recent',
			}));
			store.setSuggestions(recentSuggestions);
			return ok(recentSuggestions);
		}

		const recentMatches: SearchSuggestion[] = store.recentSearches
			.filter((q) => q.toLowerCase().includes(query.toLowerCase()))
			.map((q) => ({ query: q, type: 'recent' as const }));

		store.setSuggestions(recentMatches);
		return ok(recentMatches);
	}

	private deduplicateTracks(tracks: Track[]): Track[] {
		const seen = new Set<string>();
		const result: Track[] = [];

		for (const track of tracks) {
			const id = track.id.value;
			if (!seen.has(id)) {
				seen.add(id);
				result.push(track);
			}
		}

		return result;
	}

	private deduplicateAlbums(albums: Album[]): Album[] {
		const seen = new Set<string>();
		const result: Album[] = [];

		for (const album of albums) {
			const idValue = album.id.value;
			if (!seen.has(idValue)) {
				seen.add(idValue);
				result.push(album);
			}
		}

		return result;
	}

	private deduplicateById<T extends { id: string }>(items: T[]): T[] {
		const seen = new Set<string>();
		const result: T[] = [];

		for (const item of items) {
			if (!seen.has(item.id)) {
				seen.add(item.id);
				result.push(item);
			}
		}

		return result;
	}
}

export const searchService = new SearchService();
