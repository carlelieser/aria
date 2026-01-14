/**
 * SelectableCheckbox Component
 *
 * Animated checkbox used for selection mode in list items.
 * Extracted common UI logic from selectable list item components.
 */

import { memo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Check } from 'lucide-react-native';
import Animated, { useAnimatedStyle, withTiming, FadeIn, FadeOut } from 'react-native-reanimated';

import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface SelectableCheckboxProps {
	/** Whether the item is selected */
	isSelected: boolean;
	/** Callback when checkbox is pressed */
	onToggle: () => void;
}

export const SelectableCheckbox = memo(function SelectableCheckbox({
	isSelected,
	onToggle,
}: SelectableCheckboxProps) {
	const { colors } = useAppTheme();

	const checkboxAnimatedStyle = useAnimatedStyle(() => {
		return {
			backgroundColor: withTiming(isSelected ? colors.primary : 'transparent', {
				duration: 150,
			}),
			borderColor: withTiming(isSelected ? colors.primary : colors.outline, {
				duration: 150,
			}),
		};
	}, [isSelected, colors.primary, colors.outline]);

	return (
		<Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
			<Pressable style={styles.checkboxContainer} onPress={onToggle} hitSlop={8}>
				<Animated.View style={[styles.checkbox, checkboxAnimatedStyle]}>
					{isSelected && <Icon as={Check} size={14} color={colors.onPrimary} />}
				</Animated.View>
			</Pressable>
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	checkboxContainer: {
		paddingRight: 8,
		paddingLeft: 4,
	},
	checkbox: {
		width: 22,
		height: 22,
		borderRadius: 4,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
	},
});
