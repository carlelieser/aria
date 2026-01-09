import React, { useRef, useMemo, useCallback } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ActionSheet, type ActionSheetGroup } from '@/components/ui/action-sheet';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { ACTION_GROUP_ORDER } from '@/src/domain/actions/track-action';
import { useTrackActions } from '@/hooks/use-track-actions';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';

type Orientation = 'vertical' | 'horizontal';

interface TrackOptionsMenuProps {
	track: Track;
	source: TrackActionSource;
	triggerClassName?: string;
	orientation?: Orientation;
}

function getIconComponent(iconName: string): LucideIcon {
	const icons = LucideIcons as unknown as Record<string, LucideIcon>;
	return icons[iconName] || LucideIcons.Circle;
}

export function TrackOptionsMenu({
	track,
	source,
	triggerClassName,
	orientation = 'vertical',
}: TrackOptionsMenuProps) {
	const bottomSheetRef = useRef<BottomSheetMethods>(null);
	const { actions, executeAction } = useTrackActions({ track, source });

	const groups = useMemo<ActionSheetGroup[]>(() => {
		const groupMap = new Map<string, typeof actions>();

		for (const action of actions) {
			const group = groupMap.get(action.group) || [];
			group.push(action);
			groupMap.set(action.group, group);
		}

		return ACTION_GROUP_ORDER.filter((groupName) => groupMap.has(groupName)).map(
			(groupName) => ({
				items: groupMap.get(groupName)!.map((action) => ({
					id: action.id,
					label: action.label,
					icon: getIconComponent(action.icon),
					variant: action.variant,
					disabled: !action.enabled,
					checked: action.checked,
				})),
			})
		);
	}, [actions]);

	const handleOpen = useCallback(() => {
		bottomSheetRef.current?.snapToIndex(0);
	}, []);

	const handleSelect = useCallback(
		(itemId: string) => {
			executeAction(itemId);
		},
		[executeAction]
	);

	const artwork = getBestArtwork(track.artwork, 56);
	const artistNames = getArtistNames(track);

	const header = (
		<View className="flex-row items-center gap-3">
			<Image
				source={{ uri: artwork?.url }}
				style={{ width: 48, height: 48, borderRadius: 8 }}
				contentFit="cover"
			/>
			<View className="flex-1">
				<Text className="font-semibold" numberOfLines={1}>
					{track.title}
				</Text>
				<Text variant="muted" className="text-sm" numberOfLines={1}>
					{artistNames}
				</Text>
			</View>
		</View>
	);

	return (
		<>
			<Button variant="ghost" size="icon" className={triggerClassName} onPress={handleOpen}>
				<Icon
					as={
						orientation === 'horizontal'
							? LucideIcons.MoreHorizontal
							: LucideIcons.MoreVertical
					}
					size={20}
				/>
			</Button>

			<ActionSheet
				ref={bottomSheetRef}
				groups={groups}
				onSelect={handleSelect}
				header={header}
				portalName={track.id.value}
			/>
		</>
	);
}
