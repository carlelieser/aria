import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';
import {
	ensureCacheDirectory,
	getCachedFilePath,
	verifyFileSize,
	cleanupTempFiles,
} from './cache-operations';

const logger = getLogger('YouTubeMusic:Download');

export const DOWNLOAD_TIMEOUT_MS = 60000; // 60 seconds timeout for downloads

export interface DownloadOptions {
	readonly url: string;
	readonly videoId: string;
	readonly headers?: Record<string, string>;
	readonly cookies?: string;
	readonly expectedSize?: number;
}

async function downloadWithTimeout(
	url: string,
	filePath: string,
	headers: Record<string, string>,
	timeoutMs: number
): Promise<FileSystem.FileSystemDownloadResult | null> {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(() => {
			logger.warn(`Download timed out after ${timeoutMs}ms`);
			resolve(null);
		}, timeoutMs);

		FileSystem.downloadAsync(url, filePath, { headers })
			.then((result) => {
				clearTimeout(timeoutId);
				resolve(result);
			})
			.catch((error) => {
				clearTimeout(timeoutId);
				logger.warn(`Download error: ${error instanceof Error ? error.message : String(error)}`);
				resolve(null);
			});
	});
}

function buildDownloadHeaders(
	headers?: Record<string, string>,
	cookies?: string,
	expectedSize?: number
): Record<string, string> {
	const finalHeaders: Record<string, string> = {
		Accept: '*/*',
		Origin: 'https://www.youtube.com',
		Referer: 'https://www.youtube.com/',
		'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
		// Request full file with Range header - YouTube servers often require this
		Range: expectedSize ? `bytes=0-${expectedSize - 1}` : 'bytes=0-',
		...headers,
	};

	if (cookies) {
		finalHeaders['Cookie'] = cookies;
		logger.debug('Including authentication cookies in download request');
	}

	return finalHeaders;
}

function isSuccessfulDownload(status: number): boolean {
	// Accept both 200 (full response) and 206 (range response) as success
	// We send Range headers so 206 is expected for successful downloads
	return status === 200 || status === 206;
}

export async function downloadToCache(options: DownloadOptions): Promise<string | null> {
	const { url, videoId, headers, cookies, expectedSize } = options;

	await ensureCacheDirectory();
	const cachedFilePath = getCachedFilePath(videoId);

	const finalHeaders = buildDownloadHeaders(headers, cookies, expectedSize);

	logger.debug(`Downloading with headers: ${Object.keys(finalHeaders).join(', ')}`);
	logger.debug(`URL length: ${url.length}, expected size: ${expectedSize ?? 'unknown'}`);

	const downloadResult = await downloadWithTimeout(
		url,
		cachedFilePath,
		finalHeaders,
		DOWNLOAD_TIMEOUT_MS
	);

	if (!downloadResult) {
		logger.warn('Download failed or timed out');
		await cleanupTempFiles([cachedFilePath]);
		return null;
	}

	if (!isSuccessfulDownload(downloadResult.status)) {
		logger.warn(`Cache download failed with status: ${downloadResult.status}`);
		await cleanupTempFiles([cachedFilePath]);
		return null;
	}

	logger.debug(`Download completed with status: ${downloadResult.status}`);

	const isValid = await verifyFileSize(cachedFilePath, expectedSize);
	if (!isValid) {
		await cleanupTempFiles([cachedFilePath]);
		return null;
	}

	const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);
	const actualSize = 'size' in fileInfo ? (fileInfo.size as number) : 0;
	logger.debug(`Audio cached successfully: ${actualSize} bytes to ${cachedFilePath}`);

	return cachedFilePath;
}

export async function downloadSegment(
	url: string,
	outputPath: string,
	headers: Record<string, string>
): Promise<boolean> {
	const result = await FileSystem.downloadAsync(url, outputPath, { headers });
	return isSuccessfulDownload(result.status);
}
