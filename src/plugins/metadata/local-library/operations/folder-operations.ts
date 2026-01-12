import { ok, err, type AsyncResult } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { ScanProgress, FolderInfo } from '../types';
import { useLocalLibraryStore, rebuildAlbumsAndArtists } from '../storage/local-library-store';
import { scanFolder as scanFolderFiles } from '../scanner/folder-scanner';
import { indexTracks, removeTracksForFolder as removeTracksFromDb } from '../storage/database';
import { processAudioFiles } from './file-processing';
import { BATCH_CONCURRENCY } from '../utils/progress-utils';

const logger = getLogger('FolderOperations');

/**
 * Add a new folder to the library and scan it.
 */
export async function addFolder(
	folderUri: string,
	folderName: string,
	onProgress?: (progress: ScanProgress) => void
): AsyncResult<number, Error> {
	logger.info(`Adding folder: ${folderName} (${folderUri})`);

	try {
		const store = useLocalLibraryStore.getState();
		store.setIsScanning(true);

		store.addFolder({
			uri: folderUri,
			name: folderName,
			trackCount: 0,
			lastScannedAt: null,
		});

		const initialProgress: ScanProgress = {
			current: 0,
			total: 0,
			phase: 'enumerating',
		};
		store.setScanProgress(initialProgress);
		onProgress?.(initialProgress);

		logger.debug('Starting folder enumeration...');
		const scanResult = await scanFolderFiles(folderUri, {
			recursive: true,
			onProgress: (scanned, current) => {
				const progress: ScanProgress = {
					current: scanned,
					total: scanned,
					currentFile: current,
					phase: 'enumerating',
				};
				store.setScanProgress(progress);
				onProgress?.(progress);
			},
		});

		if (!scanResult.success) {
			logger.error('Folder scan failed', scanResult.error);
			store.setIsScanning(false);
			store.setScanProgress(null);
			return err(scanResult.error);
		}

		const files = scanResult.data;
		logger.info(`Found ${files.length} audio file(s) to process`);

		if (files.length === 0) {
			logger.info('No audio files found in folder');
			store.updateFolderScanTime(folderUri);
			store.setIsScanning(false);
			store.setScanProgress(null);
			return ok(0);
		}

		const localTracks = await processAudioFiles(files, {
			concurrency: BATCH_CONCURRENCY,
			onProgress,
			updateStoreProgress: (progress) => store.setScanProgress(progress),
		});

		logger.info(`Processed ${localTracks.length} tracks, adding to store...`);
		store.addTracks(localTracks);

		const indexProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'indexing',
		};
		store.setScanProgress(indexProgress);
		onProgress?.(indexProgress);

		logger.debug('Indexing tracks in database...');
		await indexTracks(localTracks);

		logger.debug('Rebuilding albums and artists...');
		rebuildAlbumsAndArtists();

		store.updateFolderScanTime(folderUri);
		store.updateFolderTrackCount(folderUri, localTracks.length);

		const completeProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'complete',
		};
		store.setScanProgress(completeProgress);
		onProgress?.(completeProgress);

		store.setIsScanning(false);
		store.setScanProgress(null);

		logger.info(`Successfully added ${localTracks.length} tracks from ${folderName}`);
		return ok(localTracks.length);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Scan failed: ${message}`, error instanceof Error ? error : undefined);

		const store = useLocalLibraryStore.getState();
		store.setIsScanning(false);
		store.setScanProgress(null);

		return err(error instanceof Error ? error : new Error(`Scan failed: ${String(error)}`));
	}
}

/**
 * Remove a folder from the library.
 */
export async function removeFolder(folderUri: string): AsyncResult<void, Error> {
	try {
		const store = useLocalLibraryStore.getState();
		store.removeTracksForFolder(folderUri);
		await removeTracksFromDb(folderUri);
		store.removeFolder(folderUri);
		rebuildAlbumsAndArtists();
		return ok(undefined);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to remove folder: ${String(error)}`)
		);
	}
}

/**
 * Rescan an existing folder.
 */
export async function rescanFolder(
	folderUri: string,
	onProgress?: (progress: ScanProgress) => void
): AsyncResult<number, Error> {
	logger.info(`Rescanning folder: ${folderUri}`);

	try {
		const store = useLocalLibraryStore.getState();
		store.setIsScanning(true);

		logger.debug('Removing existing tracks for folder...');
		store.removeTracksForFolder(folderUri);
		await removeTracksFromDb(folderUri);

		const initialProgress: ScanProgress = {
			current: 0,
			total: 0,
			phase: 'enumerating',
		};
		store.setScanProgress(initialProgress);
		onProgress?.(initialProgress);

		logger.debug('Starting folder enumeration...');
		const scanResult = await scanFolderFiles(folderUri, {
			recursive: true,
			onProgress: (scanned, current) => {
				const progress: ScanProgress = {
					current: scanned,
					total: scanned,
					currentFile: current,
					phase: 'enumerating',
				};
				store.setScanProgress(progress);
				onProgress?.(progress);
			},
		});

		if (!scanResult.success) {
			logger.error('Folder rescan failed', scanResult.error);
			store.setIsScanning(false);
			store.setScanProgress(null);
			return err(scanResult.error);
		}

		const files = scanResult.data;
		logger.info(`Found ${files.length} audio file(s) to process`);

		if (files.length === 0) {
			logger.info('No audio files found in folder');
			store.updateFolderScanTime(folderUri);
			store.setIsScanning(false);
			store.setScanProgress(null);
			return ok(0);
		}

		const localTracks = await processAudioFiles(files, {
			concurrency: BATCH_CONCURRENCY,
			onProgress,
			updateStoreProgress: (progress) => store.setScanProgress(progress),
		});

		logger.info(`Processed ${localTracks.length} tracks, adding to store...`);
		store.addTracks(localTracks);

		const indexProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'indexing',
		};
		store.setScanProgress(indexProgress);
		onProgress?.(indexProgress);

		logger.debug('Indexing tracks in database...');
		await indexTracks(localTracks);
		rebuildAlbumsAndArtists();
		store.updateFolderScanTime(folderUri);
		store.updateFolderTrackCount(folderUri, localTracks.length);

		const completeProgress: ScanProgress = {
			current: files.length,
			total: files.length,
			phase: 'complete',
		};
		store.setScanProgress(completeProgress);
		onProgress?.(completeProgress);

		store.setIsScanning(false);
		store.setScanProgress(null);

		logger.info(`Successfully rescanned folder: ${localTracks.length} tracks found`);
		return ok(localTracks.length);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Rescan failed: ${message}`, error instanceof Error ? error : undefined);

		const store = useLocalLibraryStore.getState();
		store.setIsScanning(false);
		store.setScanProgress(null);

		return err(error instanceof Error ? error : new Error(`Rescan failed: ${String(error)}`));
	}
}

/**
 * Rescan all folders in the library.
 */
export async function rescanAllFolders(
	folders: FolderInfo[],
	onProgress?: (progress: ScanProgress) => void
): AsyncResult<number, Error> {
	let totalTracks = 0;

	for (const folder of folders) {
		const result = await rescanFolder(folder.uri, onProgress);
		if (result.success) {
			totalTracks += result.data;
		}
	}

	return ok(totalTracks);
}
