/**
 * BatchActionBar Component
 *
 * Fixed bottom bar shown when items are selected.
 * Provides batch actions: Download, Add to Library, Add to Queue.
 */

import { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Download, Library, ListPlus, X } from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

interface BatchActionBarProps {
	selectedCount: number;
	onDownload: () => void;
	onAddToLibrary: () => void;
	onAddToQueue: () => void;
	onCancel: () => void;
	isDownloading?: boolean;
}

interface ActionButtonProps {
	icon: typeof Download;
	label: string;
	onPress: () => void;
	disabled?: boolean;
}

function ActionButton({ icon, label, onPress, disabled }: ActionButtonProps) {
	const { colors } = useAppTheme();

	return (
		<Pressable
			style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Icon
				as={icon}
				size={20}
				color={disabled ? colors.onSurfaceVariant : colors.onSurface}
			/>
			<Text
				variant="labelSmall"
				style={{ color: disabled ? colors.onSurfaceVariant : colors.onSurface }}
			>
				{label}
			</Text>
		</Pressable>
	);
}

export const BatchActionBar = memo(function BatchActionBar({
	selectedCount,
	onDownload,
	onAddToLibrary,
	onAddToQueue,
	onCancel,
	isDownloading = false,
}: BatchActionBarProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();

	if (selectedCount === 0) {
		return null;
	}

	return (
		<Animated.View
			entering={FadeInDown.duration(200)}
			exiting={FadeOutDown.duration(200)}
			style={[
				styles.container,
				{
					backgroundColor: colors.surfaceContainerHigh,
					paddingBottom: Math.max(insets.bottom, 16),
				},
			]}
		>
			<View style={styles.header}>
				<Pressable style={styles.cancelButton} onPress={onCancel} hitSlop={8}>
					<Icon as={X} size={20} color={colors.onSurfaceVariant} />
				</Pressable>
				<Text variant="titleSmall" style={{ color: colors.onSurface }}>
					{selectedCount} selected
				</Text>
			</View>

			<View style={styles.actions}>
				<ActionButton
					icon={Download}
					label="Download"
					onPress={onDownload}
					disabled={isDownloading}
				/>
				<ActionButton icon={Library} label="Library" onPress={onAddToLibrary} />
				<ActionButton icon={ListPlus} label="Queue" onPress={onAddToQueue} />
			</View>
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 0,
		right: 0,
		bottom: 0,
		paddingTop: 12,
		paddingHorizontal: 16,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 8,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 16,
	},
	cancelButton: {
		padding: 4,
	},
	actions: {
		flexDirection: 'row',
		justifyContent: 'space-around',
	},
	actionButton: {
		alignItems: 'center',
		gap: 4,
		paddingVertical: 8,
		paddingHorizontal: 16,
	},
	actionButtonDisabled: {
		opacity: 0.5,
	},
});
