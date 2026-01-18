import { useCallback, useEffect } from 'react';
import {
	useEqualizerStore,
	DEFAULT_PRESETS,
	EQUALIZER_BANDS,
	type EqualizerPreset,
} from '@/src/application/state/equalizer-store';

export function useEqualizer() {
	const store = useEqualizerStore();

	const selectPreset = useCallback(
		(presetId: string) => {
			store.selectPreset(presetId);
		},
		[store]
	);

	const setGain = useCallback(
		(bandIndex: number, gain: number) => {
			store.setCustomGain(bandIndex, gain);
		},
		[store]
	);

	const toggleEnabled = useCallback(() => {
		store.toggleEnabled();
	}, [store]);

	const resetToFlat = useCallback(() => {
		store.resetToFlat();
	}, [store]);

	const currentPreset =
		DEFAULT_PRESETS.find((p) => p.id === store.selectedPresetId) ?? DEFAULT_PRESETS[0];

	return {
		isEnabled: store.isEnabled,
		selectedPresetId: store.selectedPresetId,
		currentPreset,
		currentGains: store.customGains,
		presets: DEFAULT_PRESETS,
		bands: EQUALIZER_BANDS,
		isNativeAvailable: store.isNativeAvailable,

		selectPreset,
		setGain,
		toggleEnabled,
		resetToFlat,
		initializeNative: store.initializeNative,
	};
}

export function useEqualizerInit() {
	const initializeNative = useEqualizerStore((state) => state.initializeNative);

	useEffect(() => {
		initializeNative();
	}, [initializeNative]);
}

export { DEFAULT_PRESETS, EQUALIZER_BANDS, type EqualizerPreset };
