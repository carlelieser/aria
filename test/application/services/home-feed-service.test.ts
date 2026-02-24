import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useHomeFeedStore } from '@application/state/home-feed-store';

import { HomeFeedService } from '@/src/application/services/home-feed-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

function createMockHomeFeedOps(overrides: Record<string, unknown> = {}) {
	return {
		getHomeFeed: vi.fn().mockResolvedValue({
			success: true,
			data: {
				sections: [
					{ id: 'section-1', title: 'Section 1', items: [] },
					{ id: 'section-2', title: 'Section 2', items: [] },
				],
				filterChips: [{ text: 'All' }, { text: 'Music' }],
				hasContinuation: false,
			},
		}),
		applyFilter: vi.fn().mockResolvedValue({
			success: true,
			data: {
				sections: [{ id: 'filtered-1', title: 'Filtered', items: [] }],
				hasContinuation: false,
			},
		}),
		loadMore: vi.fn().mockResolvedValue({
			success: true,
			data: {
				sections: [{ id: 'more-1', title: 'More Section', items: [] }],
				hasContinuation: false,
			},
		}),
		getPlaylistTracks: vi.fn().mockResolvedValue({
			success: true,
			data: { tracks: [], hasMore: false },
		}),
		loadMorePlaylistTracks: vi.fn().mockResolvedValue({
			success: true,
			data: { tracks: [], hasMore: false },
		}),
		...overrides,
	};
}

