import type { DownloadInfo, DownloadedTrackMetadata } from '@domain/value-objects/download-state';
import { MOCK_TRACKS } from './tracks';

interface MockDownloadDefinition {
	trackIndex: number;
	status: 'pending' | 'downloading' | 'completed' | 'failed';
	progress?: number;
	error?: string;
	fileSize?: number;
}

const DOWNLOAD_DEFINITIONS: MockDownloadDefinition[] = [
	{ trackIndex: 0, status: 'completed', fileSize: 5_234_567 },
	{ trackIndex: 1, status: 'completed', fileSize: 6_789_012 },
	{ trackIndex: 3, status: 'completed', fileSize: 5_890_123 },
	{ trackIndex: 4, status: 'completed', fileSize: 7_345_678 },
	{ trackIndex: 6, status: 'completed', fileSize: 9_876_543 },
	{ trackIndex: 12, status: 'completed', fileSize: 7_234_567 },
	{ trackIndex: 18, status: 'completed', fileSize: 12_456_789 },
	{ trackIndex: 24, status: 'completed', fileSize: 6_123_456 },

	{ trackIndex: 2, status: 'downloading', progress: 67 },
	{ trackIndex: 5, status: 'downloading', progress: 34 },

	{ trackIndex: 7, status: 'pending' },
	{ trackIndex: 8, status: 'pending' },

	{ trackIndex: 9, status: 'failed', error: 'Network connection lost' },
	{ trackIndex: 10, status: 'failed', error: 'Storage full' },
];

function getArtworkUrl(trackIndex: number): string | undefined {
	return MOCK_TRACKS[trackIndex]?.artwork?.[0]?.url;
}

function createDownloadInfo(def: MockDownloadDefinition): DownloadInfo {
	const track = MOCK_TRACKS[def.trackIndex];
	const trackId = track.id.value;

	const base: DownloadInfo = {
		trackId,
		status: def.status,
		progress: def.progress ?? (def.status === 'completed' ? 100 : 0),
		title: track.title,
		artistName: track.artists[0]?.name ?? 'Unknown Artist',
		artworkUrl: getArtworkUrl(def.trackIndex),
	};

	if (def.status === 'completed') {
		return {
			...base,
			filePath: `/data/downloads/${trackId}.m4a`,
			fileSize: def.fileSize ?? 5_000_000,
			downloadedAt: Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000,
		};
	}

	if (def.status === 'failed') {
		return {
			...base,
			error: def.error,
		};
	}

	return base;
}

function createDownloadedMetadata(def: MockDownloadDefinition): DownloadedTrackMetadata | null {
	if (def.status !== 'completed') return null;

	const track = MOCK_TRACKS[def.trackIndex];
	const trackId = track.id.value;

	return {
		trackId,
		filePath: `/data/downloads/${trackId}.m4a`,
		fileSize: def.fileSize ?? 5_000_000,
		downloadedAt: Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000,
		sourcePlugin: 'youtube-music',
		format: 'm4a',
		title: track.title,
		artistName: track.artists[0]?.name ?? 'Unknown Artist',
		artworkUrl: getArtworkUrl(def.trackIndex),
	};
}

export const MOCK_DOWNLOADS: DownloadInfo[] = DOWNLOAD_DEFINITIONS.map(createDownloadInfo);

export const MOCK_DOWNLOADED_TRACKS: DownloadedTrackMetadata[] = DOWNLOAD_DEFINITIONS.map(
	createDownloadedMetadata
).filter((m): m is DownloadedTrackMetadata => m !== null);

export const MOCK_ACTIVE_DOWNLOADS = MOCK_DOWNLOADS.filter(
	(d) => d.status === 'pending' || d.status === 'downloading'
);

export const MOCK_COMPLETED_DOWNLOADS = MOCK_DOWNLOADS.filter((d) => d.status === 'completed');

export const MOCK_FAILED_DOWNLOADS = MOCK_DOWNLOADS.filter((d) => d.status === 'failed');
