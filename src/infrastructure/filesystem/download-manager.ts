import * as FileSystem from 'expo-file-system/legacy';
import type { Result } from '../../shared/types/result';
import { ok, err } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('DownloadManager');

const DOWNLOADS_DIR = 'downloads/audio/';

export async function getDownloadsDirectory(): Promise<string> {
	const dir = FileSystem.documentDirectory + DOWNLOADS_DIR;
	await FileSystem.makeDirectoryAsync(dir, { intermediates: true }).catch(() => {});
	return dir;
}

export function getDownloadFilePath(trackId: string, format: string = 'm4a'): string {
	const safeTrackId = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
	return FileSystem.documentDirectory + DOWNLOADS_DIR + `${safeTrackId}.${format}`;
}

export type DownloadProgressCallback = (progress: number) => void;

export interface DownloadResult {
	filePath: string;
	fileSize: number;
}

export async function downloadAudioFile(
	url: string,
	trackId: string,
	onProgress?: DownloadProgressCallback,
	headers?: Record<string, string>,
	format: string = 'm4a'
): Promise<Result<DownloadResult, Error>> {
	try {
		await getDownloadsDirectory();

		const filePath = getDownloadFilePath(trackId, format);
		logger.debug(`Downloading to: ${filePath}`);

		const downloadResumable = FileSystem.createDownloadResumable(
			url,
			filePath,
			{
				headers: headers ?? {
					Accept: '*/*',
					'User-Agent': 'Mozilla/5.0 (compatible; Aria/1.0)',
				},
			},
			(downloadProgress) => {
				const progress =
					downloadProgress.totalBytesExpectedToWrite > 0
						? Math.round(
								(downloadProgress.totalBytesWritten /
									downloadProgress.totalBytesExpectedToWrite) *
									100
							)
						: 0;
				onProgress?.(progress);
			}
		);

		const result = await downloadResumable.downloadAsync();

		if (!result) {
			return err(new Error('Download failed: no result returned'));
		}

		if (result.status !== 200) {
			await deleteAudioFile(filePath);
			return err(new Error(`Download failed with status: ${result.status}`));
		}

		const fileInfo = await FileSystem.getInfoAsync(filePath);
		if (!fileInfo.exists) {
			return err(new Error('Download failed: file not found after download'));
		}

		const fileSize = 'size' in fileInfo ? (fileInfo.size as number) : 0;

		if (fileSize < 10000) {
			await deleteAudioFile(filePath);
			return err(new Error('Download failed: file too small, likely corrupted'));
		}

		logger.debug(`Download complete: ${filePath} (${fileSize} bytes)`);

		return ok({
			filePath,
			fileSize,
		});
	} catch (error) {
		logger.error('Download error', error instanceof Error ? error : undefined);
		return err(error instanceof Error ? error : new Error(`Download failed: ${String(error)}`));
	}
}

export async function deleteAudioFile(filePath: string): Promise<Result<void, Error>> {
	try {
		await FileSystem.deleteAsync(filePath, { idempotent: true });
		logger.debug(`Deleted file: ${filePath}`);
		return ok(undefined);
	} catch (error) {
		logger.error('Delete error', error instanceof Error ? error : undefined);
		return err(error instanceof Error ? error : new Error(`Delete failed: ${String(error)}`));
	}
}

export async function getFileInfo(filePath: string): Promise<{ exists: boolean; size?: number }> {
	try {
		const info = await FileSystem.getInfoAsync(filePath);
		return {
			exists: info.exists,
			size: info.exists && 'size' in info ? (info.size as number) : undefined,
		};
	} catch {
		return { exists: false };
	}
}

export async function getDownloadedFilesSize(): Promise<number> {
	try {
		const dir = await getDownloadsDirectory();
		const files = await FileSystem.readDirectoryAsync(dir);

		let totalSize = 0;
		for (const file of files) {
			const info = await getFileInfo(dir + file);
			if (info.exists && info.size) {
				totalSize += info.size;
			}
		}

		return totalSize;
	} catch {
		return 0;
	}
}

export async function clearAllDownloads(): Promise<Result<void, Error>> {
	try {
		const dir = FileSystem.documentDirectory + DOWNLOADS_DIR;
		await FileSystem.deleteAsync(dir, { idempotent: true });
		await getDownloadsDirectory();
		logger.debug('Cleared all downloads');
		return ok(undefined);
	} catch (error) {
		logger.error('Clear downloads error', error instanceof Error ? error : undefined);
		return err(
			error instanceof Error ? error : new Error(`Clear downloads failed: ${String(error)}`)
		);
	}
}
