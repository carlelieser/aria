import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import { ok, err, type AsyncResult } from '@shared/types/result';
import type { ParsedMetadata, EmbeddedArtwork } from '../types';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('ID3Parser');

// Make Buffer available globally for music-metadata
if (typeof global !== 'undefined') {
	(global as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
}

let musicMetadata: typeof import('music-metadata') | null = null;

async function _getMusicMetadata(): Promise<typeof import('music-metadata')> {
	if (!musicMetadata) {
		logger.debug('Loading music-metadata library...');
		musicMetadata = await import('music-metadata');
		logger.debug('music-metadata library loaded');
	}
	return musicMetadata;
}

export async function parseAudioMetadata(fileUri: string): AsyncResult<ParsedMetadata, Error> {
	const fileName = fileUri.split('/').pop() || fileUri;

	try {
		// Check file size first
		const fileInfo = await FileSystem.getInfoAsync(fileUri);
		if (!fileInfo.exists) {
			return err(new Error('File does not exist'));
		}

		const fileSize = 'size' in fileInfo ? (fileInfo.size as number) : 0;
		logger.debug(`Parsing metadata for: ${fileName} (${Math.round(fileSize / 1024)}KB)`);

		const mm = await _getMusicMetadata();

		// Read file as base64 and convert to buffer
		logger.debug(`Reading file: ${fileName}`);
		const base64Content = await FileSystem.readAsStringAsync(fileUri, {
			encoding: FileSystem.EncodingType.Base64,
		});
		logger.debug(`File read complete: ${fileName}`);

		const buffer = Buffer.from(base64Content, 'base64');
		const uint8Array = new Uint8Array(buffer);

		// Parse metadata from buffer
		logger.debug(`Parsing buffer: ${fileName}`);
		const metadata = await mm.parseBuffer(uint8Array, {
			mimeType: _getMimeTypeFromUri(fileUri),
		});
		logger.debug(`Parse complete: ${fileName}`);

		const common = metadata.common;
		const format = metadata.format;

		// Extract artwork if present
		let artwork: EmbeddedArtwork | undefined;
		if (common.picture && common.picture.length > 0) {
			const pic = common.picture[0];
			artwork = {
				data: pic.data,
				mimeType: pic.format || 'image/jpeg',
			};
		}

		return ok({
			title: common.title,
			artist: common.artist || common.artists?.join(', '),
			album: common.album,
			albumArtist: common.albumartist,
			year: common.year,
			genre: common.genre?.join(', '),
			trackNumber: common.track?.no ?? undefined,
			discNumber: common.disk?.no ?? undefined,
			duration: format.duration ?? 0,
			bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined,
			sampleRate: format.sampleRate,
			codec: format.codec,
			artwork,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`Failed to parse metadata for ${fileName}: ${message}`);
		return err(
			error instanceof Error ? error : new Error(`Failed to parse metadata: ${String(error)}`)
		);
	}
}

export async function parseAudioMetadataPartial(
	fileUri: string,
	readDuration: boolean = true
): AsyncResult<Partial<ParsedMetadata>, Error> {
	try {
		const mm = await _getMusicMetadata();

		// Read only first 256KB for partial metadata (faster)
		const fileInfo = await FileSystem.getInfoAsync(fileUri);
		const fileSize =
			fileInfo.exists && 'size' in fileInfo ? (fileInfo.size as number) : 1024 * 256;
		const readSize = Math.min(fileSize, 1024 * 256);

		// For React Native, we need to read the full file unfortunately
		// as there's no efficient way to read just a portion
		const base64Content = await FileSystem.readAsStringAsync(fileUri, {
			encoding: FileSystem.EncodingType.Base64,
		});

		const buffer = Buffer.from(base64Content, 'base64');
		const uint8Array = new Uint8Array(buffer.slice(0, readSize));

		const metadata = await mm.parseBuffer(uint8Array, {
			mimeType: _getMimeTypeFromUri(fileUri),
		});

		const common = metadata.common;
		const format = metadata.format;

		return ok({
			title: common.title,
			artist: common.artist || common.artists?.join(', '),
			album: common.album,
			year: common.year,
			duration: format.duration ?? 0,
		});
	} catch {
		// Return empty partial on error - caller can use filename fallback
		return ok({});
	}
}

function _getMimeTypeFromUri(uri: string): string {
	const ext = uri.split('.').pop()?.toLowerCase();

	const mimeMap: Record<string, string> = {
		mp3: 'audio/mpeg',
		m4a: 'audio/mp4',
		aac: 'audio/aac',
		flac: 'audio/flac',
		ogg: 'audio/ogg',
		opus: 'audio/opus',
		wav: 'audio/wav',
		webm: 'audio/webm',
	};

	return mimeMap[ext || ''] || 'audio/mpeg';
}

export async function extractDuration(fileUri: string): AsyncResult<number, Error> {
	try {
		const mm = await _getMusicMetadata();

		const base64Content = await FileSystem.readAsStringAsync(fileUri, {
			encoding: FileSystem.EncodingType.Base64,
		});

		const buffer = Buffer.from(base64Content, 'base64');
		const uint8Array = new Uint8Array(buffer);

		const metadata = await mm.parseBuffer(uint8Array, {
			mimeType: _getMimeTypeFromUri(fileUri),
		});

		return ok(metadata.format.duration ?? 0);
	} catch (error) {
		return err(
			error instanceof Error
				? error
				: new Error(`Failed to extract duration: ${String(error)}`)
		);
	}
}
