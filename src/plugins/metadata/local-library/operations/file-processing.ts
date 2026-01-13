import { getLogger } from '@shared/services/logger';
import type { ScanProgress, ScannedFile, LocalTrack } from '../types';
import { parseAudioMetadata } from '../scanner/id3-parser';
import { mapToLocalTrack, cacheArtwork, generateLocalTrackId } from '../mappers';
import { processBatched, createThrottledProgress } from '../utils/progress-utils';

const logger = getLogger('FileProcessing');

export interface ProcessFilesOptions {
	readonly concurrency: number;
	readonly onProgress?: (progress: ScanProgress) => void;
	readonly updateStoreProgress?: (progress: ScanProgress) => void;
	readonly throttleMs?: number;
}

/**
 * Process audio files and extract metadata.
 */
export async function processAudioFiles(
	files: ScannedFile[],
	options: ProcessFilesOptions
): Promise<LocalTrack[]> {
	const throttledProgress = createThrottledProgress(
		options.onProgress,
		options.throttleMs ?? 100
	);
	let lastStoreUpdate = 0;

	const localTracks = await processBatched(
		files,
		async (file, index) => {
			const now = Date.now();
			const progress: ScanProgress = {
				current: index + 1,
				total: files.length,
				currentFile: file.name,
				phase: 'scanning',
			};

			if (
				options.updateStoreProgress &&
				now - lastStoreUpdate >= (options.throttleMs ?? 100)
			) {
				options.updateStoreProgress(progress);
				lastStoreUpdate = now;
			}

			throttledProgress(progress);

			const metadataResult = await parseAudioMetadata(file.uri);
			const metadata = metadataResult.success ? metadataResult.data : { duration: 0 };

			if (!metadataResult.success) {
				logger.debug(
					`Failed to parse metadata for ${file.name}: ${metadataResult.error.message}`
				);
			}

			let artworkPath: string | undefined;
			if (metadataResult.success && metadata.artwork) {
				logger.debug(`Artwork found for ${file.name}, caching...`);
				const trackId = generateLocalTrackId(file.uri);
				const cachedPath = await cacheArtwork(
					trackId,
					metadata.artwork.data,
					metadata.artwork.mimeType
				);
				artworkPath = cachedPath ?? undefined;

				if (artworkPath) {
					logger.debug(`Artwork cached at: ${artworkPath}`);
				} else {
					logger.warn(`Failed to cache artwork for ${file.name}`);
				}
			}

			return mapToLocalTrack(file, metadata, artworkPath);
		},
		options.concurrency
	);

	return localTracks;
}
