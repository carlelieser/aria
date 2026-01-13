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
	getPartialFilePath,
	cleanupTempFiles,
	ensureCacheDirectory,
} from './cache-operations';

const logger = getLogger('YouTubeMusic:HLS');

// Minimum segments needed for immediate playback (~30 seconds at ~2s per segment)
const MIN_SEGMENTS_FOR_PLAYBACK = 15;

// Background download tracking
const backgroundDownloads = new Map<string, Promise<void>>();

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

async function startBackgroundDownload(
	videoId: string,
	segmentUrls: readonly string[],
	initialSegmentCount: number,
	initialSegmentPaths: readonly string[],
	initSegmentPath: string | null,
	tempDir: string,
	cachedFilePath: string,
	partialFilePath: string,
	headers: Record<string, string>
): Promise<void> {
	const backgroundTask = (async () => {
		try {
			logger.debug(
				`Background: downloading remaining ${segmentUrls.length - initialSegmentCount} segments`
			);

			const { segmentPaths: remainingPaths } = await downloadSegments(
				segmentUrls,
				tempDir,
				headers,
				initialSegmentCount
			);

			const allSegmentPaths = [...initialSegmentPaths, ...remainingPaths];

			// Create full cached file
			const fullSuccess = await concatenateSegmentsToFile(
				initSegmentPath,
				allSegmentPaths,
				cachedFilePath
			);

			if (fullSuccess) {
				logger.debug(`Background: full file cached: ${cachedFilePath}`);
				// Clean up partial file
				await cleanupTempFiles([partialFilePath]);
			}

			// Clean up temp segments
			await cleanupTempFiles([tempDir]);
		} catch (error) {
			logger.warn(
				`Background download error: ${error instanceof Error ? error.message : String(error)}`
			);
		} finally {
			backgroundDownloads.delete(videoId);
		}
	})();

	backgroundDownloads.set(videoId, backgroundTask);
}

async function downloadStreamingHls(
	segmentUrls: readonly string[],
	initSegmentPath: string | null,
	tempDir: string,
	cachedFilePath: string,
	partialFilePath: string,
	videoId: string,
	headers: Record<string, string>
): Promise<string | null> {
	const initialSegmentCount = Math.min(MIN_SEGMENTS_FOR_PLAYBACK, segmentUrls.length);
	logger.debug(
		`Streaming mode: downloading ${initialSegmentCount} segments for immediate playback`
	);

	const { segmentPaths: initialSegmentPaths } = await downloadSegments(
		segmentUrls,
		tempDir,
		headers,
		0,
		initialSegmentCount
	);

	if (initialSegmentPaths.length === 0) {
		logger.warn('No initial segments were downloaded successfully');
		return null;
	}

	// Create partial file for immediate playback
	const partialSuccess = await concatenateSegmentsToFile(
		initSegmentPath,
		initialSegmentPaths,
		partialFilePath
	);

	if (!partialSuccess) {
		logger.warn('Failed to create partial file');
		return null;
	}

	logger.debug(`Partial file ready for playback: ${partialFilePath}`);

	// Start background download for remaining segments
	if (!backgroundDownloads.has(videoId)) {
		await startBackgroundDownload(
			videoId,
			segmentUrls,
			initialSegmentCount,
			initialSegmentPaths,
			initSegmentPath,
			tempDir,
			cachedFilePath,
			partialFilePath,
			headers
		);
	}

	return partialFilePath;
}

export async function downloadHlsToCache(
	manifestUrl: string,
	videoId: string,
	cookies?: string,
	forStreaming: boolean = false
): Promise<string | null> {
	await ensureCacheDirectory();
	const cachedFilePath = getCachedFilePath(videoId);
	const partialFilePath = getPartialFilePath(videoId);
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

		// For streaming: download minimum segments, return immediately, continue in background
		if (forStreaming && segmentUrls.length > MIN_SEGMENTS_FOR_PLAYBACK) {
			const result = await downloadStreamingHls(
				segmentUrls,
				initSegmentPath,
				tempDir,
				cachedFilePath,
				partialFilePath,
				videoId,
				fetchHeaders
			);

			if (!result) {
				await cleanupTempFiles([tempDir]);
			}

			return result;
		}

		// Full download mode (for offline downloads or short tracks)
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
