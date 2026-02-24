import { useEffect, useCallback, useMemo } from 'react';
import { InteractionManager } from 'react-native';
import {
	useHomeFeedSections,
	useHomeFeedFilterChips,
	useHomeFeedLoading,
	useHomeFeedRefreshing,
	useHomeFeedError,
	useHomeFeedHasContinuation,
} from '@/src/application/state/home-feed-store';
import { homeFeedService } from '@/src/application/services/home-feed-service';
import { useCuratedContent } from './use-curated-content';
import type { FeedSection, FeedFilterChip } from '@/src/domain/entities/feed-section';

interface HomeFeedResult {
	readonly localSections: FeedSection[];
	readonly remoteSections: FeedSection[];
	readonly filterChips: FeedFilterChip[];
	readonly isLoading: boolean;
	readonly isRefreshing: boolean;
	readonly error: string | null;
	readonly hasContinuation: boolean;
	readonly handleRefresh: () => void;
	readonly handleApplyFilter: (chipText: string, index: number) => void;
	readonly handleClearFilter: () => void;
	readonly handleLoadMore: () => void;
}

function buildLocalSections(curated: ReturnType<typeof useCuratedContent>): FeedSection[] {
	const sections: FeedSection[] = [];

	if (curated.recentlyPlayed.length > 0) {
		sections.push({
			id: 'local-recently-played',
			title: 'Recently Played',
			items: curated.recentlyPlayed.map((track) => ({ type: 'track', data: track })),
			source: 'local',
		});
	}

	if (curated.favoriteTracks.length > 0) {
		sections.push({
			id: 'local-favorites',
			title: 'Favorites',
			items: curated.favoriteTracks.map((track) => ({ type: 'track', data: track })),
			source: 'local',
		});
	}

	if (curated.recentlyAdded.length > 0) {
		sections.push({
			id: 'local-recently-added',
			title: 'Recently Added',
			items: curated.recentlyAdded.map((track) => ({ type: 'track', data: track })),
			source: 'local',
		});
	}

	return sections;
}

export function useHomeFeed(): HomeFeedResult {
	const remoteSections = useHomeFeedSections();
	const filterChips = useHomeFeedFilterChips();
	const isLoading = useHomeFeedLoading();
	const isRefreshing = useHomeFeedRefreshing();
	const error = useHomeFeedError();
	const hasContinuation = useHomeFeedHasContinuation();
	const curated = useCuratedContent(10);

	useEffect(() => {
		// Defer the network fetch until after mount animations/interactions
		// complete so the feed screen paints without blocking on async I/O.
		const task = InteractionManager.runAfterInteractions(() => {
			homeFeedService.fetchHomeFeed();
		});
		return () => task.cancel();
	}, []);

	const localSections = useMemo(() => buildLocalSections(curated), [curated]);

	const handleRefresh = useCallback(() => {
		homeFeedService.refresh();
	}, []);

	const handleApplyFilter = useCallback((chipText: string, index: number) => {
		homeFeedService.applyFilter(chipText, index);
	}, []);

	const handleClearFilter = useCallback(() => {
		homeFeedService.fetchHomeFeed({ force: true });
	}, []);

	const handleLoadMore = useCallback(() => {
		homeFeedService.loadMore();
	}, []);

	return {
		localSections,
		remoteSections,
		filterChips,
		isLoading,
		isRefreshing,
		error,
		hasContinuation,
		handleRefresh,
		handleApplyFilter,
		handleClearFilter,
		handleLoadMore,
	};
}
