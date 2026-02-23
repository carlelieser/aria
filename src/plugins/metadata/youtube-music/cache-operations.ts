import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('YouTubeMusic:Cache');

export const CACHE_DIR = 'audio/';

const CACHED_EXTENSIONS = ['m4a', 'ts', 'webm', 'ogg'] as const;

export interface CachedFile {
	readonly path: string;
	readonly format: string;
}

export async function checkCache(videoId: string): Promise<CachedFile | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;

	// Check for local HLS manifest (TS-based downloads with segment directory)
	const manifestPath = getTempDirectory(videoId) + 'playlist.m3u8';
	const manifestInfo = await FileSystem.getInfoAsync(manifestPath);
	if (manifestInfo.exists) {
		logger.debug(`Using cached HLS manifest: ${manifestPath}`);
		return { path: manifestPath, format: 'm3u8' };
	}

	for (const ext of CACHED_EXTENSIONS) {
		const filePath = cacheDir + `${videoId}.${ext}`;
		const fileInfo = await FileSystem.getInfoAsync(filePath);

		if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size as number) > 10000) {
			logger.debug(`Using cached file: ${filePath} (format: ${ext})`);
			return { path: filePath, format: ext };
		}

		if (fileInfo.exists) {
			await FileSystem.deleteAsync(filePath, { idempotent: true });
		}
	}

	return null;
}

export async function ensureCacheDirectory(): Promise<string> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});
	return cacheDir;
}

export function getCachedFilePath(videoId: string, format: string = 'm4a'): string {
	return FileSystem.cacheDirectory + CACHE_DIR + `${videoId}.${format}`;
}

export function getTempDirectory(videoId: string): string {
	return FileSystem.cacheDirectory + CACHE_DIR + `${videoId}_segments/`;
}

export async function cleanupTempFiles(paths: string[]): Promise<void> {
	for (const path of paths) {
		await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
	}
}

export async function verifyFileSize(filePath: string, expectedSize?: number): Promise<boolean> {
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
