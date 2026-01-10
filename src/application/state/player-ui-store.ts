import { create } from 'zustand';

interface PlayerUIState {
	showLyrics: boolean;
	sleepTimerSheetOpen: boolean;

	setShowLyrics: (show: boolean) => void;
	toggleShowLyrics: () => void;
	setSleepTimerSheetOpen: (open: boolean) => void;
	openSleepTimerSheet: () => void;
	closeSleepTimerSheet: () => void;
}

export const usePlayerUIStore = create<PlayerUIState>((set) => ({
	showLyrics: false,
	sleepTimerSheetOpen: false,

	setShowLyrics: (show: boolean) => set({ showLyrics: show }),
	toggleShowLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
	setSleepTimerSheetOpen: (open: boolean) => set({ sleepTimerSheetOpen: open }),
	openSleepTimerSheet: () => set({ sleepTimerSheetOpen: true }),
	closeSleepTimerSheet: () => set({ sleepTimerSheetOpen: false }),
}));

export const useShowLyrics = () => usePlayerUIStore((state) => state.showLyrics);
export const useSleepTimerSheetOpen = () => usePlayerUIStore((state) => state.sleepTimerSheetOpen);
