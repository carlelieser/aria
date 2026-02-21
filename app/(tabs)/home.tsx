import { useCallback, useRef } from 'react';
import { RefreshControl, StyleSheet, View, type NativeScrollEvent } from 'react-native';
import { HomeIcon, AlertCircleIcon } from 'lucide-react-native';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FeedCarousel, FeedFilterChips, HomeFeedSkeleton } from '@/src/components/home';
import { useHomeFeed } from '@/src/hooks/use-home-feed';
import { useHomeFeedStore } from '@/src/application/state/home-feed-store';
import { useAppTheme } from '@/lib/theme';

const PREFETCH_VIEWPORTS = 3;

export default function HomeScreen() {
	const { colors } = useAppTheme();
	const activeFilterIndex = useHomeFeedStore((state) => state.activeFilterIndex);
	const {
		sections,
		filterChips,
		isLoading,
		isRefreshing,
		error,
		handleRefresh,
		handleApplyFilter,
		handleClearFilter,
		handleLoadMore,
	} = useHomeFeed();

	const scrollMetrics = useRef<NativeScrollEvent | null>(null);

	const checkLoadMore = useCallback(
		(metrics: NativeScrollEvent) => {
			const { layoutMeasurement, contentOffset, contentSize } = metrics;
			const distanceFromEnd =
				contentSize.height - layoutMeasurement.height - contentOffset.y;
			if (distanceFromEnd < layoutMeasurement.height * PREFETCH_VIEWPORTS) {
				handleLoadMore();
			}
		},
		[handleLoadMore]
	);

	const hasData = sections.length > 0;
	const showSkeleton = isLoading && !hasData;
	const showError = !isLoading && !hasData && error !== null;

	return (
		<PageLayout
			header={{
				icon: HomeIcon,
				title: 'Home',
				showBorder: false,
			}}
		>
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
				onScroll={({ nativeEvent }) => {
					scrollMetrics.current = nativeEvent;
					checkLoadMore(nativeEvent);
				}}
				onContentSizeChange={(w, h) => {
					if (scrollMetrics.current) {
						checkLoadMore({
							...scrollMetrics.current,
							contentSize: { width: w, height: h },
						});
					}
				}}
				scrollEventThrottle={200}
			>
				{showSkeleton && <HomeFeedSkeleton />}

				{showError && (
					<EmptyState
						icon={AlertCircleIcon}
						title="Something went wrong"
						description={error ?? 'Failed to load home feed'}
					/>
				)}

				{hasData && (
					<View style={styles.content}>
						{filterChips.length > 0 && (
							<FeedFilterChips
								chips={filterChips}
								activeIndex={activeFilterIndex}
								onSelect={handleApplyFilter}
								onDeselect={handleClearFilter}
							/>
						)}
						{sections.map((section) => (
							<FeedCarousel key={section.id} section={section} />
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
