/**
 * Bootstrap Progress Store
 *
 * Tracks bootstrap initialization stages for splash screen progress display.
 * Lightweight store - not persisted to AsyncStorage.
 */
import { create } from 'zustand';

export type BootstrapStage = 'idle' | 'settings' | 'plugins' | 'services' | 'ready';

export interface BootstrapStageInfo {
	id: BootstrapStage;
	label: string;
	order: number;
}

export const BOOTSTRAP_STAGES: BootstrapStageInfo[] = [
	{ id: 'settings', label: 'Loading settings', order: 0 },
	{ id: 'plugins', label: 'Loading plugins', order: 1 },
	{ id: 'services', label: 'Starting services', order: 2 },
	{ id: 'ready', label: 'Ready', order: 3 },
];

const STAGE_ORDER: Record<BootstrapStage, number> = {
	idle: -1,
	settings: 0,
	plugins: 1,
	services: 2,
	ready: 3,
};

interface BootstrapProgressState {
	currentStage: BootstrapStage;
	completedStageOrder: number; // -1 = none, 0 = settings, 1 = plugins, etc.

	setStage: (stage: BootstrapStage) => void;
	completeStage: (stage: BootstrapStage) => void;
	reset: () => void;
}

export const useBootstrapProgressStore = create<BootstrapProgressState>((set) => ({
	currentStage: 'idle',
	completedStageOrder: -1,

	setStage: (stage) => {
		set({ currentStage: stage });
	},

	completeStage: (stage) => {
		const order = STAGE_ORDER[stage];
		set((state) => ({
			completedStageOrder: Math.max(state.completedStageOrder, order),
		}));
	},

	reset: () => {
		set({ currentStage: 'idle', completedStageOrder: -1 });
	},
}));

// Selectors
export const useCurrentBootstrapStage = () =>
	useBootstrapProgressStore((state) => state.currentStage);

export const useCompletedStageOrder = () =>
	useBootstrapProgressStore((state) => state.completedStageOrder);

export function isStageCompleted(stageId: BootstrapStage, completedOrder: number): boolean {
	return STAGE_ORDER[stageId] <= completedOrder;
}

// Non-hook accessors for bootstrap.ts
export function setBootstrapStage(stage: BootstrapStage): void {
	useBootstrapProgressStore.getState().setStage(stage);
}

export function completeBootstrapStage(stage: BootstrapStage): void {
	useBootstrapProgressStore.getState().completeStage(stage);
}
