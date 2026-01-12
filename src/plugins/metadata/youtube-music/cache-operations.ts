import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('YouTubeMusic:Cache');

export const CACHE_DIR = 'audio/';

export async function checkCache(videoId: string): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;
	const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);

	if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size as number) > 10000) {
		logger.debug(`Using cached file: ${cachedFilePath}`);
		return cachedFilePath;
	}

	if (fileInfo.exists) {
		await FileSystem.deleteAsync(cachedFilePath, { idempotent: true });
	}

	return null;
}

export async function ensureCacheDirectory(): Promise<string> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
	return cacheDir;
}

export function getCachedFilePath(videoId: string): string {
	return FileSystem.cacheDirectory + CACHE_DIR + `${videoId}.m4a`;
}

export function getPartialFilePath(videoId: string): string {
	return FileSystem.cacheDirectory + CACHE_DIR + `${videoId}_partial.m4a`;
}

export function getTempDirectory(videoId: string): string {
	return FileSystem.cacheDirectory + CACHE_DIR + `${videoId}_segments/`;
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
	for (const path of paths) {
		await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
	}
}

export async function verifyFileSize(
	filePath: string,
	expectedSize?: number
): Promise<boolean> {
	const fileInfo = await FileSystem.getInfoAsync(filePath);

	if (!fileInfo.exists || !('size' in fileInfo)) {
		logger.warn('File does not exist or has no size info');
		return false;
	}

	const actualSize = fileInfo.size as number;

	if (expectedSize && actualSize < expectedSize * 0.95) {
		logger.warn(`File incomplete: got ${actualSize} bytes, expected ${expectedSize}`);
		return false;
	}

	if (actualSize < 10000) {
		logger.warn(`File too small: ${actualSize} bytes`);
		return false;
	}

	return true;
}
