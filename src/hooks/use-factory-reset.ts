import { useCallback } from 'react';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useDownloadStore } from '@/src/application/state/download-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { useSearchStore } from '@/src/application/state/search-store';
import { useSearchFilterStore } from '@/src/application/state/search-filter-store';
import { useEqualizerStore } from '@/src/application/state/equalizer-store';
import { useSettingsStore } from '@/src/application/state/settings-store';
import { clearDownloadedFiles } from '@/src/application/services/download-cleanup-service';
import { useToast } from '@/src/hooks/use-toast';

export function useFactoryReset() {
	const { success } = useToast();

	const factoryReset = useCallback(async () => {
		await clearDownloadedFiles();
		useDownloadStore.getState().clearAll();
		useLibraryStore.getState().clearLibrary();
		useHistoryStore.getState().clearHistory();
		useSearchStore.getState().clearResults();
		useSearchStore.getState().clearRecentSearches();
		useSearchFilterStore.getState().clearAll();
		useEqualizerStore.getState().resetEqualizer();
		useSettingsStore.getState().resetAllSettings();

		success('Factory reset complete', 'All data has been cleared and settings reset');
	}, [success]);

	return { factoryReset };
}
