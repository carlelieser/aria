/**
 * AccentColorPicker Component
 *
 * A settings row that opens a bottom sheet for accent color selection.
 * Uses M3 theming with preset color options.
 */

import { useRef, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { PaletteIcon } from 'lucide-react-native';
import { SettingsItem } from '@/components/settings/settings-item';
import { SettingsBottomSheet } from '@/components/settings/settings-bottom-sheet';
import { useAppTheme } from '@/lib/theme';
import { SEED_COLOR } from '@/lib/theme/colors';

const ACCENT_COLORS = [
	{ value: '#7C3AED', label: 'Violet', color: '#7C3AED' },
	{ value: '#2563EB', label: 'Blue', color: '#2563EB' },
	{ value: '#0891B2', label: 'Cyan', color: '#0891B2' },
	{ value: '#059669', label: 'Emerald', color: '#059669' },
	{ value: '#16A34A', label: 'Green', color: '#16A34A' },
	{ value: '#CA8A04', label: 'Yellow', color: '#CA8A04' },
	{ value: '#EA580C', label: 'Orange', color: '#EA580C' },
	{ value: '#DC2626', label: 'Red', color: '#DC2626' },
	{ value: '#DB2777', label: 'Pink', color: '#DB2777' },
	{ value: '#9333EA', label: 'Purple', color: '#9333EA' },
	{ value: '#4F46E5', label: 'Indigo', color: '#4F46E5' },
	{ value: '#64748B', label: 'Slate', color: '#64748B' },
] as const;

interface AccentColorPickerProps {
	value: string | null;
	onValueChange: (color: string | null) => void;
}

export function AccentColorPicker({ value, onValueChange }: AccentColorPickerProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);

	const currentColor = value ?? SEED_COLOR;
	const selectedOption = ACCENT_COLORS.find((c) => c.value === value);

	const handlePress = useCallback(() => {
		sheetRef.current?.expand();
	}, []);

	const handleSelectColor = useCallback(
		(color: string) => {
			onValueChange(color);
			sheetRef.current?.close();
		},
		[onValueChange]
	);

	const handleReset = useCallback(() => {
		onValueChange(null);
		sheetRef.current?.close();
	}, [onValueChange]);

	const subtitleElement = (
		<View style={styles.valueRow}>
			<View style={[styles.colorDot, { backgroundColor: currentColor }]} />
			<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
				{selectedOption?.label ?? 'Default'}
			</Text>
		</View>
	);

	return (
		<>
			<SettingsItem
				icon={PaletteIcon}
				title="Accent Color"
				subtitleElement={subtitleElement}
				onPress={handlePress}
				showChevron
			/>

			<SettingsBottomSheet
				ref={sheetRef}
				portalName="accent-color-picker"
				title="Choose Accent Color"
				showReset
				onReset={handleReset}
			>
				<View style={styles.colorGrid}>
					{ACCENT_COLORS.map((colorOption) => {
						const isSelected = value === colorOption.value;
						return (
							<Pressable
								key={colorOption.value}
								onPress={() => handleSelectColor(colorOption.value)}
								style={({ pressed }) => [
									styles.colorItem,
									pressed && styles.pressed,
								]}
							>
								<View
									style={[
										styles.colorSwatch,
										{ backgroundColor: colorOption.color },
										isSelected && styles.selectedSwatch,
										isSelected && { borderColor: colors.onSurface },
									]}
								>
									{isSelected && (
										<View style={styles.checkmark}>
											<Text style={styles.checkmarkText}>✓</Text>
										</View>
									)}
								</View>
								<Text
									variant="labelSmall"
									style={[styles.colorLabel, { color: colors.onSurfaceVariant }]}
									numberOfLines={1}
								>
									{colorOption.label}
								</Text>
							</Pressable>
						);
					})}
				</View>
			</SettingsBottomSheet>
		</>
	);
}

const styles = StyleSheet.create({
	pressed: {
		opacity: 0.7,
	},
	valueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	colorGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 16,
		justifyContent: 'flex-start',
	},
	colorItem: {
		alignItems: 'center',
		width: 64,
	},
	colorSwatch: {
		width: 48,
		height: 48,
		borderRadius: 24,
		marginBottom: 6,
		alignItems: 'center',
		justifyContent: 'center',
	},
	selectedSwatch: {
		borderWidth: 3,
	},
	checkmark: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: 'rgba(255, 255, 255, 0.9)',
		alignItems: 'center',
		justifyContent: 'center',
	},
	checkmarkText: {
		color: '#000',
		fontSize: 14,
		fontWeight: '700',
	},
	colorLabel: {
		textAlign: 'center',
	},
});
