import { useCallback } from 'react';
import { useDownloadStore } from '@/src/application/state/download-store';
import { clearDownloadedFiles } from '@/src/application/services/download-cleanup-service';
import { useToast } from '@/src/hooks/use-toast';

export function useClearDownloads() {
	const clearAll = useDownloadStore((state) => state.clearAll);
	const { success, error } = useToast();

	const clearDownloads = useCallback(async () => {
		const result = await clearDownloadedFiles();
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
