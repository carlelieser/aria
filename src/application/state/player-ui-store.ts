import { create } from 'zustand';

interface PlayerUIState {
	showLyrics: boolean;
	sleepTimerSheetOpen: boolean;
	queueSheetOpen: boolean;

	setShowLyrics: (show: boolean) => void;
	toggleShowLyrics: () => void;
	setSleepTimerSheetOpen: (open: boolean) => void;
	openSleepTimerSheet: () => void;
	closeSleepTimerSheet: () => void;
	openQueueSheet: () => void;
	closeQueueSheet: () => void;
}

export const usePlayerUIStore = create<PlayerUIState>((set) => ({
	showLyrics: false,
	sleepTimerSheetOpen: false,
	queueSheetOpen: false,

	setShowLyrics: (show: boolean) => set({ showLyrics: show }),
	toggleShowLyrics: () => set((state) => ({ showLyrics: !state.showLyrics })),
	setSleepTimerSheetOpen: (open: boolean) => set({ sleepTimerSheetOpen: open }),
	openSleepTimerSheet: () => set({ sleepTimerSheetOpen: true }),
	closeSleepTimerSheet: () => set({ sleepTimerSheetOpen: false }),
	openQueueSheet: () => set({ queueSheetOpen: true }),
	closeQueueSheet: () => set({ queueSheetOpen: false }),
}));

export const useShowLyrics = () => usePlayerUIStore((state) => state.showLyrics);
export const useSleepTimerSheetOpen = () => usePlayerUIStore((state) => state.sleepTimerSheetOpen);
export const useQueueSheetOpen = () => usePlayerUIStore((state) => state.queueSheetOpen);
