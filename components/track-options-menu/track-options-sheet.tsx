/**
 * TrackOptionsSheet Component
 *
 * Shared bottom sheet for track options menu.
 * Rendered once at app level and controlled via track-options-store.
 * Actions are pre-loaded before opening to prevent visual jumps.
 */

import React, { useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Text, Divider } from 'react-native-paper';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Check } from 'lucide-react-native';
import { BottomSheetPortal } from '@/components/ui/bottom-sheet-portal';
import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { ACTION_GROUP_ORDER } from '@/src/domain/actions/track-action';
import type { TrackAction } from '@/src/domain/actions/track-action';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import {
	useTrackOptionsStore,
	useTrackOptionsTrack,
	useTrackOptionsSource,
	useTrackOptionsContext,
	useIsTrackOptionsOpen,
	useTrackOptionsActions,
} from '@/src/application/state/track-options-store';
import { useTrackActionExecutor } from '@/hooks/use-track-action-executor';

function getIconComponent(iconName: string): LucideIcon {
	const icons = LucideIcons as unknown as Record<string, LucideIcon>;
	return icons[iconName] || LucideIcons.Circle;
}

export function TrackOptionsSheet() {
	const bottomSheetRef = useRef<BottomSheetMethods>(null);
	const { colors } = useAppTheme();

	const track = useTrackOptionsTrack();
	const source = useTrackOptionsSource();
	const context = useTrackOptionsContext();
	const isOpen = useIsTrackOptionsOpen();
	const close = useTrackOptionsStore((state) => state.close);

	useEffect(() => {
		if (isOpen && track) {
			bottomSheetRef.current?.snapToIndex(0);
		} else {
			bottomSheetRef.current?.close();
		}
	}, [isOpen, track]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				close();
			}
		},
		[close]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
				pressBehavior="close"
			/>
		),
		[]
	);

	return (
		<BottomSheetPortal
			name="track-options-sheet"
			ref={bottomSheetRef}
			enablePanDownToClose
			snapPoints={['50%', '75%']}
			backdropComponent={renderBackdrop}
			onChange={handleSheetChanges}
			backgroundStyle={[
				styles.background,
				{ backgroundColor: colors.surfaceContainerHigh },
			]}
			handleIndicatorStyle={[
				styles.handleIndicator,
				{ backgroundColor: colors.outlineVariant },
			]}
		>
			{track ? (
				<TrackOptionsContent
					track={track}
					source={source}
					playlistId={context.playlistId}
					trackPosition={context.trackPosition}
					onClose={() => bottomSheetRef.current?.close()}
				/>
			) : (
				<BottomSheetView style={styles.contentContainer}>{null}</BottomSheetView>
			)}
		</BottomSheetPortal>
	);
}

interface TrackOptionsContentProps {
	track: NonNullable<ReturnType<typeof useTrackOptionsTrack>>;
	source: ReturnType<typeof useTrackOptionsSource>;
	playlistId?: string;
	trackPosition?: number;
	onClose: () => void;
}

function TrackOptionsContent({
	track,
	source,
	playlistId,
	trackPosition,
	onClose,
}: TrackOptionsContentProps) {
	const { colors } = useAppTheme();

	// Use pre-loaded actions from store (loaded before sheet opens)
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
					contentFit="cover"
				/>
				<View style={styles.headerText}>
					<Text
						variant="bodyLarge"
						numberOfLines={1}
						style={{ color: colors.onSurface, fontWeight: '600' }}
					>
						{track.title}
					</Text>
					<Text
						variant="bodySmall"
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

interface ActionItem {
	id: string;
	label: string;
	icon?: LucideIcon;
	variant?: 'default' | 'destructive';
	disabled?: boolean;
	checked?: boolean;
}

function ActionSheetItem({
	item,
	onPress,
	colors,
}: {
	item: ActionItem;
	onPress: () => void;
	colors: ReturnType<typeof useAppTheme>['colors'];
}) {
	const isDestructive = item.variant === 'destructive';
	const IconComponent = item.icon;

	const textColor = isDestructive ? colors.error : colors.onSurface;
	const iconColor = isDestructive ? colors.error : colors.onSurfaceVariant;

	return (
		<Pressable
			onPress={onPress}
			disabled={item.disabled}
			style={({ pressed }) => [
				styles.itemContainer,
				{
					backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
					opacity: item.disabled ? 0.5 : 1,
				},
			]}
		>
			<View style={styles.itemContent}>
				{IconComponent && (
					<View style={styles.iconWrapper}>
						<Icon as={IconComponent} size={22} color={iconColor} />
					</View>
				)}
				<Text
					variant="bodyLarge"
					style={[styles.itemText, { color: textColor }]}
					numberOfLines={1}
				>
					{item.label}
				</Text>
				{item.checked && (
					<View style={styles.checkWrapper}>
						<Icon as={Check} size={20} color={colors.primary} />
					</View>
				)}
			</View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	background: {
		borderTopLeftRadius: M3Shapes.extraLarge,
		borderTopRightRadius: M3Shapes.extraLarge,
	},
	handleIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
	},
	contentContainer: {},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	headerArtwork: {
		width: 48,
		height: 48,
		borderRadius: 8,
	},
	headerText: {
		flex: 1,
	},
	separator: {
		marginVertical: 8,
		marginHorizontal: 16,
	},
	bottomPadding: {
		height: 34,
	},
	itemContainer: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: 8,
	},
	itemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 14,
	},
	iconWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	itemText: {
		flex: 1,
	},
	checkWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
});
