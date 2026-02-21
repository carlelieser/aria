import { RefreshControl, StyleSheet, View } from 'react-native';
import { HomeIcon, AlertCircleIcon } from 'lucide-react-native';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { EmptyState } from '@/src/components/ui/empty-state';
import { FeedCarousel, FeedFilterChips, HomeFeedSkeleton } from '@/src/components/home';
import { useHomeFeed } from '@/src/hooks/use-home-feed';
import { useHomeFeedStore } from '@/src/application/state/home-feed-store';
import { useAppTheme } from '@/lib/theme';

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
				onScroll={({ nativeEvent }) => {
					const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
					const distanceFromEnd =
						contentSize.height - layoutMeasurement.height - contentOffset.y;
					if (distanceFromEnd < layoutMeasurement.height * 2) {
						handleLoadMore();
					}
				}}
				scrollEventThrottle={400}
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
