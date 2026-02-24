import { useCallback, useRef } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { AlertCircleIcon, MusicIcon } from 'lucide-react-native';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { EmptyState } from '@/src/components/ui/empty-state';
import {
	FeedCarousel,
	FeedFilterChips,
	FeedSectionSkeleton,
	HomeFeedSkeleton,
} from '@/src/components/home';
import { useHomeFeed } from '@/src/hooks/use-home-feed';
import { useHomeFeedStore } from '@/src/application/state/home-feed-store';
import { useAppTheme } from '@/lib/theme';

const useHasCompletedInitialLoad = () => useHomeFeedStore((state) => state.lastFetchedAt !== null);

const PREFETCH_VIEWPORTS = 3;
const MIN_VISIBLE_SECTIONS = 4;

export default function HomeScreen() {
	const { colors } = useAppTheme();
	const hasCompletedInitialLoad = useHasCompletedInitialLoad();
	const activeFilterIndex = useHomeFeedStore((state) => state.activeFilterIndex);
	const {
		localSections,
		remoteSections,
		filterChips,
		isLoading,
		isRefreshing,
		error,
		handleRefresh,
		handleApplyFilter,
		handleClearFilter,
		handleLoadMore,
	} = useHomeFeed();

	const viewportHeight = useRef(0);
	const scrollOffset = useRef(0);

	const checkPrefetch = useCallback(
		(contentHeight: number) => {
			if (viewportHeight.current <= 0) return;
			const distanceFromEnd = contentHeight - viewportHeight.current - scrollOffset.current;
			if (distanceFromEnd < viewportHeight.current * PREFETCH_VIEWPORTS) {
				handleLoadMore();
			}
		},
		[handleLoadMore]
	);

	const visibleLocalSections = localSections.filter((s) => s.items.length > 0);
	const visibleRemoteSections = remoteSections.filter((s) => s.items.length > 0);
	const totalVisible = visibleLocalSections.length + visibleRemoteSections.length;
	const skeletonCount =
		!hasCompletedInitialLoad && isLoading
			? Math.max(0, MIN_VISIBLE_SECTIONS - totalVisible)
			: 0;
	const hasData = localSections.length > 0 || remoteSections.length > 0;
	const showSkeleton = isLoading && !hasData;
	const showError = !isLoading && !hasData && error !== null;
	const showEmpty = !isLoading && !hasData && error === null;

	return (
		<PageLayout edges={[]}>
			<PlayerAwareScrollView
				refreshControl={
					<RefreshControl
						refreshing={isRefreshing}
						onRefresh={handleRefresh}
						tintColor={colors.primary}
						colors={[colors.primary]}
					/>
				}
				showsVerticalScrollIndicator={false}
				onLayout={(e) => {
					viewportHeight.current = e.nativeEvent.layout.height;
				}}
				onScroll={({ nativeEvent }) => {
					scrollOffset.current = nativeEvent.contentOffset.y;
					checkPrefetch(nativeEvent.contentSize.height);
				}}
				onContentSizeChange={(_w, h) => {
					checkPrefetch(h);
				}}
				scrollEventThrottle={200}
			>
				{showSkeleton && <HomeFeedSkeleton />}

				{showError && (
					<EmptyState
						icon={AlertCircleIcon}
						title={'Something went wrong'}
						description={error ?? 'Failed to load home feed'}
					/>
				)}

				{showEmpty && (
					<EmptyState
						icon={MusicIcon}
						title={'Your feed is empty'}
						description={
							'Connect a music provider or start listening to see personalized content here'
						}
					/>
				)}

				{hasData && (
					<View style={styles.content}>
						{visibleLocalSections.map((section) => (
							<FeedCarousel key={section.id} section={section} />
						))}
						{filterChips.length > 0 && (
							<FeedFilterChips
								chips={filterChips}
								activeIndex={activeFilterIndex}
								onSelect={handleApplyFilter}
								onDeselect={handleClearFilter}
							/>
						)}
						{visibleRemoteSections.map((section) => (
							<FeedCarousel key={section.id} section={section} />
						))}
						{skeletonCount > 0 &&
							Array.from({ length: skeletonCount }, (_, i) => (
								<FeedSectionSkeleton key={`skeleton-${i}`} />
							))}
					</View>
				)}
			</PlayerAwareScrollView>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	content: {
		gap: 24,
		paddingTop: 8,
		paddingBottom: 16,
	},
});
