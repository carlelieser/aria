/**
 * SleepTimerSheet Types
 *
 * Props interfaces for the sleep timer sheet and its subcomponents.
 */

export interface TimerPresetButtonProps {
	readonly minutes: number;
	readonly label: string;
	readonly onSelect: (minutes: number) => void;
}

export interface SleepTimerSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
}
