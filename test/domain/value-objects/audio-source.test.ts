import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createLocalSource,
	createStreamingSource,
	isLocalSource,
	isStreamingSource,
	getPlaybackUri,
	needsStreamUrlRefresh,
	updateStreamUrl,
	QualityBitrates,
	getQualityLabel,
	type LocalAudioSource,
	type StreamingAudioSource,
} from '@domain/value-objects/audio-source';

describe('AudioSource', () => {
	describe('createLocalSource', () => {
		it('should create local source with file path', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(source.type).toBe('local');
			expect(source.filePath).toBe('/path/to/song.mp3');
		});

		it('should create local source with all properties', () => {
			const source = createLocalSource('/path/to/song.flac', 'flac', 25000000);
			expect(source.type).toBe('local');
			expect(source.filePath).toBe('/path/to/song.flac');
			expect(source.fileType).toBe('flac');
			expect(source.fileSize).toBe(25000000);
		});

		it('should be frozen', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(Object.isFrozen(source)).toBe(true);
		});
	});

	describe('createStreamingSource', () => {
		it('should create streaming source with minimal properties', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(source.type).toBe('streaming');
			expect(source.sourcePlugin).toBe('youtube-music');
			expect(source.sourceId).toBe('video123');
			expect(source.isExpired).toBe(false);
		});

		it('should create streaming source with all options', () => {
			const expiresAt = Date.now() + 3600000;
			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://example.com/stream',
				quality: 'high',
				expiresAt,
			});
			expect(source.streamUrl).toBe('https://example.com/stream');
			expect(source.quality).toBe('high');
			expect(source.expiresAt).toBe(expiresAt);
		});

		it('should be frozen', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(Object.isFrozen(source)).toBe(true);
		});
	});

	describe('isLocalSource', () => {
		it('should return true for local source', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(isLocalSource(source)).toBe(true);
		});

		it('should return false for streaming source', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(isLocalSource(source)).toBe(false);
		});
	});

	describe('isStreamingSource', () => {
		it('should return true for streaming source', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(isStreamingSource(source)).toBe(true);
		});

		it('should return false for local source', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(isStreamingSource(source)).toBe(false);
		});
	});

	describe('getPlaybackUri', () => {
		it('should return file path for local source', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(getPlaybackUri(source)).toBe('/path/to/song.mp3');
		});

		it('should return stream url for valid streaming source', () => {
			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://example.com/stream',
			});
			expect(getPlaybackUri(source)).toBe('https://example.com/stream');
		});

		it('should return null for streaming source without url', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(getPlaybackUri(source)).toBeNull();
		});

		it('should return null for expired streaming source', () => {
			const expiredSource: StreamingAudioSource = {
				type: 'streaming',
				sourcePlugin: 'youtube-music',
				sourceId: 'video123',
				streamUrl: 'https://example.com/stream',
				isExpired: true,
			};
			expect(getPlaybackUri(expiredSource)).toBeNull();
		});

		describe('with time-based expiration', () => {
			beforeEach(() => {
				vi.useFakeTimers();
			});

			afterEach(() => {
				vi.useRealTimers();
			});

			it('should return null when expiresAt is in the past', () => {
				const now = Date.now();
				vi.setSystemTime(now);

				const source = createStreamingSource('youtube-music', 'video123', {
					streamUrl: 'https://example.com/stream',
					expiresAt: now - 1000,
				});
				expect(getPlaybackUri(source)).toBeNull();
			});

			it('should return url when expiresAt is in the future', () => {
				const now = Date.now();
				vi.setSystemTime(now);

				const source = createStreamingSource('youtube-music', 'video123', {
					streamUrl: 'https://example.com/stream',
					expiresAt: now + 60000,
				});
				expect(getPlaybackUri(source)).toBe('https://example.com/stream');
			});
		});
	});

	describe('needsStreamUrlRefresh', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return false for local source', () => {
			const source = createLocalSource('/path/to/song.mp3');
			expect(needsStreamUrlRefresh(source)).toBe(false);
		});

		it('should return true for streaming source without url', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			expect(needsStreamUrlRefresh(source)).toBe(true);
		});

		it('should return true for expired streaming source', () => {
			const expiredSource: StreamingAudioSource = {
				type: 'streaming',
				sourcePlugin: 'youtube-music',
				sourceId: 'video123',
				streamUrl: 'https://example.com/stream',
				isExpired: true,
			};
			expect(needsStreamUrlRefresh(expiredSource)).toBe(true);
		});

		it('should return false when url exists and not expired', () => {
			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://example.com/stream',
			});
			expect(needsStreamUrlRefresh(source)).toBe(false);
		});

		it('should return true when within 30 second buffer of expiration', () => {
			const now = Date.now();
			vi.setSystemTime(now);

			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://example.com/stream',
				expiresAt: now + 25000,
			});
			expect(needsStreamUrlRefresh(source)).toBe(true);
		});

		it('should return false when more than 30 seconds from expiration', () => {
			const now = Date.now();
			vi.setSystemTime(now);

			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://example.com/stream',
				expiresAt: now + 60000,
			});
			expect(needsStreamUrlRefresh(source)).toBe(false);
		});
	});

	describe('updateStreamUrl', () => {
		it('should update stream url and reset expired flag', () => {
			const expiredSource: StreamingAudioSource = {
				type: 'streaming',
				sourcePlugin: 'youtube-music',
				sourceId: 'video123',
				streamUrl: 'https://old.url',
				isExpired: true,
			};

			const updated = updateStreamUrl(expiredSource, 'https://new.url');
			expect(updated.streamUrl).toBe('https://new.url');
			expect(updated.isExpired).toBe(false);
		});

		it('should update expiresAt when provided', () => {
			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://old.url',
			});

			const newExpiry = Date.now() + 3600000;
			const updated = updateStreamUrl(source, 'https://new.url', newExpiry);
			expect(updated.expiresAt).toBe(newExpiry);
		});

		it('should preserve other properties', () => {
			const source = createStreamingSource('youtube-music', 'video123', {
				streamUrl: 'https://old.url',
				quality: 'high',
			});

			const updated = updateStreamUrl(source, 'https://new.url');
			expect(updated.sourcePlugin).toBe('youtube-music');
			expect(updated.sourceId).toBe('video123');
			expect(updated.quality).toBe('high');
		});

		it('should be frozen', () => {
			const source = createStreamingSource('youtube-music', 'video123');
			const updated = updateStreamUrl(source, 'https://new.url');
			expect(Object.isFrozen(updated)).toBe(true);
		});
	});

	describe('QualityBitrates', () => {
		it('should have correct bitrates for each quality level', () => {
			expect(QualityBitrates.low).toBe(64);
			expect(QualityBitrates.medium).toBe(128);
			expect(QualityBitrates.high).toBe(256);
			expect(QualityBitrates.lossless).toBe(1411);
		});
	});

	describe('getQualityLabel', () => {
		it('should return correct label for low quality', () => {
			expect(getQualityLabel('low')).toBe('Low (64 kbps)');
		});

		it('should return correct label for medium quality', () => {
			expect(getQualityLabel('medium')).toBe('Normal (128 kbps)');
		});

		it('should return correct label for high quality', () => {
			expect(getQualityLabel('high')).toBe('High (256 kbps)');
		});

		it('should return correct label for lossless quality', () => {
			expect(getQualityLabel('lossless')).toBe('Lossless');
		});
	});
});
