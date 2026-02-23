/**
 * BatchActionBar Component
 *
 * Fixed bottom bar shown when items are selected.
 * Provides context-aware batch actions.
 */

import { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { Text, Surface } from 'react-native-paper';
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

import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

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
			<Text variant={'labelSmall'} style={{ color: textColor }}>
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
	const actions = useMemo(() => _getActionsForContext(context, props), [context, props]);

	if (selectedCount === 0) {
		return null;
	}

	return (
		<AnimatedSurface
			entering={FadeInDown.duration(200)}
			exiting={FadeOutDown.duration(200)}
			elevation={4}
			mode={'flat'}
			style={[styles.container]}
		>
			<View style={styles.header}>
				<Pressable style={styles.cancelButton} onPress={onCancel} hitSlop={8}>
					<Icon as={X} size={20} color={colors.onSurfaceVariant} />
				</Pressable>
				<Text variant={'titleSmall'} style={{ color: colors.onSurface }}>
					{selectedCount} selected
				</Text>
			</View>

			<PlayerAwareScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.scrollView}
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
			</PlayerAwareScrollView>
		</AnimatedSurface>
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
	},
	scrollView: {
		borderRadius: 12,
		overflow: 'hidden',
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
