/**
 * PageLayout Component
 *
 * Top-level page wrapper with optional header, safe area edges, and content padding.
 */

import { View, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@/lib/theme';
import { PageHeader } from './page-header';
import type { PageLayoutProps } from './types';

export function PageLayout({
	header,
	edges = ['top'],
	contentPadding = false,
	style,
	contentStyle,
	children,
}: PageLayoutProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();

	const isExtended = header?.extended ?? false;
	const isTransparent = header?.transparent ?? false;
	const effectiveEdges = isExtended ? edges.filter((e) => e !== 'top') : edges;

	return (
		<SafeAreaView
			style={[styles.container, { backgroundColor: colors.background }, style]}
			edges={effectiveEdges}
		>
			{header && !isTransparent && (
				<PageHeader {...header} topInset={isExtended ? insets.top : 0} />
			)}
			<View style={[styles.content, contentPadding && styles.contentPadding, contentStyle]}>
				{children}
			</View>
			{header && isTransparent && (
				<View style={styles.transparentHeaderOverlay} pointerEvents={'box-none'}>
					{header.transparentBackground}
					<PageHeader {...header} topInset={isExtended ? insets.top : 0} />
				</View>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	transparentHeaderOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 1,
	},
	content: {
		flex: 1,
	},
	contentPadding: {
		paddingHorizontal: 16,
	},
});

export type { PageLayoutProps, PageHeaderProps } from './types';
