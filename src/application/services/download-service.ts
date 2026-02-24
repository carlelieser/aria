import type { Track } from '../../domain/entities/track';
import { getArtistNames } from '../../domain/entities/track';
import { getLargestArtwork } from '../../domain/value-objects/artwork';
import {
	canDownload,
	createDownloadedSource,
	isStreamingSource,
	type AudioSource,
	type AudioFileType,
} from '../../domain/value-objects/audio-source';
import type { AudioSourceProvider } from '../../plugins/core/interfaces/audio-source-provider';
import { createDownloadedTrackMetadata } from '../../domain/value-objects/download-state';
import { useDownloadStore } from '../state/download-store';
import {
	downloadAudioFile,
	copyToDownloads,
	copyDirectoryToDownloads,
	deleteAudioFile,
	deleteDownloadDirectory,
	getFileInfo,
} from '../../infrastructure/filesystem/download-manager';
import type { DownloadResult } from '../../infrastructure/filesystem/download-manager';
import type { Result } from '../../shared/types/result';
import { ok, err } from '../../shared/types/result';
import { getLogger } from '../../shared/services/logger';
import { libraryService } from './library-service';

const logger = getLogger('DownloadService');

const NON_DOWNLOADABLE_FORMATS = new Set(['hls']);

const BATCH_CONCURRENCY = 3;

interface AudioStreamInfo {
	readonly url: string;
	readonly format?: string;
	readonly headers?: Record<string, string>;
}

export interface BatchDownloadResult {
	readonly completed: number;
	readonly failed: number;
	readonly cancelled: boolean;
}

function isLocalPath(url: string): boolean {
	return url.startsWith('file://') || url.startsWith('/');
}

export class DownloadService {
	private audioSourceProviders: AudioSourceProvider[] = [];
	private activeDownloads: Map<string, boolean> = new Map();
	private _batchCancelled = false;

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

	canDownloadTrack(track: Track): boolean {
		const trackId = track.id.value;
		const store = useDownloadStore.getState();

		return (
			canDownload(track.source) &&
			!store.isDownloaded(trackId) &&
			!store.isDownloading(trackId) &&
			!this.activeDownloads.get(trackId)
		);
	}

	async downloadTrack(track: Track): Promise<Result<void, Error>> {
		if (!this.canDownloadTrack(track)) {
			return this._skipDownload(track);
		}

		this._enqueue(track);
		return this._executeDownload(track);
	}

	async downloadTracks(tracks: readonly Track[]): Promise<BatchDownloadResult> {
		const eligible = tracks.filter((t) => this.canDownloadTrack(t));
		if (eligible.length === 0) {
			return { completed: 0, failed: 0, cancelled: false };
		}

		for (const track of eligible) {
			this._enqueue(track);
		}

		this._batchCancelled = false;
		return this._processQueue(eligible);
	}

	cancelBatchDownload(): void {
		this._batchCancelled = true;
	}

