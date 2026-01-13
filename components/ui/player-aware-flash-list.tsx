/**
 * PlayerAwareFlashList
 *
 * A FlashList that automatically adds bottom padding when the floating player
 * is visible, ensuring content can scroll past the player.
 */

import { StyleSheet, type ViewStyle } from 'react-native';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { usePlayerPadding } from '@/hooks/use-player-padding';

export function PlayerAwareFlashList<T>({
	contentContainerStyle,
	...props
}: FlashListProps<T>) {
	const playerPadding = usePlayerPadding();

	const combinedStyle = {
		...(StyleSheet.flatten(contentContainerStyle) as ViewStyle),
		...playerPadding,
	};

	return <FlashList contentContainerStyle={combinedStyle} {...props} />;
}
