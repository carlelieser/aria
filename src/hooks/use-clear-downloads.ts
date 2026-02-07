import { useCallback } from 'react';
import { useDownloadStore } from '@/src/application/state/download-store';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/src/hooks/use-toast';

export function useClearDownloads() {
	const clearAll = useDownloadStore((state) => state.clearAll);
	const { success, error } = useToast();

	const clearDownloads = useCallback(async () => {
		const result = await clearAllDownloads();
		if (result.success) {
			clearAll();
			success('Downloads cleared', 'All downloaded files have been removed');
			return true;
		}
		error('Failed to clear downloads', result.error.message);
		return false;
	}, [clearAll, success, error]);

	return { clearDownloads };
}
