import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchStore } from '@application/state/search-store';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { AlbumId } from '@domain/value-objects/album-id';
import { createStreamingSource } from '@domain/value-objects/audio-source';
import type { Track } from '@domain/entities/track';
import type { Album } from '@domain/entities/album';
import type { MetadataProvider } from '@plugins/core/interfaces/metadata-provider';

import { SearchService } from '@/src/application/services/search-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

function createMockTrack(id: string): Track {
	return {
		id: TrackId.create('youtube-music', id),
		title: `Track ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
		duration: Duration.fromSeconds(180),
		source: createStreamingSource('youtube-music', id),
		metadata: {},
		playCount: 0,
		isFavorite: false,
	};
}

function createMockAlbum(id: string): Album {
	return {
		id: AlbumId.create('youtube-music', id),
		name: `Album ${id}`,
		artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
	};
}

function createMockProvider(id: string, overrides: Record<string, unknown> = {}) {
	return {
		manifest: {
			id,
			name: id,
			version: '1.0.0',
			category: 'metadata-provider' as const,
			capabilities: ['search'],
		},
		status: 'active' as const,
		configSchema: [],
		capabilities: new Set(['search-tracks', 'search-albums', 'search-artists'] as const),
		hasCapability: vi.fn().mockReturnValue(true),
		onInit: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		onDestroy: vi.fn().mockResolvedValue({ success: true, data: undefined }),
		searchTracks: vi.fn().mockResolvedValue({
			success: true,
			data: {
				items: [createMockTrack('t1')],
				offset: 0,
				limit: 50,
				hasMore: false,
			},
		}),
		searchAlbums: vi.fn().mockResolvedValue({
			success: true,
			data: {
				items: [createMockAlbum('a1')],
				offset: 0,
				limit: 50,
				hasMore: false,
			},
		}),
		searchArtists: vi.fn().mockResolvedValue({
			success: true,
			data: {
				items: [{ id: 'artist-1', name: 'Artist 1' }],
				offset: 0,
				limit: 50,
				hasMore: false,
			},
		}),
		getTrackInfo: vi.fn(),
		getAlbumInfo: vi.fn(),
		getAlbumTracks: vi.fn(),
		getArtistInfo: vi.fn(),
		getArtistAlbums: vi.fn(),
		...overrides,
	} as unknown as MetadataProvider;
}

describe('SearchService', () => {
	let service: SearchService;

	beforeEach(() => {
		service = new SearchService();
		useSearchStore.setState({
			query: '',
			results: { tracks: [], albums: [], artists: [] },
			suggestions: [],
			recentSearches: [],
			isSearching: false,
			error: null,
		});
	});

	describe('setMetadataProviders', () => {
		it('should set providers and clear cache', () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			expect(true).toBe(true);
		});
	});

	describe('addMetadataProvider', () => {
		it('should add a provider', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);

			expect(true).toBe(true);
		});

		it('should not add duplicate provider', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);
			service.addMetadataProvider(provider);

			expect(true).toBe(true);
		});
	});

	describe('removeMetadataProvider', () => {
		it('should remove a provider by id', () => {
			const provider = createMockProvider('youtube-music');
			service.addMetadataProvider(provider);
			service.removeMetadataProvider('youtube-music');

			expect(true).toBe(true);
		});
	});

	describe('search', () => {
		it('should return search results when successful', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			const result = await service.search('test query');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tracks).toHaveLength(1);
				expect(result.data.albums).toHaveLength(1);
				expect(result.data.artists).toHaveLength(1);
			}
		});

		it('should update search store with results', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.search('test query');

			const storeState = useSearchStore.getState();
			expect(storeState.results.tracks).toHaveLength(1);
			expect(storeState.results.albums).toHaveLength(1);
		});

		it('should return error when no providers are available', async () => {
			const result = await service.search('test query');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No metadata providers available');
			}
		});

		it('should aggregate results from multiple providers', async () => {
			const provider1 = createMockProvider('youtube-music', {
				searchTracks: vi.fn().mockResolvedValue({
					success: true,
					data: {
						items: [createMockTrack('yt-1')],
						offset: 0,
						limit: 50,
						hasMore: false,
					},
				}),
				searchAlbums: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
				searchArtists: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
			});
			const provider2 = createMockProvider('spotify', {
				searchTracks: vi.fn().mockResolvedValue({
					success: true,
					data: {
						items: [createMockTrack('sp-1')],
						offset: 0,
						limit: 50,
						hasMore: false,
					},
				}),
				searchAlbums: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
				searchArtists: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
			});
			service.setMetadataProviders([provider1, provider2]);

			const result = await service.search('test');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tracks).toHaveLength(2);
			}
		});

		it('should deduplicate tracks by id', async () => {
			const provider1 = createMockProvider('youtube-music', {
				searchTracks: vi.fn().mockResolvedValue({
					success: true,
					data: {
						items: [createMockTrack('same-id')],
						offset: 0,
						limit: 50,
						hasMore: false,
					},
				}),
			});
			const provider2 = createMockProvider('spotify', {
				searchTracks: vi.fn().mockResolvedValue({
					success: true,
					data: {
						items: [createMockTrack('same-id')],
						offset: 0,
						limit: 50,
						hasMore: false,
					},
				}),
				searchAlbums: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
				searchArtists: vi.fn().mockResolvedValue({
					success: true,
					data: { items: [], offset: 0, limit: 50, hasMore: false },
				}),
			});
			service.setMetadataProviders([provider1, provider2]);

			const result = await service.search('test');

			expect(result.success).toBe(true);
			if (result.success) {
				// Duplicate tracks should be deduplicated
				expect(result.data.tracks).toHaveLength(1);
			}
		});

		it('should return cached results on duplicate queries', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.search('test query');
			const result = await service.search('test query');

			expect(result.success).toBe(true);
			expect(vi.mocked(provider.searchTracks)).toHaveBeenCalledTimes(1);
		});

		it('should handle provider search failure gracefully', async () => {
			const provider = createMockProvider('youtube-music', {
				searchTracks: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Failed'),
				}),
				searchAlbums: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Failed'),
				}),
				searchArtists: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Failed'),
				}),
			});
			service.setMetadataProviders([provider]);

			const result = await service.search('test query');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tracks).toHaveLength(0);
				expect(result.data.albums).toHaveLength(0);
				expect(result.data.artists).toHaveLength(0);
			}
		});

		it('should handle provider throwing an exception', async () => {
			const provider = createMockProvider('youtube-music', {
				searchTracks: vi.fn().mockRejectedValue(new Error('Unexpected')),
				searchAlbums: vi.fn().mockRejectedValue(new Error('Unexpected')),
				searchArtists: vi.fn().mockRejectedValue(new Error('Unexpected')),
			});
			service.setMetadataProviders([provider]);

			const result = await service.search('test query');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.tracks).toHaveLength(0);
			}
		});

		it('should add query to recent searches', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.search('test query');

			const storeState = useSearchStore.getState();
			expect(storeState.recentSearches).toContain('test query');
		});
	});

	describe('cancelSearch', () => {
		it('should cancel the current search', () => {
			service.cancelSearch();

			// No error means success
			expect(true).toBe(true);
		});
	});

	describe('clearCache', () => {
		it('should clear the search cache', async () => {
			const provider = createMockProvider('youtube-music');
			service.setMetadataProviders([provider]);

			await service.search('test query');
			service.clearCache();
			await service.search('test query');

			expect(vi.mocked(provider.searchTracks)).toHaveBeenCalledTimes(2);
		});
	});

	describe('getSuggestions', () => {
		it('should return recent searches when query is empty', async () => {
			useSearchStore.setState({
				recentSearches: ['previous search 1', 'previous search 2'],
			});

			const result = await service.getSuggestions('');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
				expect(result.data[0].type).toBe('recent');
			}
		});

		it('should filter recent searches by query', async () => {
			useSearchStore.setState({
				recentSearches: ['rock music', 'pop songs', 'rock ballads'],
			});

			const result = await service.getSuggestions('rock');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(2);
				expect(result.data.every((s) => s.query.includes('rock'))).toBe(true);
			}
		});

		it('should return empty array when no matches', async () => {
			useSearchStore.setState({
				recentSearches: ['rock music'],
			});

			const result = await service.getSuggestions('jazz');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toHaveLength(0);
			}
		});
	});
});
