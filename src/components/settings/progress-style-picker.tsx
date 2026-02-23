/**
 * ProgressStylePicker Component
 *
 * A settings row that opens a bottom sheet with card-based progress bar
 * style selection. Each card shows a live ProgressTrack preview.
 */

import { useState, useCallback, useRef, useEffect, memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { AudioWaveformIcon, Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { ProgressTrack } from '@/src/components/ui/progress-track';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { ProgressBarStyle } from '@/src/application/state/settings-store';

const PREVIEW_PROGRESS = 0.4;

const STYLE_OPTIONS: readonly { value: ProgressBarStyle; label: string }[] = [
	{ value: 'expressive', label: 'M3 Expressive' },
	{ value: 'expressive-variant', label: 'M3 Expressive (variant)' },
	{ value: 'basic', label: 'Basic' },
] as const;

interface StyleCardProps {
	readonly style: ProgressBarStyle;
	readonly label: string;
	readonly isSelected: boolean;
	readonly onSelect: (style: ProgressBarStyle) => void;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
}

const StyleCard = memo(function StyleCard({
	style,
	label,
	isSelected,
	onSelect,
	colors,
}: StyleCardProps) {
	const handlePress = useCallback(() => {
		onSelect(style);
	}, [onSelect, style]);

	const trackColors = {
		primary: colors.primary,
		primaryContainer: colors.primaryContainer,
		onSurfaceVariant: colors.onSurfaceVariant,
		surfaceContainerHighest: colors.surfaceContainerHighest,
	};

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				styles.card,
				{
					borderColor: isSelected ? colors.primary : colors.outlineVariant,
					borderWidth: isSelected ? 2 : 1,
					backgroundColor: pressed ? colors.surfaceContainerHighest : colors.surfaceContainerLow,
				},
			]}
		>
			<View style={[styles.previewContainer, {
				marginTop: style === 'expressive-variant' ? 14 : 0,
				marginBottom: style === 'expressive-variant' ? 14 : 0
			}]}>
				<ProgressTrack
					variant={style}
					progress={PREVIEW_PROGRESS}
					colors={trackColors}
					animated={style === 'expressive'}
				/>
			</View>
			<View style={styles.cardFooter}>
				<Text
					variant={'bodyMedium'}
					style={[
						styles.cardLabel,
						{ color: isSelected ? colors.primary : colors.onSurface },
					]}
				>
					{label}
				</Text>
				{isSelected && <Icon as={Check} size={20} color={colors.primary} />}
			</View>
		</Pressable>
	);
});

interface ProgressStylePickerProps {
	readonly value: ProgressBarStyle;
	readonly onValueChange: (style: ProgressBarStyle) => void;
}

export function ProgressStylePicker({ value, onValueChange }: ProgressStylePickerProps) {
	const { colors } = useAppTheme();
	const [isOpen, setIsOpen] = useState(false);
	const sheetRef = useRef<BottomSheetMethods>(null);

	const selectedOption = STYLE_OPTIONS.find((o) => o.value === value);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

	const handlePress = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleSheetChanges = useCallback((index: number) => {
		if (index === -1) {
			setIsOpen(false);
		}
	}, []);

	const handleSelectStyle = useCallback(
		(style: ProgressBarStyle) => {
			onValueChange(style);
			sheetRef.current?.close();
		},
		[onValueChange]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
			/>
		),
		[]
	);

	return (
		<>
			<SettingsItem
				icon={AudioWaveformIcon}
				title={'Progress style'}
				subtitle={selectedOption?.label ?? 'Expressive'}
				onPress={handlePress}
				showChevron
			/>

			{isOpen && (
				<Portal name={'action-sheet-progress-style-picker'}>
					<BottomSheet
						ref={sheetRef}
						index={0}
						enableDynamicSizing
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
						<BottomSheetScrollView>
							<View style={styles.header}>
								<Icon
									as={AudioWaveformIcon}
									size={22}
									color={colors.onSurfaceVariant}
								/>
								<Text
									variant={'titleMedium'}
									style={[styles.headerTitle, { color: colors.onSurface }]}
								>
									Progress style
								</Text>
							</View>

							<Divider style={{ backgroundColor: colors.outlineVariant }} />

							<View style={styles.cardList}>
								{STYLE_OPTIONS.map((option) => (
									<StyleCard
										key={option.value}
										style={option.value}
										label={option.label}
										isSelected={value === option.value}
										onSelect={handleSelectStyle}
										colors={colors}
									/>
								))}
							</View>

							<View style={styles.bottomPadding} />
						</BottomSheetScrollView>
					</BottomSheet>
				</Portal>
			)}
		</>
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	headerTitle: {
		fontWeight: '600',
	},
	cardList: {
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 12,
	},
	card: {
		borderRadius: M3Shapes.large,
	},
	previewContainer: {
		paddingHorizontal: 16,
		paddingTop: 8,
	},
	cardFooter: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 14,
	},
	cardLabel: {
		fontWeight: '500',
	},
	bottomPadding: {
		height: 34,
	},
});
