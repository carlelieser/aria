import * as FileSystem from 'expo-file-system/legacy';
import { StorageAccessFramework } from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import { ok, err, type AsyncResult } from '@shared/types/result';
import type { AudioFileType } from '@domain/value-objects/audio-source';
import { permissionService } from '@/src/application/services/permission-service';
import type { ScannedFile } from '../types';
import { SUPPORTED_EXTENSIONS, MIME_TYPE_MAP } from '../types';
import { getLogger } from '@shared/services/logger';

const logger = getLogger('FolderScanner');

const AUDIO_MIME_TYPES = [
	'audio/mpeg',
	'audio/mp3',
	'audio/flac',
	'audio/x-flac',
	'audio/aac',
	'audio/x-m4a',
	'audio/mp4',
	'audio/wav',
	'audio/x-wav',
	'audio/ogg',
	'audio/opus',
];

export interface FolderScanResult {
	readonly folderUri: string;
	readonly folderName: string;
	readonly files: ScannedFile[];
}

export interface ScanOptions {
	readonly recursive?: boolean;
	readonly onProgress?: (scanned: number, current: string) => void;
}

export async function pickFolder(): AsyncResult<{ uri: string; name: string }, Error> {
	return permissionService.requestDirectoryPermission();
}

export async function pickAudioFiles(): AsyncResult<ScannedFile[], Error> {
	try {
		const result = await DocumentPicker.getDocumentAsync({
			type: AUDIO_MIME_TYPES,
			copyToCacheDirectory: false,
			multiple: true,
		});

		if (result.canceled || !result.assets || result.assets.length === 0) {
			return err(new Error('File selection cancelled'));
		}

		const files: ScannedFile[] = [];

		for (const asset of result.assets) {
			const extension = _getExtensionFromUri(asset.uri, asset.mimeType);
			if (!extension) continue;

			files.push({
				uri: asset.uri,
				name: asset.name || _getFileNameFromUri(asset.uri),
				size: asset.size ?? 0,
				modifiedTime: Date.now(),
				extension,
			});
		}

		return ok(files);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to pick files: ${String(error)}`)
		);
	}
}

export async function scanFolder(
	folderUri: string,
	options?: ScanOptions
): AsyncResult<ScannedFile[], Error> {
	try {
		const files: ScannedFile[] = [];
		const isSafUri = folderUri.startsWith('content://');

		logger.info(`Starting folder scan: ${folderUri}`);
		logger.debug(`Platform: ${Platform.OS}, SAF URI: ${isSafUri}, Recursive: ${options?.recursive ?? true}`);

		if (isSafUri && Platform.OS === 'android') {
			await _scanSafDirectory(folderUri, files, options?.recursive ?? true, options);
		} else {
			await _scanDirectoryRecursive(folderUri, files, options?.recursive ?? true, options);
		}

		logger.info(`Scan complete: found ${files.length} audio file(s)`);
		return ok(files);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Failed to scan folder: ${message}`, error instanceof Error ? error : undefined);
		return err(
			error instanceof Error ? error : new Error(`Failed to scan folder: ${String(error)}`)
		);
	}
}

async function _scanSafDirectory(
	dirUri: string,
	results: ScannedFile[],
	recursive: boolean,
	options?: ScanOptions
): Promise<void> {
	try {
		logger.debug(`Reading SAF directory: ${dirUri}`);
		const entries = await StorageAccessFramework.readDirectoryAsync(dirUri);
		logger.debug(`Found ${entries.length} entries in SAF directory`);

		for (const entryUri of entries) {
			try {
				const info = await FileSystem.getInfoAsync(entryUri);
				const fileName = _getFileNameFromUri(entryUri);

				if (!info.exists) continue;

				if (info.isDirectory) {
					if (recursive) {
						await _scanSafDirectory(entryUri, results, recursive, options);
					}
				} else {
					const extension = _getExtensionFromUri(entryUri);
					if (extension) {
						options?.onProgress?.(results.length + 1, fileName);

						const size = 'size' in info ? (info.size as number) : 0;
						const modTime =
							'modificationTime' in info
								? (info.modificationTime as number) * 1000
								: Date.now();

						results.push({
							uri: entryUri,
							name: fileName,
							size,
							modifiedTime: modTime,
							extension,
						});
					}
				}
			} catch (entryError) {
				logger.warn(`Failed to process entry: ${entryUri}`, entryError instanceof Error ? entryError : undefined);
				continue;
			}
		}
	} catch (error) {
		logger.error(`Failed to read SAF directory: ${dirUri}`, error instanceof Error ? error : undefined);
	}
}

