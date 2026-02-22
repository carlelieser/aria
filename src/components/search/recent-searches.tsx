import { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { ClockIcon, XIcon, Trash2Icon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface RecentSearchesProps {
	readonly searches: readonly string[];
	readonly onSelect: (query: string) => void;
	readonly onRemove: (query: string) => void;
	readonly onClearAll: () => void;
}

export const RecentSearches = memo(function RecentSearches({
	searches,
	onSelect,
	onRemove,
	onClearAll,
}: RecentSearchesProps) {
	const { colors } = useAppTheme();

	const titleStyle = useMemo(
		() => ({ color: colors.onSurface, fontWeight: '600' as const }),
		[colors.onSurface]
	);

	if (searches.length === 0) return null;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text variant={'titleSmall'} style={titleStyle}>
					Recent Searches
				</Text>
				<Pressable
					onPress={onClearAll}
					hitSlop={8}
					accessibilityLabel={'Clear all recent searches'}
					accessibilityRole={'button'}
				>
					<Icon as={Trash2Icon} size={16} color={colors.onSurfaceVariant} />
				</Pressable>
			</View>
			<View style={styles.list}>
				{searches.map((query) => (
					<RecentSearchItem
						key={query}
						query={query}
						onSelect={onSelect}
						onRemove={onRemove}
					/>
				))}
			</View>
		</View>
	);
});

interface RecentSearchItemProps {
	readonly query: string;
	readonly onSelect: (query: string) => void;
	readonly onRemove: (query: string) => void;
}

const RecentSearchItem = memo(function RecentSearchItem({
	query,
	onSelect,
	onRemove,
}: RecentSearchItemProps) {
	const { colors } = useAppTheme();

	const handleSelect = useCallback(() => {
		onSelect(query);
	}, [onSelect, query]);

	const handleRemove = useCallback(() => {
		onRemove(query);
	}, [onRemove, query]);

	return (
		<Chip
			icon={({ size }) => <Icon as={ClockIcon} size={size} color={colors.onSurfaceVariant} />}
			onPress={handleSelect}
			onClose={handleRemove}
			closeIcon={({ size }) => (
				<Icon as={XIcon} size={size} color={colors.onSurfaceVariant} />
			)}
			mode={'flat'}
			accessibilityLabel={`Search for ${query}`}
			style={{
				height: 48,
				display: 'flex',
				alignItems: 'center',
				flexDirection: 'row',
			}}
			elevation={1}
		>
			{query}
		</Chip>
	);
});

const styles = StyleSheet.create({
	container: {
		gap: 8,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	list: {
		paddingHorizontal: 16,
		gap: 6,
	},
});
