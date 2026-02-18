import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ImportPhase = 'tracks' | 'albums' | 'playlists' | 'complete' | 'error';

interface ImportError {
	readonly item: string;
	readonly error: string;
}

interface ImportProgress {
	readonly phase: ImportPhase;
	readonly current: number;
	readonly total: number;
	readonly currentItem: string | null;
}

interface LibraryImportState {
	isImporting: boolean;
	pluginId: string | null;
	phase: ImportPhase;
	current: number;
	total: number;
	currentItem: string | null;
	errors: ImportError[];
	lastImportedAt: Record<string, number>;

	startImport: (pluginId: string) => void;
	updateProgress: (
		phase: ImportPhase,
		current: number,
		total: number,
		currentItem?: string
	) => void;
	addError: (item: string, error: string) => void;
	completeImport: () => void;
	resetImport: () => void;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		return AsyncStorage.getItem(name);
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

export const useLibraryImportStore = create<LibraryImportState>()(
	persist(
		(set, get) => ({
			isImporting: false,
			pluginId: null,
			phase: 'tracks' as ImportPhase,
			current: 0,
			total: 0,
			currentItem: null,
			errors: [],
			lastImportedAt: {},

			startImport: (pluginId: string) => {
				set({
					isImporting: true,
					pluginId,
					phase: 'tracks',
					current: 0,
					total: 0,
					currentItem: null,
					errors: [],
				});
			},

			updateProgress: (phase, current, total, currentItem) => {
				set({
					phase,
					current,
					total,
					currentItem: currentItem ?? null,
				});
			},

			addError: (item, error) => {
				set((state) => ({
					errors: [...state.errors, { item, error }],
				}));
			},

			completeImport: () => {
				const { pluginId, phase, lastImportedAt } = get();
				const isError = phase === 'error';
				set({
					isImporting: false,
					phase: isError ? 'error' : 'complete',
					currentItem: null,
					lastImportedAt:
						pluginId && !isError
							? { ...lastImportedAt, [pluginId]: Date.now() }
							: lastImportedAt,
				});
			},

			resetImport: () => {
				set({
					isImporting: false,
					pluginId: null,
					phase: 'tracks',
					current: 0,
					total: 0,
					currentItem: null,
					errors: [],
				});
			},
		}),
		{
			name: 'aria-library-import',
			storage: createJSONStorage(() => customStorage),
			partialize: (state) => ({
				lastImportedAt: state.lastImportedAt,
			}),
		}
	)
);

export const useIsImporting = () => useLibraryImportStore((state) => state.isImporting);

export const useImportProgress = (): ImportProgress =>
	useLibraryImportStore(
		useShallow((state) => ({
			phase: state.phase,
			current: state.current,
			total: state.total,
			currentItem: state.currentItem,
		}))
	);

export const useLastImportedAt = (pluginId: string): number | undefined =>
	useLibraryImportStore((state) => state.lastImportedAt[pluginId]);
