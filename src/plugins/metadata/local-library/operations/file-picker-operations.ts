import { ok, err, type AsyncResult } from '@shared/types/result';
import type { ScanProgress } from '../types';
import { pickAudioFiles } from '../scanner/folder-scanner';
import { useLocalLibraryStore, rebuildAlbumsAndArtists } from '../storage/local-library-store';
import { indexTracks } from '../storage/database';
import { processAudioFiles } from './file-processing';
import { BATCH_CONCURRENCY } from '../utils/progress-utils';

/**
 * Pick individual audio files and add them to the library.
 */
export async function pickAndAddFiles(
	onProgress?: (progress: ScanProgress) => void
): AsyncResult<number, Error> {
	try {
		const store = useLocalLibraryStore.getState();

		const pickResult = await pickAudioFiles();
		if (!pickResult.success) {
			return err(pickResult.error);
		}

		const files = pickResult.data;
		if (files.length === 0) {
			return ok(0);
		}

		const localTracks = await processAudioFiles(files, {
			concurrency: BATCH_CONCURRENCY,
			onProgress,
		});

		store.addTracks(localTracks);

		const indexProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'indexing',
		};
		onProgress?.(indexProgress);

		await indexTracks(localTracks);
		rebuildAlbumsAndArtists();

		const completeProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'complete',
		};
		onProgress?.(completeProgress);

		return ok(localTracks.length);
	} catch (error) {
		return err(error instanceof Error ? error : new Error(`Scan failed: ${String(error)}`));
	}
}
