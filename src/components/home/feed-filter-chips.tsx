import { memo, useCallback } from 'react';
import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { FeedFilterChip } from '@/src/domain/entities/feed-section';

interface FeedFilterChipsProps {
	readonly chips: FeedFilterChip[];
	readonly activeIndex: number | null;
	readonly onSelect: (chipText: string, index: number) => void;
	readonly onDeselect?: () => void;
}

export const FeedFilterChips = memo(function FeedFilterChips({
	chips,
	activeIndex,
	onSelect,
	onDeselect,
}: FeedFilterChipsProps) {
	if (chips.length === 0) return null;

	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={styles.container}
		>
			{chips.map((chip, index) => (
				<FilterChip
					key={chip.text}
					text={chip.text}
					isActive={activeIndex === index}
					onPress={() => {
						if (activeIndex === index) {
							onDeselect?.();
						} else {
							onSelect(chip.text, index);
						}
					}}
				/>
			))}
		</ScrollView>
	);
});

interface FilterChipProps {
	readonly text: string;
	readonly isActive: boolean;
	readonly onPress: () => void;
}

const FilterChip = memo(function FilterChip({ text, isActive, onPress }: FilterChipProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onPress();
	}, [onPress]);

	return (
		<Pressable
			onPress={handlePress}
			style={[
				styles.chip,
				{
					backgroundColor: isActive
						? colors.secondaryContainer
						: colors.surfaceContainerHigh,
				},
			]}
		>
			<Text
				variant={'labelLarge'}
				style={{
					color: isActive ? colors.onSecondaryContainer : colors.onSurfaceVariant,
				}}
			>
				{text}
			</Text>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		gap: 8,
	},
	chip: {
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: M3Shapes.small,
	},
});
