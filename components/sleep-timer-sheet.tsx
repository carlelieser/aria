/**
 * SleepTimerSheet Component
 *
 * Bottom sheet for configuring the sleep timer.
 * Uses M3 theming.
 */

import React, { useCallback, useEffect, useMemo, useRef, memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Text, Divider, Button } from 'react-native-paper';
import { BottomSheetPortal } from '@/components/ui/bottom-sheet-portal';
import { Icon } from '@/components/ui/icon';
import { Check, Clock, Music2 } from 'lucide-react-native';
import { useSleepTimer, SLEEP_TIMER_PRESETS } from '@/hooks/use-sleep-timer';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface TimerPresetButtonProps {
	minutes: number;
	label: string;
	onSelect: (minutes: number) => void;
}

const TimerPresetButton = memo(function TimerPresetButton({
	minutes,
	label,
	onSelect,
}: TimerPresetButtonProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onSelect(minutes);
	}, [onSelect, minutes]);

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				styles.presetButton,
				{
					backgroundColor: pressed
						? colors.surfaceContainerHighest
						: colors.surfaceContainer,
					borderColor: colors.outline,
				},
			]}
		>
			<Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
				{label}
			</Text>
		</Pressable>
	);
});

interface SleepTimerSheetProps {
	isOpen: boolean;
	onClose: () => void;
}

export function SleepTimerSheet({ isOpen, onClose }: SleepTimerSheetProps) {
	const { colors } = useAppTheme();
	const { isActive, mode, formatRemaining, start, startEndOfTrack, cancel } = useSleepTimer();
	const sheetRef = useRef<BottomSheetMethods>(null);

	const snapPoints = useMemo(() => ['60%'], []);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose();
			}
		},
		[onClose]
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

	const handlePresetSelect = useCallback(
		(minutes: number) => {
			start(minutes);
			sheetRef.current?.close();
		},
		[start]
	);

	const handleEndOfTrack = useCallback(() => {
		startEndOfTrack();
		sheetRef.current?.close();
	}, [startEndOfTrack]);

	const handleCancel = useCallback(() => {
		cancel();
		sheetRef.current?.close();
	}, [cancel]);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		} else {
			sheetRef.current?.close();
		}
	}, [isOpen]);

	return (
		<BottomSheetPortal
			name="sleep-timer-sheet"
			ref={sheetRef}
			snapPoints={snapPoints}
			enablePanDownToClose
			backdropComponent={renderBackdrop}
			onChange={handleSheetChanges}
			backgroundStyle={[styles.background, { backgroundColor: colors.surfaceContainerHigh }]}
			handleIndicatorStyle={[
				styles.handleIndicator,
				{ backgroundColor: colors.outlineVariant },
			]}
		>
			<BottomSheetScrollView style={styles.contentContainer}>
				<View style={styles.header}>
					<Icon as={Clock} size={24} color={colors.primary} />
					<Text variant="titleLarge" style={{ color: colors.onSurface }}>
						Sleep Timer
					</Text>
				</View>

				{isActive && (
					<View
						style={[
							styles.activeTimerContainer,
							{ backgroundColor: colors.primaryContainer },
						]}
					>
						<Text
							variant="headlineMedium"
							style={{ color: colors.onPrimaryContainer, fontWeight: '600' }}
						>
							{formatRemaining()}
						</Text>
						<Text variant="bodyMedium" style={{ color: colors.onPrimaryContainer }}>
							remaining
						</Text>
						<Button
							mode="text"
							textColor={colors.primary}
							onPress={handleCancel}
							style={styles.cancelButton}
						>
							Cancel Timer
						</Button>
					</View>
				)}

				{mode === 'end-of-track' && !isActive && (
					<View
						style={[
							styles.activeTimerContainer,
							{ backgroundColor: colors.primaryContainer },
						]}
					>
						<Icon as={Music2} size={32} color={colors.onPrimaryContainer} />
						<Text
							variant="titleMedium"
							style={{ color: colors.onPrimaryContainer, marginTop: 8 }}
						>
							Stopping after current track
						</Text>
						<Button
							mode="text"
							textColor={colors.primary}
							onPress={handleCancel}
							style={styles.cancelButton}
						>
							Cancel
						</Button>
					</View>
				)}

				<Divider style={{ backgroundColor: colors.outlineVariant }} />

				<Text
					variant="labelLarge"
					style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
				>
					Duration
				</Text>

				<View style={styles.presetGrid}>
					{SLEEP_TIMER_PRESETS.map((preset) => (
						<TimerPresetButton
							key={preset.minutes}
							minutes={preset.minutes}
							label={preset.label}
							onSelect={handlePresetSelect}
						/>
					))}
				</View>

				<Divider style={[styles.divider, { backgroundColor: colors.outlineVariant }]} />

				<Pressable
					onPress={handleEndOfTrack}
					style={({ pressed }) => [
						styles.endOfTrackButton,
						{
							backgroundColor: pressed
								? colors.surfaceContainerHighest
								: 'transparent',
						},
					]}
				>
					<View style={styles.endOfTrackContent}>
						<Icon as={Music2} size={22} color={colors.onSurfaceVariant} />
						<View style={styles.endOfTrackText}>
							<Text variant="bodyLarge" style={{ color: colors.onSurface }}>
								End of current track
							</Text>
							<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
								Stop playback when this track ends
							</Text>
						</View>
						{mode === 'end-of-track' && (
							<Icon as={Check} size={20} color={colors.primary} />
						)}
					</View>
				</Pressable>

				<View style={styles.bottomPadding} />
			</BottomSheetScrollView>
		</BottomSheetPortal>
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
	contentContainer: {
		paddingHorizontal: 16,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 16,
	},
	activeTimerContainer: {
		alignItems: 'center',
		padding: 24,
		borderRadius: M3Shapes.large,
		marginBottom: 16,
	},
	cancelButton: {
		marginTop: 12,
	},
	sectionLabel: {
		marginTop: 16,
		marginBottom: 12,
		paddingHorizontal: 8,
	},
	presetGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	presetButton: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: M3Shapes.medium,
		borderWidth: 1,
	},
	divider: {
		marginVertical: 16,
	},
	endOfTrackButton: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: -8,
	},
	endOfTrackContent: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		paddingVertical: 14,
		paddingHorizontal: 16,
	},
	endOfTrackText: {
		flex: 1,
		gap: 2,
	},
	bottomPadding: {
		height: 34,
	},
});
