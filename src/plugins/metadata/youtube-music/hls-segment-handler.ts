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

	// Add media segments
	for (const segmentPath of segmentPaths) {
		const segmentBytes = await readSegmentAsBytes(segmentPath);
		allBytes.push(...segmentBytes);
	}

	logger.debug(`Total bytes from segments: ${allBytes.length}`);

	// Convert to Uint8Array and write as base64
	const uint8 = new Uint8Array(allBytes);
	const finalB64 = convertBytesToBase64(uint8);

	await FileSystem.writeAsStringAsync(outputPath, finalB64, {
		encoding: FileSystem.EncodingType.Base64,
	});

	// Verify file
	const finalInfo = await FileSystem.getInfoAsync(outputPath);
	return finalInfo.exists && 'size' in finalInfo && (finalInfo.size as number) > 10000;
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
	endIndex?: number
): Promise<SegmentDownloadResult> {
	const end = endIndex ?? segmentUrls.length;
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

		if ((i + 1) % 20 === 0) {
			logger.debug(`Downloaded ${i + 1}/${end} segments`);
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
