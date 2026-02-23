import { create } from 'zustand';

interface BootstrapProgressState {
	readonly currentStep: number;
	readonly totalSteps: number;
	readonly message: string;

	setTotalSteps: (total: number) => void;
	advance: (message: string) => void;
	reset: () => void;
}

export const useBootstrapProgressStore = create<BootstrapProgressState>((set) => ({
	currentStep: 0,
	totalSteps: 1,
	message: '',

	setTotalSteps: (total) => {
		set({ totalSteps: Math.max(total, 1) });
	},

	advance: (message) => {
		set((state) => ({
			currentStep: Math.min(state.currentStep + 1, state.totalSteps),
			message,
		}));
	},

	reset: () => {
		set({ currentStep: 0, totalSteps: 1, message: '' });
	},
}));

export const useBootstrapProgress = () =>
	useBootstrapProgressStore((state) => state.currentStep / state.totalSteps);

export const useBootstrapMessage = () => useBootstrapProgressStore((state) => state.message);

export function getBootstrapProgressState() {
	return useBootstrapProgressStore.getState();
}
