/**
 * EqualizerSheet Component
 *
 * Bottom sheet for equalizer settings with visual band controls.
 * Integrates with native audio equalizer when available.
 * Uses M3 theming.
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider, Switch } from 'react-native-paper';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { Icon } from '@/components/ui/icon';
import { SlidersHorizontal, Check, Info, CheckCircle } from 'lucide-react-native';
import { useEqualizer, useEqualizerInit } from '@/hooks/use-equalizer';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface EqualizerSheetProps {
	isOpen: boolean;
	onClose: () => void;
}

export function EqualizerSheet({ isOpen, onClose }: EqualizerSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const {
		isEnabled,
		selectedPresetId,
		currentGains,
		presets,
		bands,
		selectPreset,
		toggleEnabled,
		isNativeAvailable,
	} = useEqualizer();

	// Initialize native equalizer when sheet is opened
	useEqualizerInit();

	const snapPoints = useMemo(() => ['85%'], []);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

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
		(presetId: string) => {
			selectPreset(presetId);
		},
		[selectPreset]
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name="equalizer-sheet">
			<BottomSheet
				ref={sheetRef}
				index={0}
				snapPoints={snapPoints}
				enablePanDownToClose
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
				<BottomSheetScrollView style={styles.contentContainer}>
					<View style={styles.header}>
						<View style={styles.headerLeft}>
							<Icon as={SlidersHorizontal} size={24} color={colors.primary} />
							<Text variant="titleLarge" style={{ color: colors.onSurface }}>
								Equalizer
							</Text>
						</View>
						<Switch
							value={isEnabled}
							onValueChange={toggleEnabled}
							color={colors.primary}
						/>
					</View>

					{isNativeAvailable ? (
						<View
							style={[
								styles.infoContainer,
								{ backgroundColor: colors.primaryContainer },
							]}
						>
							<Icon as={CheckCircle} size={16} color={colors.onPrimaryContainer} />
							<Text
								variant="bodySmall"
								style={{ color: colors.onPrimaryContainer, flex: 1 }}
							>
								Native equalizer active. Audio adjustments will affect playback.
							</Text>
						</View>
					) : (
						<View
							style={[
								styles.infoContainer,
								{ backgroundColor: colors.surfaceContainerHighest },
							]}
						>
							<Icon as={Info} size={16} color={colors.onSurfaceVariant} />
							<Text
								variant="bodySmall"
								style={{ color: colors.onSurfaceVariant, flex: 1 }}
							>
								Native equalizer unavailable. Visual preview only.
							</Text>
						</View>
					)}

					<Divider style={{ backgroundColor: colors.outlineVariant }} />

					<View style={[styles.visualizerContainer, !isEnabled && styles.disabled]}>
						{bands.map((band, index) => (
							<EqualizerBand
								key={band.frequency}
								label={band.label}
								gain={currentGains[index]}
								isEnabled={isEnabled}
							/>
						))}
					</View>

					<Text
						variant="labelLarge"
						style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
					>
						Presets
					</Text>

					<View style={styles.presetGrid}>
						{presets.map((preset) => (
							<Pressable
								key={preset.id}
								onPress={() => handlePresetSelect(preset.id)}
								disabled={!isEnabled}
								style={({ pressed }) => [
									styles.presetButton,
									{
										backgroundColor:
											selectedPresetId === preset.id
												? colors.primaryContainer
												: pressed
													? colors.surfaceContainerHighest
													: colors.surfaceContainer,
										borderColor:
											selectedPresetId === preset.id
												? colors.primary
												: colors.outline,
										opacity: isEnabled ? 1 : 0.5,
									},
								]}
							>
								<Text
									variant="bodyMedium"
									style={{
										color:
											selectedPresetId === preset.id
												? colors.onPrimaryContainer
												: colors.onSurface,
										fontWeight: selectedPresetId === preset.id ? '600' : '400',
									}}
								>
									{preset.name}
								</Text>
								{selectedPresetId === preset.id && (
									<Icon as={Check} size={16} color={colors.onPrimaryContainer} />
								)}
							</Pressable>
						))}
					</View>

					<View style={styles.bottomPadding} />
				</BottomSheetScrollView>
			</BottomSheet>
		</Portal>
	);
}

interface EqualizerBandProps {
	label: string;
	gain: number;
	isEnabled: boolean;
}

function EqualizerBand({ label, gain, isEnabled }: EqualizerBandProps) {
	const { colors } = useAppTheme();
	const animatedHeight = useSharedValue(gain);

	React.useEffect(() => {
		animatedHeight.value = withSpring(gain, { damping: 15, stiffness: 200 });
	}, [gain, animatedHeight]);

	const barAnimatedStyle = useAnimatedStyle(() => {
		const normalizedGain = (animatedHeight.value + 12) / 24;
		const height = Math.max(4, normalizedGain * 100);

		return {
			height: `${height}%`,
		};
	});

	return (
		<View style={styles.bandContainer}>
			<View style={[styles.bandTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
				<Animated.View
					style={[
						styles.bandBar,
						barAnimatedStyle,
						{
							backgroundColor: isEnabled ? colors.primary : colors.outline,
						},
					]}
				/>
			</View>
			<Text variant="labelSmall" style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
				{label}
			</Text>
			<Text
				variant="labelSmall"
				style={{
					color: gain === 0 ? colors.onSurfaceVariant : colors.primary,
					fontWeight: '600',
				}}
			>
				{gain > 0 ? `+${gain}` : gain}
			</Text>
		</View>
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
		justifyContent: 'space-between',
		paddingVertical: 16,
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	infoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		padding: 12,
		borderRadius: M3Shapes.medium,
		marginBottom: 16,
	},
	visualizerContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 24,
		height: 180,
	},
	disabled: {
		opacity: 0.5,
	},
	bandContainer: {
		alignItems: 'center',
		flex: 1,
	},
	bandTrack: {
		width: 8,
		flex: 1,
		borderRadius: 4,
		justifyContent: 'flex-end',
		overflow: 'hidden',
	},
	bandBar: {
		width: '100%',
		borderRadius: 4,
	},
	sectionLabel: {
		marginTop: 8,
		marginBottom: 12,
		paddingHorizontal: 8,
	},
	presetGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
	presetButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: M3Shapes.medium,
		borderWidth: 1,
	},
	bottomPadding: {
		height: 34,
	},
});
