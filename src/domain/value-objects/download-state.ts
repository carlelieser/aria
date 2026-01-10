export type DownloadStatus = 'pending' | 'downloading' | 'completed' | 'failed';

export interface DownloadInfo {
	readonly trackId: string;
	readonly status: DownloadStatus;
	readonly progress: number;
	readonly filePath?: string;
	readonly fileSize?: number;
	readonly downloadedAt?: number;
	readonly error?: string;
	readonly title: string;
	readonly artistName: string;
	readonly artworkUrl?: string;
}

export interface DownloadedTrackMetadata {
	readonly trackId: string;
	readonly filePath: string;
	readonly fileSize: number;
	readonly downloadedAt: number;
	readonly sourcePlugin: string;
	readonly format: string;
	readonly title: string;
	readonly artistName: string;
	readonly artworkUrl?: string;
}

interface TrackMetadataParams {
	title: string;
	artistName: string;
	artworkUrl?: string;
}

export function createPendingDownload(
	trackId: string,
	metadata: TrackMetadataParams
): DownloadInfo {
	return Object.freeze({
		trackId,
		status: 'pending',
		progress: 0,
		title: metadata.title,
		artistName: metadata.artistName,
		artworkUrl: metadata.artworkUrl,
	});
}

export function createDownloadingInfo(existing: DownloadInfo, progress: number): DownloadInfo {
	return Object.freeze({
		...existing,
		status: 'downloading',
		progress: Math.min(100, Math.max(0, progress)),
	});
}

export function createCompletedDownload(
	existing: DownloadInfo,
	filePath: string,
	fileSize: number
): DownloadInfo {
	return Object.freeze({
		...existing,
		status: 'completed',
		progress: 100,
		filePath,
		fileSize,
		downloadedAt: Date.now(),
	});
}

export function createFailedDownload(existing: DownloadInfo, error: string): DownloadInfo {
	return Object.freeze({
		...existing,
		status: 'failed',
		progress: 0,
		error,
	});
}

interface CreateDownloadedTrackMetadataParams {
	trackId: string;
	filePath: string;
	fileSize: number;
	sourcePlugin: string;
	format: string;
	title: string;
	artistName: string;
	artworkUrl?: string;
}

export function createDownloadedTrackMetadata(
	params: CreateDownloadedTrackMetadataParams
): DownloadedTrackMetadata {
	return Object.freeze({
		trackId: params.trackId,
		filePath: params.filePath,
		fileSize: params.fileSize,
		downloadedAt: Date.now(),
		sourcePlugin: params.sourcePlugin,
		format: params.format,
		title: params.title,
		artistName: params.artistName,
		artworkUrl: params.artworkUrl,
	});
}