async function _scanDirectoryRecursive(
	dirUri: string,
	results: ScannedFile[],
	recursive: boolean,
	options?: ScanOptions
): Promise<void> {
	try {
		logger.debug(`Reading directory: ${dirUri}`);
		const entries = await FileSystem.readDirectoryAsync(dirUri);
		logger.debug(`Found ${entries.length} entries in directory`);

		for (const entry of entries) {
			const entryUri = dirUri.endsWith('/') ? `${dirUri}${entry}` : `${dirUri}/${entry}`;

			try {
				const info = await FileSystem.getInfoAsync(entryUri);

				if (!info.exists) continue;

				if (info.isDirectory) {
					if (recursive) {
						await _scanDirectoryRecursive(entryUri, results, recursive, options);
					}
				} else {
					const extension = _getExtensionFromUri(entryUri);
					if (extension) {
						options?.onProgress?.(results.length + 1, entry);

						const fileInfo = await FileSystem.getInfoAsync(entryUri);
						const size = fileInfo.exists && 'size' in fileInfo ? (fileInfo.size as number) : 0;
						const modTime =
							fileInfo.exists && 'modificationTime' in fileInfo
								? (fileInfo.modificationTime as number) * 1000
								: Date.now();

						results.push({
							uri: entryUri,
							name: entry,
							size,
							modifiedTime: modTime,
							extension,
						});
					}
				}
			} catch (entryError) {
				logger.warn(`Failed to process file: ${entryUri}`, entryError instanceof Error ? entryError : undefined);
				continue;
			}
		}
	} catch (error) {
		logger.error(`Failed to read directory: ${dirUri}`, error instanceof Error ? error : undefined);
	}
}

function _getExtensionFromUri(uri: string, mimeType?: string | null): AudioFileType | null {
	// Try mime type first
	if (mimeType) {
		const extFromMime = MIME_TYPE_MAP[mimeType.toLowerCase()];
		if (extFromMime) return extFromMime;
	}

	// Fall back to extension
	const match = uri.match(/\.([a-zA-Z0-9]+)$/);
	if (!match) return null;

	const ext = match[1].toLowerCase() as AudioFileType;
	if (SUPPORTED_EXTENSIONS.includes(ext)) {
		return ext;
	}

	return null;
}

function _getFileNameFromUri(uri: string): string {
	const decoded = decodeURIComponent(uri);
	const parts = decoded.split('/');
	return parts[parts.length - 1] || 'Unknown';
}

export async function checkFolderAccess(folderUri: string): AsyncResult<boolean, Error> {
	try {
		const info = await FileSystem.getInfoAsync(folderUri);
		return ok(info.exists && info.isDirectory);
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Cannot access folder: ${String(error)}`)
		);
	}
}

export async function getFileInfo(
	fileUri: string
): AsyncResult<{ size: number; modifiedTime: number }, Error> {
	try {
		const info = await FileSystem.getInfoAsync(fileUri);

		if (!info.exists) {
			return err(new Error('File does not exist'));
		}

		const size = 'size' in info ? (info.size as number) : 0;
		const modTime =
			'modificationTime' in info ? (info.modificationTime as number) * 1000 : Date.now();

		return ok({ size, modifiedTime: modTime });
	} catch (error) {
		return err(
			error instanceof Error ? error : new Error(`Failed to get file info: ${String(error)}`)
		);
	}
}
