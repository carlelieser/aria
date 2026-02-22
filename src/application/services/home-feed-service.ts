import type { Track } from '@domain/entities/track';
import type { FeedSection, FeedFilterChip } from '@domain/entities/feed-section';
import type { Result } from '@shared/types/result';
import { err } from '@shared/types/result';
import type { HomeFeedOperations } from '@plugins/core/interfaces/home-feed-provider';
import { useHomeFeedStore } from '../state/home-feed-store';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('HomeFeedService');

const STALENESS_THRESHOLD_MS = 10 * 60 * 1000;
const MIN_SECTIONS = 5;

interface ProviderState {
	readonly operations: HomeFeedOperations;
	sections: FeedSection[];
	filterChips: FeedFilterChip[];
	hasContinuation: boolean;
}

export class HomeFeedService {
	private _providers = new Map<string, ProviderState>();
	private _readyPromise: Promise<void>;
	private _resolveReady!: () => void;

	constructor() {
		this._readyPromise = new Promise((resolve) => {
			this._resolveReady = resolve;
		});
	}

	addHomeFeedProvider(id: string, ops: HomeFeedOperations): void {
		this._providers.set(id, {
			operations: ops,
			sections: [],
			filterChips: [],
			hasContinuation: false,
		});
		this._resolveReady();
		logger.info(`Home feed provider added: ${id}`);
	}

	removeHomeFeedProvider(id: string): void {
		if (!this._providers.has(id)) return;

		this._providers.delete(id);
		logger.info(`Home feed provider removed: ${id}`);

		if (this._providers.size === 0) {
			useHomeFeedStore.getState().reset();
		} else {
			this._pushMergedState();
		}
	}

	hasProviders(): boolean {
		return this._providers.size > 0;
	}

	async fetchHomeFeed({ force = false } = {}): Promise<void> {
		await this._readyPromise;
		if (this._providers.size === 0) return;

		const store = useHomeFeedStore.getState();

		if (!force && store.lastFetchedAt) {
			const elapsed = Date.now() - store.lastFetchedAt;
			if (elapsed < STALENESS_THRESHOLD_MS) {
				logger.debug('Home feed data is fresh, skipping fetch');
				return;
			}
		}

		store.setLoading(true);
		store.setError(null);

		await this._fetchAllProviders();

		store.setLoading(false);
	}

	async refresh(): Promise<void> {
		if (this._providers.size === 0) return;

		const store = useHomeFeedStore.getState();
		store.setRefreshing(true);

		await this._fetchAllProviders();

		store.setRefreshing(false);
	}

	async applyFilter(chipText: string, chipIndex: number): Promise<void> {
		if (this._providers.size === 0) return;

		const store = useHomeFeedStore.getState();
		store.setLoading(true);

		const results = await Promise.allSettled(
			Array.from(this._providers.entries())
				.filter(([, state]) => state.filterChips.length > 0)
				.map(async ([id, state]) => {
					const result = await state.operations.applyFilter(chipText);
					return { id, result };
				})
		);

		for (const settled of results) {
			if (settled.status !== 'fulfilled') continue;
			const { id, result } = settled.value;
			const state = this._providers.get(id);
			if (!state) continue;

			if (result.success) {
				state.sections = result.data.sections;
				state.hasContinuation = result.data.hasContinuation;
			} else {
				logger.error(`Failed to apply filter for ${id}`, result.error);
			}
		}

		this._pushMergedState();
		store.setActiveFilterIndex(chipIndex);
		store.setLoading(false);
	}

	async loadMore(): Promise<void> {
		if (this._providers.size === 0) return;

		const store = useHomeFeedStore.getState();
		if (store.isLoadingMore) return;

		const providersWithMore = Array.from(this._providers.entries()).filter(
			([, state]) => state.hasContinuation
		);

		if (providersWithMore.length === 0) return;

		store.setLoadingMore(true);

		const results = await Promise.allSettled(
			providersWithMore.map(async ([id, state]) => {
				const result = await state.operations.loadMore();
				return { id, result };
			})
		);

		for (const settled of results) {
			if (settled.status !== 'fulfilled') continue;
			const { id, result } = settled.value;
			const state = this._providers.get(id);
			if (!state) continue;

			if (result.success) {
				state.sections = [...state.sections, ...result.data.sections];
				state.hasContinuation = result.data.hasContinuation;
			} else {
				logger.error(`Failed to load more for ${id}`, result.error);
			}
		}

		this._pushMergedState();
		store.setLoadingMore(false);
	}

	async getPlaylistTracks(playlistId: string): Promise<Result<Track[], Error>> {
		await this._readyPromise;

		for (const [id, state] of this._providers) {
			const result = await state.operations.getPlaylistTracks(playlistId);
			if (result.success) return result;
			logger.debug(`Provider ${id} could not fetch playlist ${playlistId}`);
		}

		return err(new Error('No provider could fetch tracks for this playlist'));
	}

	private async _fetchAllProviders(): Promise<void> {
		const results = await Promise.allSettled(
			Array.from(this._providers.entries()).map(async ([id, state]) => {
				const result = await state.operations.getHomeFeed();
				return { id, result };
			})
		);

		let hasAnySuccess = false;

		for (const settled of results) {
			if (settled.status !== 'fulfilled') continue;
			const { id, result } = settled.value;
			const state = this._providers.get(id);
			if (!state) continue;

			if (result.success) {
				state.sections = [...result.data.sections];
				state.filterChips = result.data.filterChips;
				state.hasContinuation = result.data.hasContinuation;
				hasAnySuccess = true;
			} else {
				logger.error(`Failed to fetch home feed from ${id}`, result.error);
				state.sections = [];
				state.filterChips = [];
				state.hasContinuation = false;
			}
		}

		if (hasAnySuccess) {
			await this._fillToMinSections();
		}

		this._pushMergedState();

		const store = useHomeFeedStore.getState();

		if (hasAnySuccess) {
			store.setLastFetchedAt(Date.now());
			store.setActiveFilterIndex(null);
		} else {
			store.setError('Failed to load home feed from all providers');
		}
	}

	private async _fillToMinSections(): Promise<void> {
		let totalSections = this._getTotalSectionCount();

		for (const [, state] of this._providers) {
			while (totalSections < MIN_SECTIONS && state.hasContinuation) {
				const more = await state.operations.loadMore();
				if (!more.success) break;
				state.sections.push(...more.data.sections);
				state.hasContinuation = more.data.hasContinuation;
				totalSections = this._getTotalSectionCount();
			}
		}
	}

	private _getTotalSectionCount(): number {
		let count = 0;
		for (const [, state] of this._providers) {
			count += state.sections.length;
		}
		return count;
	}

	private _pushMergedState(): void {
		const allSections: FeedSection[] = [];
		const allChips: FeedFilterChip[] = [];
		let anyContinuation = false;

		for (const [, state] of this._providers) {
			allSections.push(...state.sections);
			allChips.push(...state.filterChips);
			if (state.hasContinuation) anyContinuation = true;
		}

		const store = useHomeFeedStore.getState();
		store.setSections(allSections);
		store.setFilterChips(allChips);
		store.setHasContinuation(anyContinuation);
	}
}

export const homeFeedService = new HomeFeedService();
