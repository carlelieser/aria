/**
 * TrackOptionsContent
 *
 * Inner content of the TrackOptionsSheet: header with track info,
 * grouped action items, and action execution.
 */

import React, { useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Text, Divider } from 'react-native-paper';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import { ACTION_GROUP_ORDER } from '@/src/domain/actions/track-action';
import type { TrackAction } from '@/src/domain/actions/track-action';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useTrackOptionsActions } from '@/src/application/state/track-options-store';
import { useTrackActionExecutor } from '@/src/hooks/use-track-action-executor';
import type { TrackOptionsContentProps } from './types';
import { ActionSheetItem } from './action-sheet-item';
import { styles } from './styles';

function getIconComponent(iconName: string): LucideIcon {
	const icons = LucideIcons as unknown as Record<string, LucideIcon>;
	return icons[iconName] || LucideIcons.Circle;
}

export function TrackOptionsContent({
	track,
	source,
	playlistId,
	trackPosition,
	onClose,
}: TrackOptionsContentProps) {
	const { colors } = useAppTheme();

	const actions = useTrackOptionsActions();
	const { executeAction } = useTrackActionExecutor({
		track,
		source,
		playlistId,
		trackPosition,
	});

	const groups = useMemo(() => {
		const groupMap = new Map<string, TrackAction[]>();

		for (const action of actions) {
			const group = groupMap.get(action.group) || [];
			group.push(action);
			groupMap.set(action.group, group);
		}

		return ACTION_GROUP_ORDER.flatMap((groupName) => {
			const groupActions = groupMap.get(groupName);
			if (!groupActions) return [];
			return [
				{
					items: groupActions.map((action) => ({
						id: action.id,
						label: action.label,
						icon: getIconComponent(action.icon),
						variant: action.variant,
						disabled: !action.enabled,
						checked: action.checked,
					iconFill: action.iconFill,
					})),
				},
			];
		});
	}, [actions]);

	const handleItemPress = useCallback(
		(itemId: string) => {
			executeAction(itemId);
			onClose();
		},
		[executeAction, onClose]
	);

	const artwork = getBestArtwork(track.artwork, 56);
	const artistNames = getArtistNames(track);

	return (
		<BottomSheetView style={styles.contentContainer}>
			<View style={styles.header}>
				<Image
					source={{ uri: artwork?.url }}
					style={styles.headerArtwork}
					contentFit={'contain'}
				/>
				<View style={styles.headerText}>
					<Text
						variant={'bodyLarge'}
						numberOfLines={1}
						style={{ color: colors.onSurface, fontWeight: '600' }}
					>
						{track.title}
					</Text>
					<Text
						variant={'bodySmall'}
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{artistNames}
					</Text>
				</View>
			</View>

			<Divider style={[styles.separator, { backgroundColor: colors.outlineVariant }]} />

			{groups.map((group, groupIndex) => (
				<View key={groupIndex}>
					{groupIndex > 0 && (
						<Divider
							style={[styles.separator, { backgroundColor: colors.outlineVariant }]}
						/>
					)}
					{group.items.map((item) => (
						<ActionSheetItem
							key={item.id}
							item={item}
							onPress={() => handleItemPress(item.id)}
							colors={colors}
						/>
					))}
				</View>
			))}

			<View style={styles.bottomPadding} />
		</BottomSheetView>
	);
}
