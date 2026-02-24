/**
 * EqualizerSheet Component
 *
 * Bottom sheet for equalizer settings with visual band controls.
 * Integrates with native audio equalizer when available.
 * Uses M3 theming.
 */

import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Divider, Switch } from 'react-native-paper';
import { ManagedBottomSheet } from '@/src/components/ui/managed-bottom-sheet';
import { Icon } from '@/src/components/ui/icon';
import { SlidersHorizontal, Info, CheckCircle } from 'lucide-react-native';
import { useEqualizer, useEqualizerInit } from '@/src/hooks/use-equalizer';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { PresetButton } from './preset-button';
import { EqualizerBand } from './equalizer-band';
import type { EqualizerSheetProps } from './types';

export type { EqualizerSheetProps } from './types';

export function EqualizerSheet({ isOpen, onClose }: EqualizerSheetProps) {
	const { colors } = useAppTheme();
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

	useEqualizerInit();

	const handlePresetSelect = useCallback(
		(presetId: string) => {
			selectPreset(presetId);
		},
		[selectPreset]
	);

	return (
		<ManagedBottomSheet
			portalName={'equalizer-sheet'}
			isOpen={isOpen}
			onClose={onClose}
			snapPoints={['85%']}
			scrollable
		>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Icon as={SlidersHorizontal} size={24} color={colors.primary} />
					<Text variant={'titleLarge'} style={{ color: colors.onSurface }}>
						Equalizer
					</Text>
				</View>
				<Switch value={isEnabled} onValueChange={toggleEnabled} color={colors.primary} />
			</View>

			{isNativeAvailable ? (
				<View style={[styles.infoContainer, { backgroundColor: colors.primaryContainer }]}>
					<Icon as={CheckCircle} size={16} color={colors.onPrimaryContainer} />
					<Text
						variant={'bodySmall'}
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
					<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant, flex: 1 }}>
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
				variant={'labelLarge'}
				style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
			>
				Presets
			</Text>

			<View style={styles.presetGrid}>
				{presets.map((preset) => (
					<PresetButton
						key={preset.id}
						id={preset.id}
						name={preset.name}
						isSelected={selectedPresetId === preset.id}
						isEnabled={isEnabled}
						onSelect={handlePresetSelect}
					/>
				))}
			</View>

			<View style={styles.bottomPadding} />
		</ManagedBottomSheet>
	);
}

const styles = StyleSheet.create({
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
	bottomPadding: {
		height: 34,
	},
});
