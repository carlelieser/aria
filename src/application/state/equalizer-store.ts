import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface EqualizerPreset {
	readonly id: string;
	readonly name: string;
	readonly gains: readonly number[]; // 10-band EQ gains (-12 to +12 dB)
}

export const EQUALIZER_BANDS = [
	{ frequency: 32, label: '32' },
	{ frequency: 64, label: '64' },
	{ frequency: 125, label: '125' },
	{ frequency: 250, label: '250' },
	{ frequency: 500, label: '500' },
	{ frequency: 1000, label: '1k' },
	{ frequency: 2000, label: '2k' },
	{ frequency: 4000, label: '4k' },
	{ frequency: 8000, label: '8k' },
	{ frequency: 16000, label: '16k' },
] as const;

export const DEFAULT_PRESETS: EqualizerPreset[] = [
	{
		id: 'flat',
		name: 'Flat',
		gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
	},
	{
		id: 'bass-boost',
		name: 'Bass Boost',
		gains: [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
	},
	{
		id: 'treble-boost',
		name: 'Treble Boost',
		gains: [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
	},
	{
		id: 'vocal',
		name: 'Vocal',
		gains: [-2, -1, 0, 2, 4, 4, 3, 1, 0, -1],
	},
	{
		id: 'rock',
		name: 'Rock',
		gains: [5, 4, 2, 0, -1, 0, 2, 4, 5, 5],
	},
	{
		id: 'electronic',
		name: 'Electronic',
		gains: [5, 4, 1, 0, -2, 2, 1, 2, 5, 5],
	},
	{
		id: 'classical',
		name: 'Classical',
		gains: [4, 3, 2, 1, -1, -1, 0, 2, 3, 4],
	},
	{
		id: 'jazz',
		name: 'Jazz',
		gains: [3, 2, 1, 2, -1, -1, 0, 1, 2, 3],
	},
	{
		id: 'hip-hop',
		name: 'Hip-Hop',
		gains: [5, 5, 3, 0, -1, -1, 1, 0, 2, 3],
	},
	{
		id: 'acoustic',
		name: 'Acoustic',
		gains: [4, 3, 1, 1, 2, 1, 2, 3, 3, 2],
	},
];

interface EqualizerState {
	isEnabled: boolean;
	selectedPresetId: string;
	customGains: number[];

	setEnabled: (enabled: boolean) => void;
	toggleEnabled: () => void;
	selectPreset: (presetId: string) => void;
	setCustomGain: (bandIndex: number, gain: number) => void;
	resetToFlat: () => void;
}

export const useEqualizerStore = create<EqualizerState>()(
	persist(
		(set, get) => ({
			isEnabled: false,
			selectedPresetId: 'flat',
			customGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],

			setEnabled: (enabled: boolean) => {
				set({ isEnabled: enabled });
			},

			toggleEnabled: () => {
				set((state) => ({ isEnabled: !state.isEnabled }));
			},

			selectPreset: (presetId: string) => {
				const preset = DEFAULT_PRESETS.find((p) => p.id === presetId);
				if (preset) {
					set({
						selectedPresetId: presetId,
						customGains: [...preset.gains],
					});
				}
			},

			setCustomGain: (bandIndex: number, gain: number) => {
				const state = get();
				const newGains = [...state.customGains];
				newGains[bandIndex] = Math.max(-12, Math.min(12, gain));
				set({
					customGains: newGains,
					selectedPresetId: 'custom',
				});
			},

			resetToFlat: () => {
				set({
					selectedPresetId: 'flat',
					customGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
				});
			},
		}),
		{
			name: 'aria-equalizer-storage',
			storage: createJSONStorage(() => AsyncStorage),
			partialize: (state) => ({
				isEnabled: state.isEnabled,
				selectedPresetId: state.selectedPresetId,
				customGains: state.customGains,
			}),
		}
	)
);

export const useEqualizerEnabled = () => useEqualizerStore((state) => state.isEnabled);
export const useSelectedPreset = () => {
	const presetId = useEqualizerStore((state) => state.selectedPresetId);
	return DEFAULT_PRESETS.find((p) => p.id === presetId) ?? DEFAULT_PRESETS[0];
};
export const useCurrentGains = () => useEqualizerStore((state) => state.customGains);
