/**
 * DetailsPage
 *
 * Unified detail page for albums, artists, and playlists.
 * Dynamic theming based on artwork colors, scrollable header
 * that transitions from transparent to solid.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	interpolate,
	Extrapolation,
} from 'react-native-reanimated';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { PageLayout } from '@/src/components/ui/page-layout';
import { DetailsHeader } from './details-header';
import { SectionList } from './section-list';
import { DetailsPageContext } from './context';
import { useAppTheme } from '@/lib/theme';
import { useDetailsPageTheme } from '@/src/hooks/use-details-page-theme';
import type { ExtendedDetailsPageProps } from './types';

const HEADER_SCROLL_THRESHOLD = 200;

export function DetailsPage({
	headerInfo,
	headerRightActions,
	sections,
	children,
	renderContent,
	isLoading,
	loadingContent,
	emptyContent,
	bottomContent,
	scrollContentStyle,
	disableScroll = false,
	pageTitle = '',
}: ExtendedDetailsPageProps) {
	const insets = useSafeAreaInsets();
	const pageTheme = useDetailsPageTheme(headerInfo.artworkUrl);
	const colors = pageTheme.colors;
	const headerColors = pageTheme.headerColors;
	const showHeaderSkeleton = Boolean(isLoading && loadingContent);

	const scrollY = useSharedValue(0);
	const [headerSolid, setHeaderSolid] = useState(false);
	const handleScroll = useCallback(
		(e: { nativeEvent: { contentOffset: { y: number } } }) => {
			const y = e.nativeEvent.contentOffset.y;
			scrollY.value = y;
			const solid = y > HEADER_SCROLL_THRESHOLD * 0.8;
			setHeaderSolid((prev) => (prev !== solid ? solid : prev));
		},
		[scrollY]
	);

	const headerBgStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			scrollY.value,
			[0, HEADER_SCROLL_THRESHOLD],
			[0, 1],
			Extrapolation.CLAMP
		),
	}));

	const { isDark } = useAppTheme();
	const tintColor = headerSolid ? colors.onSurface : headerColors.onSurface;
	const needsLightStatusBar = pageTheme.hasCustomColors && !headerSolid;
	const statusBarStyle = needsLightStatusBar ? 'light' : isDark ? 'light' : 'dark';

	const scrollableHeader = (
		<View
			style={[
				styles.scrollableHeader,
				showHeaderSkeleton && {
					backgroundColor: colors.surfaceContainerHigh,
					paddingTop: insets.top + 84,
					paddingBottom: 24,
				},
			]}
		>
			{showHeaderSkeleton ? (
				loadingContent
			) : (
				<DetailsHeader
					info={headerInfo}
					colors={colors}
					topFadeColor={headerColors.background}
					fadeColor={colors.background}
				/>
			)}
		</View>
	);

	const sectionContent = sections ? (
		<SectionList sections={sections} emptyContent={emptyContent} colors={colors} />
	) : null;

	const renderMainContent = () => {
		if (disableScroll) {
			if (renderContent) {
				return renderContent({
					ListHeaderComponent: scrollableHeader,
					onScroll: handleScroll,
				});
			}
			return (
				<View style={styles.disabledScrollContainer}>
					{scrollableHeader}
					{children ?? sectionContent}
				</View>
			);
		}

		return (
			<PlayerAwareScrollView
				contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
				onScroll={handleScroll}
				scrollEventThrottle={16}
			>
				{scrollableHeader}
				<View style={styles.contentSection}>{children ?? sectionContent}</View>
			</PlayerAwareScrollView>
		);
	};

	const contextValue = {
		colors,
		headerColors,
		headerSolid,
		hasCustomColors: pageTheme.hasCustomColors,
	};

	return (
		<DetailsPageContext.Provider value={contextValue}>
			<StatusBar style={statusBarStyle} />
			<PageLayout
				style={{ backgroundColor: colors.background }}
				header={{
					title: pageTitle,
					showBack: true,
					transparent: true,
					transparentBackground: (
						<Animated.View
							style={[
								StyleSheet.absoluteFill,
								{ backgroundColor: colors.background },
								headerBgStyle,
							]}
						/>
					),
					tintColor,
					rightActions: headerRightActions,
					extended: true,
					showBorder: false,
				}}
			>
				{renderMainContent()}
				{bottomContent}
			</PageLayout>
		</DetailsPageContext.Provider>
	);
}

const styles = StyleSheet.create({
	scrollableHeader: { overflow: 'hidden' },
	scrollContent: { flexGrow: 1 },
	contentSection: { paddingVertical: 16 },
	disabledScrollContainer: { flex: 1 },
});
