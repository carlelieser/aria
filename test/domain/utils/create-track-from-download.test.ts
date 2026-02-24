import { describe, it, expect } from 'vitest';
import {
	createTrackFromDownloadInfo,
	createTrackFromDownloadedMetadata,
} from '@domain/utils/create-track-from-download';
import { Duration } from '@domain/value-objects/duration';
import type { DownloadInfo, DownloadedTrackMetadata } from '@domain/value-objects/download-state';

function makeDownloadInfo(overrides: Partial<DownloadInfo> = {}): DownloadInfo {
	return {
		trackId: 'youtube-music:abc123',
		status: 'completed',
		progress: 100,
		title: 'Test Song',
		artistName: 'Test Artist',
		...overrides,
	};
}

function makeDownloadedMetadata(
	overrides: Partial<DownloadedTrackMetadata> = {}
): DownloadedTrackMetadata {
	return {
		trackId: 'youtube-music:abc123',
		filePath: '/downloads/song.mp3',
		fileSize: 5_000_000,
		downloadedAt: Date.now(),
		sourcePlugin: 'youtube-music',
		format: 'mp3',
		title: 'Test Song',
		artistName: 'Test Artist',
		...overrides,
	};
}

describe('create-track-from-download', () => {
	describe('createTrackFromDownloadInfo', () => {
		it('should create track with correct title', () => {
			const info = makeDownloadInfo({ title: 'My Song' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.title).toBe('My Song');
		});

		it('should create track with artist from download info', () => {
			const info = makeDownloadInfo({ artistName: 'Great Artist' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.artists).toHaveLength(1);
			expect(track.artists[0].name).toBe('Great Artist');
		});

		it('should create track with zero duration', () => {
			const info = makeDownloadInfo();

			const track = createTrackFromDownloadInfo(info);

			expect(track.duration.equals(Duration.ZERO)).toBe(true);
		});

		it('should parse track id from valid trackId string', () => {
			const info = makeDownloadInfo({ trackId: 'youtube-music:abc123' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.id.sourceType).toBe('youtube-music');
			expect(track.id.sourceId).toBe('abc123');
		});

		it('should handle invalid track id format by using unknown source', () => {
			const info = makeDownloadInfo({ trackId: 'invalid-no-colon' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.id.sourceType).toBe('unknown');
			expect(track.id.sourceId).toBe('invalid-no-colon');
		});

		it('should create artwork when artworkUrl is provided', () => {
			const info = makeDownloadInfo({ artworkUrl: 'https://example.com/art.jpg' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.artwork).toHaveLength(1);
			expect(track.artwork![0].url).toBe('https://example.com/art.jpg');
		});

		it('should not create artwork when artworkUrl is undefined', () => {
			const info = makeDownloadInfo({ artworkUrl: undefined });

			const track = createTrackFromDownloadInfo(info);

			expect(track.artwork).toBeUndefined();
		});

		it('should create album reference when albumId and albumName are provided', () => {
			const info = makeDownloadInfo({ albumId: 'alb-1', albumName: 'My Album' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.album).toBeDefined();
			expect(track.album!.id).toBe('alb-1');
			expect(track.album!.name).toBe('My Album');
		});

		it('should not create album reference when albumId is missing', () => {
			const info = makeDownloadInfo({ albumId: undefined, albumName: 'My Album' });

			const track = createTrackFromDownloadInfo(info);

			expect(track.album).toBeUndefined();
		});

		it('should not create album reference when albumName is missing', () => {
			const info = makeDownloadInfo({ albumId: 'alb-1', albumName: undefined });

			const track = createTrackFromDownloadInfo(info);

			expect(track.album).toBeUndefined();
		});
	});

	describe('createTrackFromDownloadedMetadata', () => {
		it('should create track with correct title', () => {
			const metadata = makeDownloadedMetadata({ title: 'Downloaded Song' });

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.title).toBe('Downloaded Song');
		});

		it('should create track with artist from metadata', () => {
			const metadata = makeDownloadedMetadata({ artistName: 'Artist X' });

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.artists[0].name).toBe('Artist X');
		});

		it('should create track with zero duration', () => {
			const metadata = makeDownloadedMetadata();

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.duration.equals(Duration.ZERO)).toBe(true);
		});

		it('should use sourcePlugin from metadata when available', () => {
			const metadata = makeDownloadedMetadata({
				trackId: 'youtube-music:xyz',
				sourcePlugin: 'youtube-music',
			});

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.source.type).toBe('streaming');
		});

		it('should parse track id from valid trackId string', () => {
			const metadata = makeDownloadedMetadata({ trackId: 'spotify:track123' });

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.id.sourceType).toBe('spotify');
			expect(track.id.sourceId).toBe('track123');
		});

		it('should handle invalid track id format by using unknown source', () => {
			const metadata = makeDownloadedMetadata({ trackId: 'no-colon-id' });

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.id.sourceType).toBe('unknown');
		});

		it('should create artwork when artworkUrl is provided', () => {
			const metadata = makeDownloadedMetadata({
				artworkUrl: 'https://example.com/cover.jpg',
			});

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.artwork).toHaveLength(1);
			expect(track.artwork![0].url).toBe('https://example.com/cover.jpg');
		});

		it('should create album reference when albumId and albumName are provided', () => {
			const metadata = makeDownloadedMetadata({
				albumId: 'album-1',
				albumName: 'Great Album',
			});

			const track = createTrackFromDownloadedMetadata(metadata);

			expect(track.album).toBeDefined();
			expect(track.album!.name).toBe('Great Album');
		});
	});
});
