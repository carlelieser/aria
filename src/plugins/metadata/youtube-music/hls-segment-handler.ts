import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';
import { downloadSegment } from './download-operations';

const logger = getLogger('YouTubeMusic:HLS:Segments');

async function readSegmentAsBytes(filePath: string): Promise<number[]> {
	const b64Content = await FileSystem.readAsStringAsync(filePath, {
		encoding: FileSystem.EncodingType.Base64,
	});
	const binaryStr = atob(b64Content);
	const bytes: number[] = [];
	for (let i = 0; i < binaryStr.length; i++) {
		bytes.push(binaryStr.charCodeAt(i));
	}
	return bytes;
}

function convertBytesToBase64(bytes: Uint8Array): string {
	let binary = '';
	const chunkSize = 8192;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
		binary += String.fromCharCode.apply(null, Array.from(slice));
	}
	return btoa(binary);
}

export async function concatenateSegmentsToFile(
	initSegmentPath: string | null,
	segmentPaths: readonly string[],
	outputPath: string
): Promise<boolean> {
	const allBytes: number[] = [];

	// Add init segment first (contains ftyp + moov atoms required for fMP4 playback)
	if (initSegmentPath) {
		const initBytes = await readSegmentAsBytes(initSegmentPath);
		allBytes.push(...initBytes);
		logger.debug(`Added init segment: ${initBytes.length} bytes`);
	}

	for (const segmentPath of segmentPaths) {
		const segmentBytes = await readSegmentAsBytes(segmentPath);
		allBytes.push(...segmentBytes);
	}

	logger.debug(`Total bytes from segments: ${allBytes.length}`);

	const uint8 = new Uint8Array(allBytes);
	const finalB64 = convertBytesToBase64(uint8);

	await FileSystem.writeAsStringAsync(outputPath, finalB64, {
		encoding: FileSystem.EncodingType.Base64,
	});

	// Verify file
	const finalInfo = await FileSystem.getInfoAsync(outputPath);
	return finalInfo.exists && 'size' in finalInfo && (finalInfo.size as number) > 10000;
}

export async function generateHlsManifest(
	segmentEntries: readonly string[],
	durations: readonly number[],
	manifestPath: string
): Promise<boolean> {
	const targetDuration = Math.ceil(Math.max(...durations, 0));

	const lines: string[] = [
		'#EXTM3U',
		'#EXT-X-VERSION:3',
		`#EXT-X-TARGETDURATION:${targetDuration}`,
		'#EXT-X-PLAYLIST-TYPE:VOD',
		'#EXT-X-MEDIA-SEQUENCE:0',
	];

	for (let i = 0; i < segmentEntries.length; i++) {
		lines.push(`#EXTINF:${(durations[i] ?? 0).toFixed(6)},`);
		lines.push(segmentEntries[i]);
	}

	lines.push('#EXT-X-ENDLIST');
	lines.push('');

	await FileSystem.writeAsStringAsync(manifestPath, lines.join('\n'));

	const info = await FileSystem.getInfoAsync(manifestPath);
	if (info.exists) {
		logger.debug(`HLS manifest created: ${manifestPath}`);
		return true;
	}

	logger.warn('Failed to write HLS manifest');
	return false;
}

export interface SegmentDownloadResult {
	readonly segmentPaths: readonly string[];
	readonly failedSegments: readonly number[];
}

export async function downloadSegments(
	segmentUrls: readonly string[],
	tempDir: string,
	headers: Record<string, string>,
	startIndex: number = 0,
	endIndex?: number,
	onProgress?: (progress: number) => void
): Promise<SegmentDownloadResult> {
	const end = endIndex ?? segmentUrls.length;
	const totalSegments = end - startIndex;
	const segmentPaths: string[] = [];
	const failedSegments: number[] = [];

	for (let i = startIndex; i < end; i++) {
		const segmentPath = `${tempDir}segment_${i.toString().padStart(4, '0')}.ts`;
		const success = await downloadSegment(segmentUrls[i], segmentPath, headers);

		if (!success) {
			logger.warn(`Failed to download segment ${i}`);
			failedSegments.push(i);
			continue;
		}

		segmentPaths.push(segmentPath);

		const completed = i - startIndex + 1;
		onProgress?.(Math.round((completed / totalSegments) * 90));

		if (completed % 20 === 0) {
			logger.debug(`Downloaded ${completed}/${totalSegments} segments`);
		}
	}

	return { segmentPaths, failedSegments };
}

export async function downloadInitSegment(
	url: string,
	tempDir: string,
	headers: Record<string, string>
): Promise<string | null> {
	const initSegmentPath = `${tempDir}init.mp4`;
	const success = await downloadSegment(url, initSegmentPath, headers);

	if (!success) {
		logger.warn('Failed to download init segment');
		return null;
	}

	logger.debug('Init segment downloaded successfully');
	return initSegmentPath;
}
