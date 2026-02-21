import { useCallback, useRef } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { HomeIcon, AlertCircleIcon, SettingsIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { EmptyState } from '@/src/components/ui/empty-state';
import { Icon } from '@/src/components/ui/icon';
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

	const viewportHeight = useRef(0);
	const scrollOffset = useRef(0);

	const checkPrefetch = useCallback(
		(contentHeight: number) => {
			if (viewportHeight.current <= 0) return;
			const distanceFromEnd =
				contentHeight - viewportHeight.current - scrollOffset.current;
			if (distanceFromEnd < viewportHeight.current * PREFETCH_VIEWPORTS) {
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
				rightActions: (
					<IconButton
						icon={() => (
							<Icon as={SettingsIcon} size={22} color={colors.onSurfaceVariant} />
						)}
						onPress={() => router.push('/settings')}
					/>
				),
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
						{sections
							.filter((section) => section.items.length > 0)
							.map((section) => (
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
