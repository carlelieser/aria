import { create } from 'zustand';
import type { FeedSection, FeedFilterChip } from '@domain/entities/feed-section';

interface HomeFeedState {
	sections: FeedSection[];
	filterChips: FeedFilterChip[];
	activeFilterIndex: number | null;
	isLoading: boolean;
	isRefreshing: boolean;
	isLoadingMore: boolean;
	hasContinuation: boolean;
	error: string | null;
	lastFetchedAt: number | null;

	setSections: (sections: FeedSection[]) => void;
	appendSections: (sections: FeedSection[]) => void;
	setFilterChips: (chips: FeedFilterChip[]) => void;
	setActiveFilterIndex: (index: number | null) => void;
	setLoading: (isLoading: boolean) => void;
	setRefreshing: (isRefreshing: boolean) => void;
	setLoadingMore: (isLoadingMore: boolean) => void;
	setHasContinuation: (hasContinuation: boolean) => void;
	setError: (error: string | null) => void;
	setLastFetchedAt: (timestamp: number) => void;
	reset: () => void;
}

const INITIAL_STATE = {
	sections: [] as FeedSection[],
	filterChips: [] as FeedFilterChip[],
	activeFilterIndex: null as number | null,
	isLoading: false,
	isRefreshing: false,
	isLoadingMore: false,
	hasContinuation: false,
	error: null as string | null,
	lastFetchedAt: null as number | null,
};

export const useHomeFeedStore = create<HomeFeedState>((set) => ({
	...INITIAL_STATE,

	setSections: (sections: FeedSection[]) => {
		set({ sections, error: null });
	},

	appendSections: (sections: FeedSection[]) => {
		set((state) => ({ sections: [...state.sections, ...sections] }));
	},

	setFilterChips: (filterChips: FeedFilterChip[]) => {
		set({ filterChips });
	},

	setActiveFilterIndex: (activeFilterIndex: number | null) => {
		set({ activeFilterIndex });
	},

	setLoading: (isLoading: boolean) => {
		set({ isLoading });
	},

	setRefreshing: (isRefreshing: boolean) => {
		set({ isRefreshing });
	},

	setLoadingMore: (isLoadingMore: boolean) => {
		set({ isLoadingMore });
	},

	setHasContinuation: (hasContinuation: boolean) => {
		set({ hasContinuation });
	},

	setError: (error: string | null) => {
		set({ error, isLoading: false, isRefreshing: false, isLoadingMore: false });
	},

	setLastFetchedAt: (lastFetchedAt: number) => {
		set({ lastFetchedAt });
	},

	reset: () => {
		set(INITIAL_STATE);
	},
}));

export const useHomeFeedSections = () => useHomeFeedStore((state) => state.sections);
export const useHomeFeedFilterChips = () => useHomeFeedStore((state) => state.filterChips);
export const useHomeFeedLoading = () => useHomeFeedStore((state) => state.isLoading);
export const useHomeFeedRefreshing = () => useHomeFeedStore((state) => state.isRefreshing);
export const useHomeFeedLoadingMore = () => useHomeFeedStore((state) => state.isLoadingMore);
export const useHomeFeedError = () => useHomeFeedStore((state) => state.error);
export const useHomeFeedHasContinuation = () => useHomeFeedStore((state) => state.hasContinuation);