	async removeDownload(trackId: string): Promise<Result<void, Error>> {
		const store = useDownloadStore.getState();
		const metadata = store.getDownloadedTrack(trackId);

		if (!metadata) {
			return ok(undefined);
		}

		const deleteResult =
			metadata.format === 'm3u8'
				? await deleteDownloadDirectory(metadata.filePath)
				: await deleteAudioFile(metadata.filePath);

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

	resolveTrackSource(track: Track): AudioSource {
		if (!isStreamingSource(track.source)) {
			return track.source;
		}

		const metadata = this.getDownloadedTrackMetadata(track.id.value);
		if (!metadata) {
			return track.source;
		}

		return createDownloadedSource(
			metadata.filePath,
			metadata.fileSize,
			metadata.format as AudioFileType,
			track.source
		);
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

	private _enqueue(track: Track): void {
		const trackId = track.id.value;
		const artwork = getLargestArtwork(track.artwork);

		this.activeDownloads.set(trackId, true);
		useDownloadStore.getState().startDownload(trackId, {
			title: track.title,
			artistName: getArtistNames(track),
			artworkUrl: artwork?.url,
			albumId: track.album?.id,
			albumName: track.album?.name,
		});
	}

	private async _executeDownload(track: Track): Promise<Result<void, Error>> {
		const trackId = track.id.value;
		const store = useDownloadStore.getState();

		try {
			const onProgress = (progress: number): void => {
				store.updateProgress(trackId, progress);
			};

			const streamResult = await this._getDownloadableStream(track, onProgress);
			if (!streamResult.success) {
				return this._failDownload(trackId, streamResult.error);
			}

			const fileResult = await this._acquireFile(trackId, streamResult.data, store);
			if (!fileResult.success) {
				return this._failDownload(trackId, fileResult.error);
			}

			const artwork = getLargestArtwork(track.artwork);
			this._completeDownload(
				track,
				fileResult.data,
				streamResult.data.format ?? 'm4a',
				artwork
			);
			return ok(undefined);
		} catch (error) {
			const wrapped = error instanceof Error ? error : new Error(String(error));
			return this._failDownload(trackId, wrapped);
		}
	}

	private async _processQueue(tracks: readonly Track[]): Promise<BatchDownloadResult> {
		let completed = 0;
		let failed = 0;
		let nextIndex = 0;

		const worker = async (): Promise<void> => {
			while (!this._batchCancelled) {
				const i = nextIndex++;
				if (i >= tracks.length) break;

				const result = await this._executeDownload(tracks[i]);
				if (result.success) {
					completed++;
				} else {
					failed++;
				}
			}
		};

		const workerCount = Math.min(BATCH_CONCURRENCY, tracks.length);
		await Promise.all(Array.from({ length: workerCount }, worker));

		return { completed, failed, cancelled: this._batchCancelled };
	}

	private _skipDownload(track: Track): Result<void, Error> {
		const trackId = track.id.value;

		if (!canDownload(track.source)) {
			const reason =
				track.source.type === 'local'
					? 'Local library tracks are already on device'
					: 'Track is already downloaded';
			logger.debug(`Cannot download ${trackId}: ${reason}`);
			return err(new Error(reason));
		}

		logger.debug(`Download skipped for ${trackId}: already downloaded or in progress`);
		return ok(undefined);
	}

	private _failDownload(trackId: string, error: Error): Result<void, Error> {
		useDownloadStore.getState().failDownload(trackId, error.message);
		this.activeDownloads.delete(trackId);
		return err(error);
	}

	private _completeDownload(
		track: Track,
		file: DownloadResult,
		format: string,
		artwork: ReturnType<typeof getLargestArtwork>
	): void {
		const trackId = track.id.value;
		const store = useDownloadStore.getState();

		const metadata = createDownloadedTrackMetadata({
			trackId,
			filePath: file.filePath,
			fileSize: file.fileSize,
			sourcePlugin: track.id.sourceType,
			format,
			title: track.title,
			artistName: getArtistNames(track),
			artworkUrl: artwork?.url,
			albumId: track.album?.id,
			albumName: track.album?.name,
		});

		store.completeDownload(trackId, metadata);
		this.activeDownloads.delete(trackId);

		if (!libraryService.isInLibrary(trackId)) {
			const result = libraryService.addTrack(track);
			if (result.success) {
				logger.debug(`Added to library: ${track.title}`);
			} else {
				logger.warn(`Failed to add track to library: ${result.error.message}`);
			}
		}

		logger.info(`Download complete: ${track.title}`);
	}

	private async _acquireFile(
		trackId: string,
		stream: AudioStreamInfo,
		store: ReturnType<typeof useDownloadStore.getState>
	): Promise<Result<DownloadResult, Error>> {
		const format = stream.format ?? 'm4a';

		if (isLocalPath(stream.url)) {
			if (format === 'm3u8') {
				// m3u8 manifest lives inside a segment directory — copy the whole directory
				const sourceDir = stream.url.substring(0, stream.url.lastIndexOf('/') + 1);
				const result = await copyDirectoryToDownloads(sourceDir, trackId);
				if (result.success) {
					store.updateProgress(trackId, 100);
				}
				return result;
			}

			const result = await copyToDownloads(stream.url, trackId, format);
			if (result.success) {
				store.updateProgress(trackId, 100);
			}
			return result;
		}

		return downloadAudioFile(
			stream.url,
			trackId,
			(progress) => store.updateProgress(trackId, progress),
			stream.headers,
			format
		);
	}

	private async _getDownloadableStream(
		track: Track,
		onProgress?: (progress: number) => void
	): Promise<Result<AudioStreamInfo, Error>> {
		const provider = this.audioSourceProviders.find((p) => p.supportsTrack(track));
		if (!provider) {
			return err(new Error(`No audio source provider for track: ${track.title}`));
		}

		const result = await provider.getStreamUrl(track, {
			preferDownloadable: true,
			onProgress,
		});
		if (!result.success) {
			return err(new Error(`No downloadable audio source for track: ${track.title}`));
		}

		if (NON_DOWNLOADABLE_FORMATS.has(result.data.format)) {
			return err(new Error(`No downloadable audio source for track: ${track.title}`));
		}

		return ok({
			url: result.data.url,
			format: result.data.format,
			headers: result.data.headers,
		});
	}
}

export const downloadService = new DownloadService();
