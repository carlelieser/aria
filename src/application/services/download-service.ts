import * as FileSystem from 'expo-file-system/legacy';
import type { Track } from '../../domain/entities/track';
import { getArtistNames } from '../../domain/entities/track';
import { getLargestArtwork } from '../../domain/value-objects/artwork';
import type { AudioSourceProvider } from '../../plugins/core/interfaces/audio-source-provider';
import { createDownloadedTrackMetadata } from '../../domain/value-objects/download-state';
import { useDownloadStore } from '../state/download-store';
import {
	downloadAudioFile,
	deleteAudioFile,
	getFileInfo,
	getDownloadFilePath,
	getDownloadsDirectory,
} from '../../infrastructure/filesystem/download-manager';
import type { Result } from '../../shared/types/result';
import { ok, err } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('DownloadService');

const MAX_CONCURRENT_DOWNLOADS = 3;

export class DownloadService {
	private audioSourceProviders: AudioSourceProvider[] = [];
	private activeDownloads: Map<string, boolean> = new Map();

	setAudioSourceProviders(providers: AudioSourceProvider[]): void {
		this.audioSourceProviders = providers;
	}

	addAudioSourceProvider(provider: AudioSourceProvider): void {
		if (!this.audioSourceProviders.includes(provider)) {
			this.audioSourceProviders.push(provider);
		}
	}

	removeAudioSourceProvider(providerId: string): void {
		this.audioSourceProviders = this.audioSourceProviders.filter(
			(p) => p.manifest.id !== providerId
		);
	}

	async downloadTrack(track: Track): Promise<Result<void, Error>> {
		const trackId = track.id.value;
		const store = useDownloadStore.getState();

		if (store.isDownloaded(trackId)) {
			logger.debug(`Track ${trackId} already downloaded`);
			return ok(undefined);
		}

		if (store.isDownloading(trackId) || this.activeDownloads.get(trackId)) {
			logger.debug(`Track ${trackId} already downloading`);
			return ok(undefined);
		}

		if (store.getActiveDownloadsCount() >= MAX_CONCURRENT_DOWNLOADS) {
			return err(new Error('Too many concurrent downloads. Please wait for one to finish.'));
		}

		const artwork = getLargestArtwork(track.artwork);
		this.activeDownloads.set(trackId, true);
		store.startDownload(trackId, {
			title: track.title,
			artistName: getArtistNames(track),
			artworkUrl: artwork?.url,
		});

		try {
			const streamResult = await this._getAudioStream(track);

			if (!streamResult.success) {
				store.failDownload(trackId, streamResult.error.message);
				this.activeDownloads.delete(trackId);
				return err(streamResult.error);
			}

			const audioStream = streamResult.data;
			const format = audioStream.format ?? 'm4a';
			const sourceUrl = audioStream.url;
			logger.debug(`Got stream URL for download: ${sourceUrl.substring(0, 50)}...`);

			let filePath: string;
			let fileSize: number;

			// Check if this is a local cached file (from HLS download or adaptive cache)
			const isLocalFile = sourceUrl.startsWith('file://') || sourceUrl.startsWith('/');

			if (isLocalFile) {
				logger.debug('Source is a local cached file, copying to downloads...');
				store.updateProgress(trackId, 50);

				// Ensure downloads directory exists
				await getDownloadsDirectory();

				// Copy the cached file to permanent downloads location
				const destPath = getDownloadFilePath(trackId, format);

				// Normalize source path - copyAsync needs file:// URI
				const sourcePath = sourceUrl.startsWith('file://')
					? sourceUrl
					: `file://${sourceUrl}`;

				logger.debug(`Copying from: ${sourcePath}`);
				logger.debug(`Copying to: ${destPath}`);

				// Check if source exists first
				const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
				if (!sourceInfo.exists) {
					logger.error(`Source file does not exist: ${sourcePath}`);
					store.failDownload(trackId, 'Cached file not found');
					this.activeDownloads.delete(trackId);
					return err(new Error('Cached file not found'));
				}

				logger.debug(
					`Source file size: ${'size' in sourceInfo ? sourceInfo.size : 'unknown'}`
				);

				await FileSystem.copyAsync({
					from: sourcePath,
					to: destPath,
				});

				const fileInfo = await FileSystem.getInfoAsync(destPath);
				if (!fileInfo.exists || !('size' in fileInfo)) {
					store.failDownload(trackId, 'Failed to copy cached file');
					this.activeDownloads.delete(trackId);
					return err(new Error('Failed to copy cached file'));
				}

				filePath = destPath;
				fileSize = fileInfo.size as number;
				logger.debug(`Copy complete, size: ${fileSize}`);
				store.updateProgress(trackId, 100);
			} else {
				// Download from remote URL
				logger.debug(`Stream headers present: ${!!audioStream.headers}`);

				const downloadResult = await downloadAudioFile(
					sourceUrl,
					trackId,
					(progress) => {
						store.updateProgress(trackId, progress);
					},
					audioStream.headers,
					format
				);

				if (!downloadResult.success) {
					store.failDownload(trackId, downloadResult.error.message);
					this.activeDownloads.delete(trackId);
					return err(downloadResult.error);
				}

				filePath = downloadResult.data.filePath;
				fileSize = downloadResult.data.fileSize;
			}

			const metadata = createDownloadedTrackMetadata({
				trackId,
				filePath,
				fileSize,
				sourcePlugin: track.id.sourceType,
				format,
				title: track.title,
				artistName: getArtistNames(track),
				artworkUrl: artwork?.url,
			});

			store.completeDownload(trackId, metadata);
			this.activeDownloads.delete(trackId);

			logger.info(`Download complete: ${track.title}`);
			return ok(undefined);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			store.failDownload(trackId, errorMessage);
			this.activeDownloads.delete(trackId);
			return err(error instanceof Error ? error : new Error(errorMessage));
		}
	}

