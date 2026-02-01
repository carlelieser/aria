import type InnertubeClient from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';
import { parseHlsManifest } from './hls-manifest-parser';
import {
	concatenateSegmentsToFile,
	downloadSegments,
	downloadInitSegment,
} from './hls-segment-handler';
import {
	getTempDirectory,
	getCachedFilePath,
	cleanupTempFiles,
	ensureCacheDirectory,
} from './cache-operations';

const logger = getLogger('YouTubeMusic:HLS');

export async function tryHlsStream(
	client: InnertubeClient,
	videoId: string,
	clientType: 'IOS' | 'TV'
): Promise<string | null> {
	try {
		const videoInfo = await client.getInfo(videoId, { client: clientType });
		return videoInfo.streaming_data?.hls_manifest_url ?? null;
	} catch {
		return null;
	}
}

async function downloadFullHls(
	segmentUrls: readonly string[],
	initSegmentPath: string | null,
	tempDir: string,
	cachedFilePath: string,
	headers: Record<string, string>
): Promise<string | null> {
	logger.debug('Full download mode: downloading all segments');

	const { segmentPaths } = await downloadSegments(segmentUrls, tempDir, headers);

	if (segmentPaths.length === 0) {
		logger.warn('No segments were downloaded successfully');
		return null;
	}

	logger.debug('All segments downloaded, concatenating...');

	const success = await concatenateSegmentsToFile(initSegmentPath, segmentPaths, cachedFilePath);

	if (!success) {
		logger.warn('Failed to create cached file');
		return null;
	}

	logger.debug(`HLS download complete: ${cachedFilePath}`);
	return cachedFilePath;
}

export async function downloadHlsToCache(
	manifestUrl: string,
	videoId: string,
	cookies?: string
): Promise<string | null> {
	await ensureCacheDirectory();
	const cachedFilePath = getCachedFilePath(videoId);
	const tempDir = getTempDirectory(videoId);

	await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {});

	const fetchHeaders: Record<string, string> = {};
	if (cookies) {
		fetchHeaders['Cookie'] = cookies;
		logger.debug('Using authenticated HLS download with cookies');
	}

	try {
		logger.debug('Fetching HLS manifest...');

		const parsed = await parseHlsManifest(manifestUrl, fetchHeaders);
		if (!parsed) {
			return null;
		}

		const { initSegmentUrl, segmentUrls } = parsed;
		logger.debug(`Found ${segmentUrls.length} segments to download`);

		// Download initialization segment first if present
		let initSegmentPath: string | null = null;
		if (initSegmentUrl) {
			initSegmentPath = await downloadInitSegment(initSegmentUrl, tempDir, fetchHeaders);
			if (!initSegmentPath) {
				await cleanupTempFiles([tempDir]);
				return null;
			}
		}

		const result = await downloadFullHls(
			segmentUrls,
			initSegmentPath,
			tempDir,
			cachedFilePath,
			fetchHeaders
		);

		// Clean up temp segments
		await cleanupTempFiles([tempDir]);

		if (!result) {
			await cleanupTempFiles([cachedFilePath]);
		}

		return result;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`HLS download failed: ${message}`);
		await cleanupTempFiles([tempDir, cachedFilePath]);
		return null;
	}
}
