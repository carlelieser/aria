/**
 * FolderItem Component
 *
 * Displays a single folder entry with rescan and remove actions.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { FolderIcon, Trash2Icon, RefreshCwIcon } from 'lucide-react-native';
import { RectButton } from 'react-native-gesture-handler';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { FolderItemProps } from './types';

export const FolderItem = memo(function FolderItem({
	uri,
	name,
	trackCount,
	onRemove,
	onRescan,
	disabled,
}: FolderItemProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.folderItem}>
			<View style={[styles.folderIcon, { backgroundColor: colors.surfaceContainerHighest }]}>
				<Icon as={FolderIcon} size={'sm'} color={colors.onSurfaceVariant} />
			</View>
			<View style={styles.folderInfo}>
				<Text variant={'bodyMedium'} numberOfLines={1} style={{ color: colors.onSurface }}>
					{name}
				</Text>
				<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
					{trackCount} {trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
			<RectButton
				onPress={() => onRescan(uri)}
				enabled={!disabled}
				style={styles.actionButton}
			>
				<Icon
					as={RefreshCwIcon}
					size={'sm'}
					color={disabled ? colors.outline : colors.onSurfaceVariant}
				/>
			</RectButton>
			<RectButton
				onPress={() => onRemove(uri)}
				enabled={!disabled}
				style={styles.actionButton}
			>
				<Icon
					as={Trash2Icon}
					size={'sm'}
					color={disabled ? colors.outline : colors.error}
				/>
			</RectButton>
		</View>
	);
});

const styles = StyleSheet.create({
	folderItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		gap: 12,
	},
	folderIcon: {
		width: 36,
		height: 36,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	folderInfo: {
		flex: 1,
	},
	actionButton: {
		padding: 8,
		borderRadius: 8,
	},
});
