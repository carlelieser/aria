/**
 * SleepTimerSheet Component
 *
 * Bottom sheet for configuring the sleep timer.
 * Uses M3 theming.
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Text, Divider } from 'react-native-paper';
import { BottomSheetPortal } from '@/src/components/ui/bottom-sheet-portal';
import { Icon } from '@/src/components/ui/icon';
import { Clock } from 'lucide-react-native';
import { useSleepTimer, SLEEP_TIMER_PRESETS } from '@/src/hooks/use-sleep-timer';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { TimerPresetButton } from './timer-preset-button';
import { ActiveTimerDisplay } from './active-timer-display';
import { EndOfTrackButton } from './end-of-track-button';
import type { SleepTimerSheetProps } from './types';

export type { SleepTimerSheetProps } from './types';

export function SleepTimerSheet({ isOpen, onClose }: SleepTimerSheetProps) {
	const { colors } = useAppTheme();
	const { isActive, mode, formatRemaining, start, startEndOfTrack, cancel } = useSleepTimer();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const snapPoints = useMemo(() => ['60%'], []);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) onClose();
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
				pressBehavior={'close'}
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
			name={'sleep-timer-sheet'}
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
					<Text variant={'titleLarge'} style={{ color: colors.onSurface }}>
						Sleep Timer
					</Text>
				</View>

				<ActiveTimerDisplay
					isActive={isActive}
					mode={mode}
					formatRemaining={formatRemaining}
					onCancel={handleCancel}
				/>

				<Divider style={{ backgroundColor: colors.outlineVariant }} />

				<Text
					variant={'labelLarge'}
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

				<EndOfTrackButton
					isEndOfTrackMode={mode === 'end-of-track'}
					onPress={handleEndOfTrack}
				/>

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
	handleIndicator: { width: 36, height: 4, borderRadius: 2 },
	contentContainer: { paddingHorizontal: 16 },
	header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16 },
	sectionLabel: { marginTop: 16, marginBottom: 12, paddingHorizontal: 8 },
	presetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
	divider: { marginVertical: 16 },
	bottomPadding: { height: 34 },
});
