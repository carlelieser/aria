/**
 * SectionList Component
 *
 * Renders a list of detail page sections with optional titles
 * and horizontal scroll support.
 */

import type { ReactNode } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { M3ColorScheme } from '@/lib/theme/colors';
import type { DetailsPageSection } from './types';

interface SectionListProps {
	readonly sections: readonly DetailsPageSection[];
	readonly emptyContent?: ReactNode;
	readonly colors: M3ColorScheme;
}

export function SectionList({ sections, emptyContent, colors }: SectionListProps) {
	const hasContent = sections.some((section) => section.content !== null);
	if (!hasContent && emptyContent) return <>{emptyContent}</>;

	return (
		<>
			{sections.map((section) => (
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
			))}
		</>
	);
}

const styles = StyleSheet.create({
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
