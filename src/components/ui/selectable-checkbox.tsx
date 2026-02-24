/**
 * SelectableCheckbox Component
 *
 * Animated checkbox used for selection mode in list items.
 * Extracted common UI logic from selectable list item components.
 */

import { memo } from 'react';
import { StyleSheet } from 'react-native';
import { Checkbox } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface SelectableCheckboxProps {
	/** Whether the item is selected */
	readonly isSelected: boolean;
	/** Callback when checkbox is pressed */
	readonly onToggle: () => void;
}

export const SelectableCheckbox = memo(function SelectableCheckbox({
	isSelected,
	onToggle,
}: SelectableCheckboxProps) {
	return (
		<Animated.View
			entering={FadeIn.duration(150)}
			exiting={FadeOut.duration(150)}
			style={styles.container}
		>
			<Checkbox status={isSelected ? 'checked' : 'unchecked'} onPress={onToggle} />
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	container: {
		marginRight: 4,
	},
});
