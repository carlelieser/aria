import type { Track } from '@domain/entities/track';
import type { Result } from '@shared/types/result';
import type { HomeFeedOperations } from '@plugins/metadata/youtube-music/home-feed-operations';
import { useHomeFeedStore } from '../state/home-feed-store';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('HomeFeedService');

const STALENESS_THRESHOLD_MS = 10 * 60 * 1000;
const MIN_SECTIONS = 5;

export class HomeFeedService {
	private _operations: HomeFeedOperations | null = null;
	private _operationsReady: Promise<void>;
	private _resolveOperationsReady!: () => void;

	constructor() {
		this._operationsReady = new Promise((resolve) => {
			this._resolveOperationsReady = resolve;
		});
	}

	setHomeFeedOperations(ops: HomeFeedOperations): void {
		this._operations = ops;
		this._resolveOperationsReady();
		logger.info('Home feed operations set');
	}

	clearOperations(): void {
		this._operations = null;
		this._operationsReady = new Promise((resolve) => {
			this._resolveOperationsReady = resolve;
		});
		useHomeFeedStore.getState().reset();
		logger.info('Home feed operations cleared');
	}

	hasOperations(): boolean {
		return this._operations !== null;
	}

	async fetchHomeFeed({ force = false } = {}): Promise<void> {
		await this._operationsReady;
		if (!this._operations) return;

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

		const result = await this._operations.getHomeFeed();

		if (result.success) {
			const allSections = [...result.data.sections];
			let continuation = result.data.hasContinuation;

			while (allSections.length < MIN_SECTIONS && continuation) {
				const more = await this._operations.loadMore();
				if (!more.success) break;
				allSections.push(...more.data.sections);
				continuation = more.data.hasContinuation;
			}

			store.setSections(allSections);
			store.setFilterChips(result.data.filterChips);
			store.setHasContinuation(continuation);
			store.setLastFetchedAt(Date.now());
			store.setActiveFilterIndex(null);
			logger.info(`Home feed fetched: ${allSections.length} sections`);
		} else {
			store.setError(result.error.message);
			logger.error('Failed to fetch home feed', result.error);
		}

		store.setLoading(false);
	}

	async refresh(): Promise<void> {
		if (!this._operations) return;

		const store = useHomeFeedStore.getState();
		store.setRefreshing(true);

		const result = await this._operations.getHomeFeed();

		if (result.success) {
			const allSections = [...result.data.sections];
			let continuation = result.data.hasContinuation;

			while (allSections.length < MIN_SECTIONS && continuation) {
				const more = await this._operations.loadMore();
				if (!more.success) break;
				allSections.push(...more.data.sections);
				continuation = more.data.hasContinuation;
			}

			store.setSections(allSections);
			store.setFilterChips(result.data.filterChips);
			store.setHasContinuation(continuation);
			store.setLastFetchedAt(Date.now());
			store.setActiveFilterIndex(null);
		} else {
			store.setError(result.error.message);
			logger.error('Failed to refresh home feed', result.error);
		}

		store.setRefreshing(false);
	}

	async applyFilter(chipText: string, chipIndex: number): Promise<void> {
		if (!this._operations) return;

		const store = useHomeFeedStore.getState();
		store.setLoading(true);

		const result = await this._operations.applyFilter(chipText);

		if (result.success) {
			store.setSections(result.data.sections);
			store.setHasContinuation(result.data.hasContinuation);
			store.setActiveFilterIndex(chipIndex);
		} else {
			store.setError(result.error.message);
			logger.error('Failed to apply filter', result.error);
		}

		store.setLoading(false);
	}

	async loadMore(): Promise<void> {
		if (!this._operations) return;

		const store = useHomeFeedStore.getState();
		if (store.isLoadingMore || !store.hasContinuation) return;

		store.setLoadingMore(true);

		const result = await this._operations.loadMore();

		if (result.success) {
			store.appendSections(result.data.sections);
			store.setHasContinuation(result.data.hasContinuation);
		} else {
			logger.error('Failed to load more', result.error);
		}

		store.setLoadingMore(false);
	}

	async getPlaylistTracks(playlistId: string): Promise<Result<Track[], Error>> {
		await this._operationsReady;
		if (!this._operations) {
			return { success: false, error: new Error('No home feed operations available') };
		}
		return this._operations.getPlaylistTracks(playlistId);
	}
}

export const homeFeedService = new HomeFeedService();
