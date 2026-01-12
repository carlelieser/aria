import type { Track, Album } from '@/src/domain';
import type { MetadataProvider, SearchOptions } from '@plugins/core';
import {
	useSearchStore,
	type SearchSuggestion,
	type SearchResults as AppSearchResults,
} from '../state/search-store';
import { ok, err, type Result } from '@/src/shared';
import { getLogger } from '@shared/services/logger';

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

	private _currentAbortController: AbortController | null = null;

	private _searchVersion = 0;

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
		this._cancelCurrentSearch();

		const abortController = new AbortController();
		this._currentAbortController = abortController;
		this._searchVersion++;
		const searchVersion = this._searchVersion;

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

		const optionsWithSignal: SearchOptions = {
			...options,
			signal: abortController.signal,
		};

		const searchPromise = this._executeSearch(
			query,
			optionsWithSignal,
			cacheKey,
			searchVersion
		);
		this.pendingSearches.set(cacheKey, searchPromise);

		try {
			return await searchPromise;
		} finally {
			this.pendingSearches.delete(cacheKey);
		}
	}

	cancelSearch(): void {
		this._cancelCurrentSearch();
	}

	private _cancelCurrentSearch(): void {
		if (this._currentAbortController) {
			this._currentAbortController.abort();
			this._currentAbortController = null;
			logger.debug('Cancelled previous search');
		}
	}

	private _getCacheKey(query: string, options?: SearchOptions): string {
		const normalizedQuery = query.trim().toLowerCase();
		if (!options) {
			return normalizedQuery;
		}
		const { signal: _signal, ...cacheableOptions } = options;
		const optionsKey =
			Object.keys(cacheableOptions).length > 0 ? JSON.stringify(cacheableOptions) : '';
		return `${normalizedQuery}:${optionsKey}`;
	}

	private async _executeSearch(
		query: string,
		options: SearchOptions | undefined,
		cacheKey: string,
		searchVersion: number
	): Promise<Result<AppSearchResults, Error>> {
		const store = useSearchStore.getState();
		store.setSearching(true);
		store.setQuery(query);

		const signal = options?.signal;

		if (this.metadataProviders.length === 0) {
			const error = new Error('No metadata providers available');
			store.setError(error.message);
			return err(error);
		}

		try {
			const searchPromises = this.metadataProviders.map(async (provider) => {
				if (signal?.aborted) {
					return { tracks: [], albums: [], artists: [] };
				}

				try {
					const [tracksResult, albumsResult, artistsResult] = await Promise.all([
						provider.searchTracks(query, options),
						provider.searchAlbums(query, options),
						provider.searchArtists(query, options),
					]);

					if (signal?.aborted) {
						return { tracks: [], albums: [], artists: [] };
					}

					return {
						tracks: tracksResult.success ? tracksResult.data.items : [],
						albums: albumsResult.success ? albumsResult.data.items : [],
						artists: artistsResult.success ? artistsResult.data.items : [],
					};
				} catch (error) {
					if (signal?.aborted) {
						return { tracks: [], albums: [], artists: [] };
					}
					logger.warn(
						`Search failed for provider ${provider.manifest.id}`,
						error instanceof Error ? error : undefined
					);
					return { tracks: [], albums: [], artists: [] };
				}
			});

			const results = await Promise.all(searchPromises);

			if (signal?.aborted || searchVersion !== this._searchVersion) {
				logger.debug(`Search for "${query}" was cancelled or superseded`);
				return err(new Error('Search cancelled'));
			}

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

			if (searchVersion !== this._searchVersion) {
				logger.debug(`Search for "${query}" superseded, not updating store`);
				return ok(aggregated);
			}

			store.setResults(aggregated);
			store.addRecentSearch(query);

			return ok(aggregated);
		} catch (error) {
			if (signal?.aborted || searchVersion !== this._searchVersion) {
				return err(new Error('Search cancelled'));
			}
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
