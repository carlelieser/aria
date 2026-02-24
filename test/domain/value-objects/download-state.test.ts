import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createPendingDownload,
	createDownloadingInfo,
	createCompletedDownload,
	createFailedDownload,
	createDownloadedTrackMetadata,
	type DownloadInfo,
} from '@domain/value-objects/download-state';

describe('download-state', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2024, 0, 15, 12, 0, 0));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createPendingDownload', () => {
		it('should create download with pending status', () => {
			const result = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			expect(result.status).toBe('pending');
		});

		it('should set progress to 0', () => {
			const result = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			expect(result.progress).toBe(0);
		});

		it('should set track id', () => {
			const result = createPendingDownload('youtube-music:abc', {
				title: 'Song',
				artistName: 'Artist',
			});

			expect(result.trackId).toBe('youtube-music:abc');
		});

		it('should set metadata from params', () => {
			const result = createPendingDownload('track-1', {
				title: 'My Song',
				artistName: 'Great Artist',
				artworkUrl: 'https://example.com/art.jpg',
				albumId: 'album-1',
				albumName: 'My Album',
			});

			expect(result.title).toBe('My Song');
			expect(result.artistName).toBe('Great Artist');
			expect(result.artworkUrl).toBe('https://example.com/art.jpg');
			expect(result.albumId).toBe('album-1');
			expect(result.albumName).toBe('My Album');
		});

		it('should be frozen', () => {
			const result = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('createDownloadingInfo', () => {
		it('should set status to downloading', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createDownloadingInfo(existing, 50);

			expect(result.status).toBe('downloading');
		});

		it('should set progress to given value', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createDownloadingInfo(existing, 75);

			expect(result.progress).toBe(75);
		});

		it('should clamp progress to max 100', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createDownloadingInfo(existing, 150);

			expect(result.progress).toBe(100);
		});

		it('should clamp progress to min 0', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createDownloadingInfo(existing, -10);

			expect(result.progress).toBe(0);
		});

		it('should preserve existing metadata', () => {
			const existing = createPendingDownload('track-1', {
				title: 'My Song',
				artistName: 'My Artist',
			});

			const result = createDownloadingInfo(existing, 50);

			expect(result.title).toBe('My Song');
			expect(result.artistName).toBe('My Artist');
			expect(result.trackId).toBe('track-1');
		});

		it('should be frozen', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createDownloadingInfo(existing, 50);

			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('createCompletedDownload', () => {
		it('should set status to completed', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createCompletedDownload(existing, '/path/to/file.mp3', 5_000_000);

			expect(result.status).toBe('completed');
		});

		it('should set progress to 100', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createCompletedDownload(existing, '/path/to/file.mp3', 5_000_000);

			expect(result.progress).toBe(100);
		});

		it('should set filePath and fileSize', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createCompletedDownload(existing, '/downloads/song.mp3', 3_000_000);

			expect(result.filePath).toBe('/downloads/song.mp3');
			expect(result.fileSize).toBe(3_000_000);
		});

		it('should set downloadedAt timestamp', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createCompletedDownload(existing, '/path/to/file.mp3', 5_000_000);

			expect(result.downloadedAt).toBe(Date.now());
		});

		it('should be frozen', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createCompletedDownload(existing, '/path/to/file.mp3', 5_000_000);

			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('createFailedDownload', () => {
		it('should set status to failed', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createFailedDownload(existing, 'Network error');

			expect(result.status).toBe('failed');
		});

		it('should set progress to 0', () => {
			const existing: DownloadInfo = {
				...createPendingDownload('track-1', {
					title: 'Song',
					artistName: 'Artist',
				}),
				status: 'downloading',
				progress: 50,
			};

			const result = createFailedDownload(existing, 'Error');

			expect(result.progress).toBe(0);
		});

		it('should set error message', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createFailedDownload(existing, 'Connection timeout');

			expect(result.error).toBe('Connection timeout');
		});

		it('should be frozen', () => {
			const existing = createPendingDownload('track-1', {
				title: 'Song',
				artistName: 'Artist',
			});

			const result = createFailedDownload(existing, 'Error');

			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('createDownloadedTrackMetadata', () => {
		it('should create metadata with all required fields', () => {
			const result = createDownloadedTrackMetadata({
				trackId: 'youtube-music:abc',
				filePath: '/downloads/song.mp3',
				fileSize: 5_000_000,
				sourcePlugin: 'youtube-music',
				format: 'mp3',
				title: 'Test Song',
				artistName: 'Test Artist',
			});

			expect(result.trackId).toBe('youtube-music:abc');
			expect(result.filePath).toBe('/downloads/song.mp3');
			expect(result.fileSize).toBe(5_000_000);
			expect(result.sourcePlugin).toBe('youtube-music');
			expect(result.format).toBe('mp3');
			expect(result.title).toBe('Test Song');
			expect(result.artistName).toBe('Test Artist');
		});

		it('should set downloadedAt to current timestamp', () => {
			const result = createDownloadedTrackMetadata({
				trackId: 'track-1',
				filePath: '/path/to/file.mp3',
				fileSize: 1_000_000,
				sourcePlugin: 'youtube-music',
				format: 'mp3',
				title: 'Song',
				artistName: 'Artist',
			});

			expect(result.downloadedAt).toBe(Date.now());
		});

		it('should include optional fields when provided', () => {
			const result = createDownloadedTrackMetadata({
				trackId: 'track-1',
				filePath: '/path/to/file.mp3',
				fileSize: 1_000_000,
				sourcePlugin: 'youtube-music',
				format: 'mp3',
				title: 'Song',
				artistName: 'Artist',
				artworkUrl: 'https://example.com/art.jpg',
				albumId: 'album-1',
				albumName: 'My Album',
			});

			expect(result.artworkUrl).toBe('https://example.com/art.jpg');
			expect(result.albumId).toBe('album-1');
			expect(result.albumName).toBe('My Album');
		});

		it('should be frozen', () => {
			const result = createDownloadedTrackMetadata({
				trackId: 'track-1',
				filePath: '/path/to/file.mp3',
				fileSize: 1_000_000,
				sourcePlugin: 'youtube-music',
				format: 'mp3',
				title: 'Song',
				artistName: 'Artist',
			});

			expect(Object.isFrozen(result)).toBe(true);
		});
	});
});
