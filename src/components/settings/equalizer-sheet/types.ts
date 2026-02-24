/**
 * EqualizerSheet Types
 *
 * Props interfaces for the equalizer sheet and its subcomponents.
 */

export interface PresetButtonProps {
	readonly id: string;
	readonly name: string;
	readonly isSelected: boolean;
	readonly isEnabled: boolean;
	readonly onSelect: (presetId: string) => void;
}

export interface EqualizerBandProps {
	readonly label: string;
	readonly gain: number;
	readonly isEnabled: boolean;
}

export interface EqualizerSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}
