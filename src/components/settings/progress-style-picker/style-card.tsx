/**
 * StyleCard Component
 *
 * A card showing a live ProgressTrack preview for a given progress bar style.
 */

import { useCallback, memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { ProgressTrack } from '@/src/components/ui/progress-track';
import { M3Shapes } from '@/lib/theme';
import { PREVIEW_PROGRESS, type StyleCardProps } from './types';

export const StyleCard = memo(function StyleCard({
	style,
	label,
	isSelected,
	onSelect,
	colors,
}: StyleCardProps) {
	const handlePress = useCallback(() => {
		onSelect(style);
	}, [onSelect, style]);

	const trackColors = {
		primary: colors.primary,
		primaryContainer: colors.primaryContainer,
		onSurfaceVariant: colors.onSurfaceVariant,
		surfaceContainerHighest: colors.surfaceContainerHighest,
	};

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				styles.card,
				{
					borderColor: isSelected ? colors.primary : colors.outlineVariant,
					borderWidth: isSelected ? 2 : 1,
					backgroundColor: pressed
						? colors.surfaceContainerHighest
						: colors.surfaceContainerLow,
				},
			]}
		>
			<View
				style={[
					styles.previewContainer,
					{
						marginTop: style === 'expressive-variant' ? 14 : 0,
						marginBottom: style === 'expressive-variant' ? 14 : 0,
					},
				]}
			>
				<ProgressTrack
					variant={style}
					progress={PREVIEW_PROGRESS}
					colors={trackColors}
					animated={style === 'expressive'}
				/>
			</View>
			<View style={styles.cardFooter}>
				<Text
					variant={'bodyMedium'}
					style={[
						styles.cardLabel,
						{ color: isSelected ? colors.primary : colors.onSurface },
					]}
				>
					{label}
				</Text>
				{isSelected && <Icon as={Check} size={20} color={colors.primary} />}
			</View>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	card: {
		borderRadius: M3Shapes.large,
	},
	previewContainer: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 14,
	},
	cardLabel: {
		fontWeight: '500',
	},
});
