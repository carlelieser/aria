/**
 * BatchActionBar Component
 *
 * Fixed bottom bar shown when items are selected.
 * Provides context-aware batch actions.
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import {
	Download,
	Library,
	ListPlus,
	X,
	Trash2,
	Heart,
	ListMusic,
	Minus,
} from 'lucide-react-native';

import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

export type BatchActionContext = 'explore' | 'library' | 'downloads' | 'playlist';

interface BatchActionBarProps {
	context: BatchActionContext;
	selectedCount: number;
	onCancel: () => void;
	onDownload?: () => void;
	onAddToLibrary?: () => void;
	onAddToQueue?: () => void;
	onAddToPlaylist?: () => void;
	onRemoveFromLibrary?: () => void;
	onDeleteDownloads?: () => void;
	onToggleFavorites?: () => void;
	onRemoveFromPlaylist?: () => void;
	isProcessing?: boolean;
}

interface ActionButtonProps {
	icon: typeof Download;
	label: string;
	onPress: () => void;
	disabled?: boolean;
	destructive?: boolean;
}

function ActionButton({ icon, label, onPress, disabled, destructive }: ActionButtonProps) {
	const { colors } = useAppTheme();

	const iconColor = disabled
		? colors.onSurfaceVariant
		: destructive
			? colors.error
			: colors.onSurface;

	const textColor = disabled
		? colors.onSurfaceVariant
		: destructive
			? colors.error
			: colors.onSurface;

	return (
		<Pressable
			style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Icon as={icon} size={20} color={iconColor} />
			<Text variant="labelSmall" style={{ color: textColor }}>
				{label}
			</Text>
		</Pressable>
	);
}

interface ActionConfig {
	icon: typeof Download;
	label: string;
	handler: (() => void) | undefined;
	destructive?: boolean;
}

function _getActionsForContext(
	context: BatchActionContext,
	props: BatchActionBarProps
): ActionConfig[] {
	switch (context) {
		case 'explore':
			return [
				{ icon: Download, label: 'Download', handler: props.onDownload },
				{ icon: Library, label: 'Library', handler: props.onAddToLibrary },
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{ icon: ListMusic, label: 'Playlist', handler: props.onAddToPlaylist },
			];
		case 'library':
			return [
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{ icon: ListMusic, label: 'Playlist', handler: props.onAddToPlaylist },
				{ icon: Heart, label: 'Favorite', handler: props.onToggleFavorites },
				{
					icon: Trash2,
					label: 'Remove',
					handler: props.onRemoveFromLibrary,
					destructive: true,
				},
			];
		case 'downloads':
			return [
				{ icon: Library, label: 'Library', handler: props.onAddToLibrary },
				{
					icon: Trash2,
					label: 'Delete',
					handler: props.onDeleteDownloads,
					destructive: true,
				},
			];
		case 'playlist':
			return [
				{ icon: ListPlus, label: 'Queue', handler: props.onAddToQueue },
				{
					icon: Minus,
					label: 'Remove',
					handler: props.onRemoveFromPlaylist,
					destructive: true,
				},
			];
		default:
			return [];
	}
}

export const BatchActionBar = memo(function BatchActionBar(props: BatchActionBarProps) {
	const { context, selectedCount, onCancel, isProcessing = false } = props;
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();

	const actions = useMemo(() => _getActionsForContext(context, props), [context, props]);

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

			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.actions}
			>
				{actions.map(
					(action) =>
						action.handler && (
							<ActionButton
								key={action.label}
								icon={action.icon}
								label={action.label}
								onPress={action.handler}
								disabled={isProcessing}
								destructive={action.destructive}
							/>
						)
				)}
			</ScrollView>
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
		flexGrow: 1,
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