	async removeDownload(trackId: string): Promise<Result<void, Error>> {
		const store = useDownloadStore.getState();
		const metadata = store.getDownloadedTrack(trackId);

		if (!metadata) {
			return ok(undefined);
		}

		const deleteResult = await deleteAudioFile(metadata.filePath);

		if (!deleteResult.success) {
			logger.warn(`Failed to delete file: ${deleteResult.error.message}`);
		}

		store.removeDownload(trackId);

		logger.info(`Download removed: ${trackId}`);
		return ok(undefined);
	}

	isDownloaded(trackId: string): boolean {
		return useDownloadStore.getState().isDownloaded(trackId);
	}

	isDownloading(trackId: string): boolean {
		return (
			useDownloadStore.getState().isDownloading(trackId) ||
			this.activeDownloads.get(trackId) === true
		);
	}

	getLocalFilePath(trackId: string): string | null {
		return useDownloadStore.getState().getLocalFilePath(trackId);
	}

	getDownloadedTrackMetadata(trackId: string) {
		return useDownloadStore.getState().getDownloadedTrack(trackId);
	}

	async verifyDownload(trackId: string): Promise<boolean> {
		const filePath = this.getLocalFilePath(trackId);

		if (!filePath) {
			return false;
		}

		const fileInfo = await getFileInfo(filePath);

		if (!fileInfo.exists) {
			useDownloadStore.getState().removeDownload(trackId);
			return false;
		}

		return true;
	}

	private async _getAudioStream(
		track: Track
	): Promise<Result<{ url: string; format?: string; headers?: Record<string, string> }, Error>> {
		logger.debug('Getting audio stream for download:', track.title);
		logger.debug('Available providers:', this.audioSourceProviders.length);

		const supportingProvider = this.audioSourceProviders.find((p) => {
			const supports = p.supportsTrack(track);
			logger.debug(`Provider ${p.manifest.id} supportsTrack: ${supports}`);
			return supports;
		});

		if (!supportingProvider) {
			return err(new Error(`No audio source provider for track: ${track.title}`));
		}

		// First, try to get a downloadable format (direct URL, not HLS)
		logger.debug('Trying downloadable format...');
		const downloadableResult = await supportingProvider.getStreamUrl(track.id, {
			preferDownloadable: true,
		});

		if (downloadableResult.success) {
			const url = downloadableResult.data.url;
			// Check if it's a local file (already cached) or a remote URL
			if (url.startsWith('file://') || url.startsWith('/')) {
				logger.debug('Got cached local file for download');
				return ok({
					url: downloadableResult.data.url,
					format: downloadableResult.data.format,
					headers: downloadableResult.data.headers,
				});
			}
			logger.debug('Got remote URL for download');
			return ok({
				url: downloadableResult.data.url,
				format: downloadableResult.data.format,
				headers: downloadableResult.data.headers,
			});
		}

		logger.debug('Downloadable format failed, trying streaming fallback...');

		// Fallback: use regular streaming path which may cache the file
		const streamResult = await supportingProvider.getStreamUrl(track.id);

		if (streamResult.success) {
			const url = streamResult.data.url;

			// If it's a local cached file, we can use it directly
			if (url.startsWith('file://') || url.startsWith('/')) {
				logger.debug('Streaming fallback returned cached file');
				return ok({
					url: streamResult.data.url,
					format: streamResult.data.format,
					headers: streamResult.data.headers,
				});
			}

			// Try to use whatever URL we got
			logger.debug('Streaming fallback returned URL');
			return ok({
				url: streamResult.data.url,
				format: streamResult.data.format,
				headers: streamResult.data.headers,
			});
		}

		return err(new Error(`No audio source available for track: ${track.title}`));
	}
}

export const downloadService = new DownloadService();
