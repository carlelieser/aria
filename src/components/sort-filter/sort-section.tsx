/**
 * SortSection Component
 *
 * Generic sort options for filtering.
 * Uses M3 theming.
 */

import React, { memo, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { Check, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import type { SortField } from '@/src/domain/utils/track-filtering';
import type { SearchSortField, UnifiedSortField } from '@/src/domain/utils/search-filtering';

interface SortOption<T extends string> {
	readonly field: T;
	readonly label: string;
}

interface SortSectionProps<T extends string> {
	readonly sortField: T;
	readonly sortDirection: 'asc' | 'desc';
	readonly sortOptions: readonly SortOption<T>[];
	readonly onSortFieldChange: (field: T) => void;
	readonly onToggleDirection: () => void;
}

export const LIBRARY_SORT_OPTIONS: readonly SortOption<SortField>[] = [
	{ field: 'title', label: 'Title' },
	{ field: 'artist', label: 'Artist' },
	{ field: 'dateAdded', label: 'Date Added' },
	{ field: 'duration', label: 'Duration' },
] as const;

export const EXPLORE_SORT_OPTIONS: readonly SortOption<SearchSortField>[] = [
	{ field: 'relevance', label: 'Relevance' },
	{ field: 'title', label: 'Title' },
	{ field: 'artist', label: 'Artist' },
	{ field: 'duration', label: 'Duration' },
] as const;

export const UNIFIED_SORT_OPTIONS: readonly SortOption<UnifiedSortField>[] = [
	{ field: 'relevance', label: 'Relevance' },
	{ field: 'title', label: 'Title' },
	{ field: 'artist', label: 'Artist' },
	{ field: 'dateAdded', label: 'Date Added' },
	{ field: 'duration', label: 'Duration' },
] as const;

interface SortOptionItemProps<T extends string> {
	readonly field: T;
	readonly label: string;
	readonly isSelected: boolean;
	readonly onSelect: (field: T) => void;
}

const SortOptionItem = memo(function SortOptionItem<T extends string>({
	field,
	label,
	isSelected,
	onSelect,
}: SortOptionItemProps<T>) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onSelect(field);
	}, [onSelect, field]);

	return (
		<Pressable style={styles.optionRow} onPress={handlePress}>
			<Text
				variant={'bodyMedium'}
				style={{
					color: colors.onSurface,
					fontWeight: isSelected ? '500' : '400',
				}}
			>
				{label}
			</Text>
			{isSelected && <Icon as={Check} size={18} color={colors.primary} />}
		</Pressable>
	);
}) as <T extends string>(props: SortOptionItemProps<T>) => React.ReactElement;

export function SortSection<T extends string>({
	sortField,
	sortDirection,
	sortOptions,
	onSortFieldChange,
	onToggleDirection,
}: SortSectionProps<T>) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text
					variant={'labelMedium'}
					style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
				>
					SORT BY
				</Text>
				<Pressable onPress={onToggleDirection} style={styles.directionButton}>
					<Icon
						as={sortDirection === 'asc' ? ArrowUp : ArrowDown}
						size={16}
						color={colors.onSurface}
					/>
					<Text variant={'bodySmall'} style={{ color: colors.onSurface }}>
						{sortDirection === 'asc' ? 'Ascending' : 'Descending'}
					</Text>
				</Pressable>
			</View>
			<View style={styles.options}>
				{sortOptions.map((option) => (
					<SortOptionItem
						key={option.field}
						field={option.field}
						label={option.label}
						isSelected={sortField === option.field}
						onSelect={onSortFieldChange}
					/>
				))}
			</View>
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
	},
	sectionLabel: {
		letterSpacing: 0.5,
	},
	directionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: 12,
	},
	options: {
		gap: 4,
	},
	optionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 4,
	},
});
