/**
 * ResultGroup Component
 *
 * Wrapper for a group of result sections (e.g., "Your Library", "From YouTube Music").
 * Contains group header with source label and collapsible expand/collapse state.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
	useAnimatedStyle,
	withTiming,
	useSharedValue,
	FadeIn,
	FadeOut,
} from 'react-native-reanimated';
import { ChevronDownIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface ResultGroupProps {
	readonly title: string;
	readonly subtitle?: string;
	readonly children: React.ReactNode;
	readonly defaultExpanded?: boolean;
	readonly isEmpty?: boolean;
	readonly emptyState?: React.ReactNode;
}

export function ResultGroup({
	title,
	subtitle,
	children,
	defaultExpanded = true,
	isEmpty = false,
	emptyState,
}: ResultGroupProps) {
	const { colors } = useAppTheme();
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);
	const rotation = useSharedValue(defaultExpanded ? 180 : 0);

	const handleToggle = useCallback(() => {
		setIsExpanded((prev) => {
			const newValue = !prev;
			rotation.value = withTiming(newValue ? 180 : 0, { duration: 200 });
			return newValue;
		});
	}, [rotation]);

	const chevronStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	if (isEmpty && !emptyState) {
		return null;
	}

	return (
		<View style={styles.container}>
			<Pressable onPress={handleToggle} style={styles.header}>
				<View style={styles.headerText}>
					<Text variant="titleMedium" style={[styles.title, { color: colors.onSurface }]}>
						{title}
					</Text>
					{subtitle && (
						<Text
							variant="bodySmall"
							style={[styles.subtitle, { color: colors.onSurfaceVariant }]}
						>
							{subtitle}
						</Text>
					)}
				</View>
				<Animated.View style={chevronStyle}>
					<Icon as={ChevronDownIcon} size={20} color={colors.onSurfaceVariant} />
				</Animated.View>
			</Pressable>

			{isExpanded && (
				<Animated.View
					entering={FadeIn.duration(150)}
					exiting={FadeOut.duration(100)}
					style={styles.content}
				>
					{isEmpty ? (
						<View style={styles.emptyStateContainer}>{emptyState}</View>
					) : (
						children
					)}
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 12,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	headerText: {
		flex: 1,
		gap: 2,
	},
	title: {
		fontWeight: '600',
	},
	subtitle: {
		fontSize: 12,
	},
	content: {
		gap: 16,
	},
	emptyStateContainer: {
		paddingHorizontal: 16,
	},
});