describe('HomeFeedService', () => {
	let service: HomeFeedService;

	beforeEach(() => {
		service = new HomeFeedService();
		useHomeFeedStore.getState().reset();
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('hasProviders', () => {
		it('should return false when no providers are added', () => {
			expect(service.hasProviders()).toBe(false);
		});

		it('should return true when providers are added', () => {
			service.addHomeFeedProvider('test', createMockHomeFeedOps());

			expect(service.hasProviders()).toBe(true);
		});
	});

	describe('addHomeFeedProvider', () => {
		it('should add a provider', () => {
			service.addHomeFeedProvider('test', createMockHomeFeedOps());

			expect(service.hasProviders()).toBe(true);
		});
	});

	describe('removeHomeFeedProvider', () => {
		it('should remove a provider', () => {
			service.addHomeFeedProvider('test', createMockHomeFeedOps());
			service.removeHomeFeedProvider('test');

			expect(service.hasProviders()).toBe(false);
		});

		it('should reset store when last provider is removed', () => {
			service.addHomeFeedProvider('test', createMockHomeFeedOps());
			service.removeHomeFeedProvider('test');

			const state = useHomeFeedStore.getState();
			expect(state.sections).toHaveLength(0);
		});

		it('should not fail when removing non-existent provider', () => {
			service.removeHomeFeedProvider('nonexistent');

			expect(service.hasProviders()).toBe(false);
		});

		it('should push merged state when one of multiple providers is removed', async () => {
			const ops1 = createMockHomeFeedOps();
			const ops2 = createMockHomeFeedOps();
			service.addHomeFeedProvider('provider-1', ops1);
			service.addHomeFeedProvider('provider-2', ops2);

			await service.fetchHomeFeed({ force: true });

			service.removeHomeFeedProvider('provider-1');

			// Store should still have data from provider-2
			const state = useHomeFeedStore.getState();
			expect(state.sections.length).toBeGreaterThan(0);
		});
	});

	describe('fetchHomeFeed', () => {
		it('should fetch data from all providers', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();

			expect(ops.getHomeFeed).toHaveBeenCalled();
		});

		it('should update store with sections and filter chips', async () => {
			service.addHomeFeedProvider('test', createMockHomeFeedOps());

			await service.fetchHomeFeed();

			const state = useHomeFeedStore.getState();
			expect(state.sections).toHaveLength(2);
			expect(state.filterChips).toHaveLength(2);
		});

		it('should set loading state during fetch', async () => {
			const ops = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockImplementation(async () => {
					expect(useHomeFeedStore.getState().isLoading).toBe(true);
					return {
						success: true,
						data: { sections: [], filterChips: [], hasContinuation: false },
					};
				}),
			});
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();

			expect(useHomeFeedStore.getState().isLoading).toBe(false);
		});

		it('should skip fetch when data is fresh and force is false', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();

			// Second fetch should skip
			await service.fetchHomeFeed();

			expect(ops.getHomeFeed).toHaveBeenCalledTimes(1);
		});

		it('should fetch when force is true even if data is fresh', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			await service.fetchHomeFeed({ force: true });

			expect(ops.getHomeFeed).toHaveBeenCalledTimes(2);
		});

		it('should resolve once a provider is added after fetchHomeFeed is called', async () => {
			const ops = createMockHomeFeedOps();
			const fetchPromise = service.fetchHomeFeed();

			// Adding a provider resolves the internal ready promise
			service.addHomeFeedProvider('test', ops);

			await fetchPromise;

			expect(ops.getHomeFeed).toHaveBeenCalled();
		});

		it('should set error when all providers fail', async () => {
			const ops = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Network error'),
				}),
			});
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();

			const state = useHomeFeedStore.getState();
			expect(state.error).not.toBeNull();
		});

		it('should aggregate sections from multiple providers', async () => {
			const ops1 = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockResolvedValue({
					success: true,
					data: {
						sections: [{ id: 's1', title: 'S1', items: [] }],
						filterChips: [],
						hasContinuation: false,
					},
				}),
			});
			const ops2 = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockResolvedValue({
					success: true,
					data: {
						sections: [{ id: 's2', title: 'S2', items: [] }],
						filterChips: [],
						hasContinuation: false,
					},
				}),
			});

			service.addHomeFeedProvider('p1', ops1);
			service.addHomeFeedProvider('p2', ops2);

			await service.fetchHomeFeed();

			const state = useHomeFeedStore.getState();
			expect(state.sections).toHaveLength(2);
		});
	});

	describe('refresh', () => {
		it('should fetch data and set refreshing state', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.refresh();

			expect(ops.getHomeFeed).toHaveBeenCalled();
			expect(useHomeFeedStore.getState().isRefreshing).toBe(false);
		});

		it('should do nothing when no providers are available', async () => {
			await service.refresh();

			const state = useHomeFeedStore.getState();
			expect(state.sections).toHaveLength(0);
		});
	});

	describe('applyFilter', () => {
		it('should apply filter on providers with filter chips', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			await service.applyFilter('Music', 1);

			expect(ops.applyFilter).toHaveBeenCalledWith('Music');
		});

		it('should update active filter index in store', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			await service.applyFilter('Music', 1);

			expect(useHomeFeedStore.getState().activeFilterIndex).toBe(1);
		});

		it('should do nothing when no providers are available', async () => {
			await service.applyFilter('Music', 1);

			expect(useHomeFeedStore.getState().activeFilterIndex).toBeNull();
		});
	});

	describe('loadMore', () => {
		it('should load more sections from providers with continuation', async () => {
			const ops = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockResolvedValue({
					success: true,
					data: {
						sections: Array.from({ length: 5 }, (_, i) => ({
							id: `s${i}`,
							title: `Section ${i}`,
							items: [],
						})),
						filterChips: [],
						hasContinuation: true,
					},
				}),
			});
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			await service.loadMore();

			expect(ops.loadMore).toHaveBeenCalled();
		});

		it('should not load more when no continuation available', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			await service.loadMore();

			expect(ops.loadMore).not.toHaveBeenCalled();
		});

		it('should not load more when already loading more', async () => {
			const ops = createMockHomeFeedOps({
				getHomeFeed: vi.fn().mockResolvedValue({
					success: true,
					data: {
						sections: Array.from({ length: 5 }, (_, i) => ({
							id: `s${i}`,
							title: `Section ${i}`,
							items: [],
						})),
						filterChips: [],
						hasContinuation: true,
					},
				}),
			});
			service.addHomeFeedProvider('test', ops);

			await service.fetchHomeFeed();
			useHomeFeedStore.setState({ isLoadingMore: true });
			await service.loadMore();

			expect(ops.loadMore).not.toHaveBeenCalled();
		});

		it('should do nothing when no providers are available', async () => {
			await service.loadMore();

			expect(useHomeFeedStore.getState().isLoadingMore).toBe(false);
		});
	});

	describe('getPlaylistTracks', () => {
		it('should return playlist tracks from provider', async () => {
			const mockTracks = { tracks: [{ id: 't1', title: 'Track 1' }], hasMore: false };
			const ops = createMockHomeFeedOps({
				getPlaylistTracks: vi.fn().mockResolvedValue({
					success: true,
					data: mockTracks,
				}),
			});
			service.addHomeFeedProvider('test', ops);

			const result = await service.getPlaylistTracks('playlist-1');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data).toEqual(mockTracks);
			}
		});

		it('should return error when no provider can fetch', async () => {
			const ops = createMockHomeFeedOps({
				getPlaylistTracks: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Not found'),
				}),
			});
			service.addHomeFeedProvider('test', ops);

			const result = await service.getPlaylistTracks('playlist-1');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('No provider could fetch tracks');
			}
		});
	});

	describe('loadMorePlaylistTracks', () => {
		it('should load more playlist tracks from provider', async () => {
			const ops = createMockHomeFeedOps();
			service.addHomeFeedProvider('test', ops);

			const result = await service.loadMorePlaylistTracks();

			expect(result.success).toBe(true);
		});

		it('should return error when no provider can load more', async () => {
			const ops = createMockHomeFeedOps({
				loadMorePlaylistTracks: vi.fn().mockResolvedValue({
					success: false,
					error: new Error('Failed'),
				}),
			});
			service.addHomeFeedProvider('test', ops);

			const result = await service.loadMorePlaylistTracks();

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain(
					'No provider could load more playlist tracks'
				);
			}
		});
	});
});
