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

import { createContext, useContext, type ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { PageLayout } from '@/components/page-layout';
import { DetailsHeader } from './details-header';
import { useAppTheme } from '@/lib/theme';
import { useDetailsPageTheme } from '@/hooks/use-details-page-theme';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsPageProps, DetailsPageSection } from './types';

interface DetailsPageContextValue {
	readonly colors: M3ColorScheme;
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

interface RenderContentProps {
	/** Scrollable header component to use as ListHeaderComponent in FlatList */
	readonly ListHeaderComponent: ReactNode;
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
	pageTitle,
	headerInfo,
	headerRightActions,
	sections,
	children,
	renderContent,
	isLoading,
	loadingContent,
	emptyContent,
	bottomContent,
	compact = false,
	scrollContentStyle,
	disableScroll = false,
}: ExtendedDetailsPageProps) {
	const { colors: appColors } = useAppTheme();
	const pageTheme = useDetailsPageTheme(headerInfo.artworkUrl);

	const colors = pageTheme.colors;
	const showHeaderSkeleton = isLoading && loadingContent;

	const scrollableHeader = (
		<View style={[styles.scrollableHeader, { backgroundColor: colors.surfaceContainerHigh }]}>
			{showHeaderSkeleton ? (
				loadingContent
			) : (
				<DetailsHeader info={headerInfo} colors={colors} />
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
						variant="titleMedium"
						style={[styles.sectionTitle, { color: appColors.onSurface }]}
					>
						{section.title}
					</Text>
				)}
				{section.horizontal ? (
					<PlayerAwareScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						style={styles.horizontalScrollView}
						contentContainerStyle={styles.horizontalContent}
					>
						{section.content}
					</PlayerAwareScrollView>
				) : (
					section.content
				)}
			</View>
		));
	};

	const contextValue: DetailsPageContextValue = {
		colors,
		hasCustomColors: pageTheme.hasCustomColors,
	};

	const renderMainContent = () => {
		if (disableScroll) {
			if (renderContent) {
				return renderContent({ ListHeaderComponent: scrollableHeader });
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
			>
				{scrollableHeader}
				<View style={styles.contentSection}>{content}</View>
			</PlayerAwareScrollView>
		);
	};

	return (
		<DetailsPageContext.Provider value={contextValue}>
			<PageLayout
				header={{
					title: pageTitle,
					showBack: true,
					backgroundColor: colors.surfaceContainerHigh,
					rightActions: headerRightActions,
					extended: true,
					compact,
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
		paddingBottom: 24,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
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
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontWeight: '600',
		marginBottom: 12,
	},
	horizontalScrollView: {
		marginHorizontal: -16,
	},
	horizontalContent: {
		paddingHorizontal: 16,
		gap: 12,
	},
});
