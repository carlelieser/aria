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
			logger.debug(`Got stream URL for download: ${audioStream.url.substring(0, 50)}...`);
			logger.debug(`Stream headers present: ${!!audioStream.headers}`);

			const downloadResult = await downloadAudioFile(
				audioStream.url,
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

			const metadata = createDownloadedTrackMetadata({
				trackId,
				filePath: downloadResult.data.filePath,
				fileSize: downloadResult.data.fileSize,
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

		// Request downloadable format (not HLS) for downloads
		const streamOptions = { preferDownloadable: true };

		if (supportingProvider) {
			logger.debug('Found supporting provider:', supportingProvider.manifest.id);
			const result = await supportingProvider.getStreamUrl(track.id, streamOptions);

			if (result.success) {
				return ok({
					url: result.data.url,
					format: result.data.format,
					headers: result.data.headers,
				});
			}

			logger.debug('getStreamUrl failed:', result.error);
		}

		for (const provider of this.audioSourceProviders) {
			if (provider === supportingProvider) continue;

			try {
				if (provider.supportsTrack(track)) {
					const result = await provider.getStreamUrl(track.id, streamOptions);

					if (result.success) {
						return ok({
							url: result.data.url,
							format: result.data.format,
							headers: result.data.headers,
						});
					}
				}
			} catch {}
		}

		return err(new Error(`No audio source available for track: ${track.title}`));
	}
}

export const downloadService = new DownloadService();
