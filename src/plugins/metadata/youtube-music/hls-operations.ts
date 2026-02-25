import type InnertubeClient from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';
import { parseHlsManifest } from './hls-manifest-parser';
import {
	concatenateSegmentsToFile,
	downloadSegments,
	downloadInitSegment,
	generateHlsManifest,
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
	headers: Record<string, string>,
	onProgress?: (progress: number) => void
): Promise<string | null> {
	logger.debug('Full download mode: downloading all segments');

	const { segmentPaths } = await downloadSegments(
		segmentUrls,
		tempDir,
		headers,
		0,
		undefined,
		onProgress
	);

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

	onProgress?.(95);
	logger.debug(`HLS download complete: ${cachedFilePath}`);
	return cachedFilePath;
}

export async function rewriteHlsManifest(
	manifestUrl: string,
	videoId: string,
	cookies?: string
): Promise<string | null> {
	const fetchHeaders: Record<string, string> = {};
	if (cookies) fetchHeaders['Cookie'] = cookies;

	const parsed = await parseHlsManifest(manifestUrl, fetchHeaders);
	if (!parsed) return null;

	const { segmentUrls, segmentDurations } = parsed;
	if (segmentUrls.length === 0) return null;

	await ensureCacheDirectory();
	const manifestPath = `${getTempDirectory(videoId)}playlist.m3u8`;
	await FileSystem.makeDirectoryAsync(getTempDirectory(videoId), { intermediates: true }).catch(
		() => {}
	);

	const ok = await generateHlsManifest(segmentUrls, segmentDurations, manifestPath);
	return ok ? manifestPath : null;
}

export interface HlsDownloadResult {
	readonly path: string;
	readonly format: 'm4a' | 'm3u8';
}

export async function downloadHlsToCache(
	manifestUrl: string,
	videoId: string,
	cookies?: string,
	onProgress?: (progress: number) => void
): Promise<HlsDownloadResult | null> {
	await ensureCacheDirectory();
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

		const { initSegmentUrl, segmentUrls, segmentDurations } = parsed;
		logger.debug(`Found ${segmentUrls.length} segments to download`);

		// fMP4 has an init segment (ftyp + moov); without one, segments are MPEG-TS
		const isFmp4 = initSegmentUrl !== null;

		// Download initialization segment first if present
		let initSegmentPath: string | null = null;
		if (initSegmentUrl) {
			initSegmentPath = await downloadInitSegment(initSegmentUrl, tempDir, fetchHeaders);
			if (!initSegmentPath) {
				await cleanupTempFiles([tempDir]);
				return null;
			}
		}

		if (isFmp4) {
			// fMP4 path: concatenate into single .m4a — seeking works natively
			const cachedFilePath = getCachedFilePath(videoId, 'm4a');

			const result = await downloadFullHls(
				segmentUrls,
				initSegmentPath,
				tempDir,
				cachedFilePath,
				fetchHeaders,
				onProgress
			);

			await cleanupTempFiles([tempDir]);

			if (!result) {
				await cleanupTempFiles([cachedFilePath]);
				return null;
			}

			return { path: result, format: 'm4a' };
		}

		// TS path: keep individual segments, generate local .m3u8 for seeking
		const { segmentPaths } = await downloadSegments(
			segmentUrls,
			tempDir,
			fetchHeaders,
			0,
			undefined,
			onProgress
		);

		if (segmentPaths.length === 0) {
			logger.warn('No segments were downloaded successfully');
			await cleanupTempFiles([tempDir]);
			return null;
		}

		const manifestPath = `${tempDir}playlist.m3u8`;
		const manifestOk = await generateHlsManifest(
			segmentPaths.map((p) => p.substring(p.lastIndexOf('/') + 1)),
			segmentDurations,
			manifestPath
		);
		if (!manifestOk) {
			await cleanupTempFiles([tempDir]);
			return null;
		}

		onProgress?.(95);
		logger.debug(`HLS download complete with local manifest: ${manifestPath}`);
		return { path: manifestPath, format: 'm3u8' };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`HLS download failed: ${message}`);
		await cleanupTempFiles([tempDir, getCachedFilePath(videoId, 'm4a')]);
		return null;
	}
}
