/**
 * DetailsPage
 *
 * Unified detail page component for albums, artists, and playlists.
 * Provides consistent layout and styling while allowing customization
 * through configuration props.
 *
 * Features:
 * - Dynamic theming based on artwork colors using Material 3 palette
 * - Scrollable header that moves with content for immersive experience
 *
 * Supports two content modes:
 * 1. Sections mode: Pass `sections` for structured content
 * 2. Children mode: Pass `children` for full control over content
 *
 * For screens using FlatList (disableScroll=true), use `renderContent` prop
 * to receive the scrollable header component for use as ListHeaderComponent.
 */

import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import {
	View,
	StyleSheet,
	ScrollView,
	type NativeSyntheticEvent,
	type NativeScrollEvent,
} from 'react-native';
import { Text } from 'react-native-paper';
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
import { useAppTheme } from '@/lib/theme';
import { useDetailsPageTheme } from '@/src/hooks/use-details-page-theme';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsPageProps, DetailsPageSection } from './types';

/** Scroll distance over which the header background transitions from transparent to solid */
const HEADER_SCROLL_THRESHOLD = 200;

interface DetailsPageContextValue {
	readonly colors: M3ColorScheme;
	readonly headerColors: M3ColorScheme;
	readonly headerSolid: boolean;
	readonly hasCustomColors: boolean;
}

const DetailsPageContext = createContext<DetailsPageContextValue | null>(null);

/**
 * Hook to access the scoped detail page theme colors.
 * Falls back to app theme colors if used outside DetailsPage.
 */
export function useDetailsPageColors(): M3ColorScheme {
	const context = useContext(DetailsPageContext);
	const { colors } = useAppTheme();
	return context?.colors ?? colors;
}

/**
 * Hook to access the dark-variant colors for elements overlaying
 * the dark-tinted blur header (nav bar icons, action buttons).
 */
export function useDetailsPageHeaderColors(): M3ColorScheme {
	const context = useContext(DetailsPageContext);
	const { colors } = useAppTheme();
	if (!context) return colors;
	return context.headerSolid ? context.colors : context.headerColors;
}

interface RenderContentProps {
	/** Scrollable header component to use as ListHeaderComponent in FlatList */
	readonly ListHeaderComponent: ReactNode;
	/** Scroll handler to wire up for header background animation */
	readonly onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

interface ExtendedDetailsPageProps extends Omit<DetailsPageProps, 'sections'> {
	readonly sections?: readonly DetailsPageSection[];
	readonly children?: ReactNode;
	/** Render prop for screens that manage their own scroll (e.g., FlatList) */
	readonly renderContent?: (props: RenderContentProps) => ReactNode;
	readonly scrollContentStyle?: object;
	readonly disableScroll?: boolean;
}

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
		(e: NativeSyntheticEvent<NativeScrollEvent>) => {
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

	const tintColor = headerSolid ? colors.onSurface : headerColors.onSurface;

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

	const renderSections = () => {
		if (!sections) return null;

		const hasContent = sections.some((section) => section.content !== null);
		if (!hasContent && emptyContent) return emptyContent;

		return sections.map((section) => (
			<View key={section.key} style={styles.section}>
				{section.title && (
					<Text
						variant={'titleMedium'}
						style={[styles.sectionTitle, { color: colors.onSurface }]}
					>
						{section.title}
					</Text>
				)}
				{section.horizontal ? (
					<ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.horizontalScrollView}
						contentContainerStyle={styles.horizontalContent}
					>
						{section.content}
					</ScrollView>
				) : (
					section.content
				)}
			</View>
		));
	};

	const contextValue: DetailsPageContextValue = {
		colors,
		headerColors,
		headerSolid,
		hasCustomColors: pageTheme.hasCustomColors,
	};

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
					{children ?? renderSections()}
				</View>
			);
		}

		const content = children ?? renderSections();

		return (
			<PlayerAwareScrollView
				contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
				onScroll={handleScroll}
				scrollEventThrottle={16}
			>
				{scrollableHeader}
				<View style={styles.contentSection}>{content}</View>
			</PlayerAwareScrollView>
		);
	};

	return (
		<DetailsPageContext.Provider value={contextValue}>
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
	scrollableHeader: {
		overflow: 'hidden',
	},
	scrollContent: {
		flexGrow: 1,
	},
	contentSection: {
		paddingVertical: 16,
	},
	disabledScrollContainer: {
		flex: 1,
	},
	section: {
		marginBottom: 24,
	},
	sectionTitle: {
		fontWeight: '600',
		marginBottom: 12,
		paddingHorizontal: 24,
	},
	horizontalScrollView: {},
	horizontalContent: {
		paddingHorizontal: 24,
		gap: 12,
	},
});
