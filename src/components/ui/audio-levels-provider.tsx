/**
 * Audio Levels Provider
 *
 * Context provider that shares a single native audio visualizer subscription
 * across all TrackListItem instances. Prevents each list item from creating
 * its own native capture session.
 */

import { createContext, useContext } from 'react';
import { useAudioLevels, type AudioLevelsResult } from '@/src/hooks/use-audio-levels';

type AudioLevelsContextValue = AudioLevelsResult;

const AudioLevelsContext = createContext<AudioLevelsContextValue | null>(null);

export function AudioLevelsProvider({ children }: { readonly children: React.ReactNode }) {
	const audioLevels = useAudioLevels();

	return (
		<AudioLevelsContext.Provider value={audioLevels}>{children}</AudioLevelsContext.Provider>
	);
}

export function useAudioLevelsContext(): AudioLevelsResult | null {
	return useContext(AudioLevelsContext);
}

export type { AudioLevelsResult };
