import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackId } from '@domain/value-objects/track-id';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import { createStreamingOperations } from '@plugins/metadata/youtube-music/streaming';
import type { ClientManager } from '@plugins/metadata/youtube-music/client';
import { checkCache } from '@plugins/metadata/youtube-music/cache-operations';
import { downloadToCache } from '@plugins/metadata/youtube-music/download-operations';
import { tryMultipleClientTypes } from '@plugins/metadata/youtube-music/adaptive-format-operations';
import { tryHlsStream, rewriteHlsManifest } from '@plugins/metadata/youtube-music/hls-operations';

vi.mock('@plugins/metadata/youtube-music/cache-operations', () => ({
	checkCache: vi.fn(),
}));

vi.mock('@plugins/metadata/youtube-music/download-operations', () => ({
	downloadToCache: vi.fn(),
}));

vi.mock('@plugins/metadata/youtube-music/hls-operations', () => ({
	tryHlsStream: vi.fn(),
	downloadHlsToCache: vi.fn(),
	rewriteHlsManifest: vi.fn(),
}));

vi.mock('@plugins/metadata/youtube-music/adaptive-format-operations', () => ({
	tryMultipleClientTypes: vi.fn(),
}));

const mockCheckCache = vi.mocked(checkCache);
const mockDownloadToCache = vi.mocked(downloadToCache);
const mockTryMultipleClientTypes = vi.mocked(tryMultipleClientTypes);
const mockTryHlsStream = vi.mocked(tryHlsStream);
const mockRewriteHlsManifest = vi.mocked(rewriteHlsManifest);

const TRACK_ID = TrackId.create('youtube-music', 'abc123');

const DIRECT_STREAM = createAudioStream({
	url: 'https://rr3---sn-example.googlevideo.com/videoplayback?itag=140',
	format: 'm4a',
	quality: 'high',
	headers: { 'User-Agent': 'test-agent' },
});

const DASH_STREAM = createAudioStream({
	url: 'file:///cache/audio/abc123.mpd',
	format: 'dash',
	quality: 'high',
});

function createMockClientManager(): ClientManager {
	return {
		getClient: vi.fn().mockResolvedValue({}),
		createFreshClient: vi.fn().mockResolvedValue({}),
		refreshAuth: vi.fn().mockResolvedValue(undefined),
		destroy: vi.fn(),
		isInitialized: vi.fn().mockReturnValue(true),
		getCookies: vi.fn().mockResolvedValue(undefined),
	};
}

describe('createStreamingOperations', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCheckCache.mockResolvedValue(null);
		mockDownloadToCache.mockResolvedValue(null);
		mockTryHlsStream.mockResolvedValue(null);
	});

	describe('getStreamUrl (playback path)', () => {
		it('should return DASH manifest stream when the adaptive format provides one', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({
				result: { stream: DIRECT_STREAM, contentLength: 1000, dashStream: DASH_STREAM },
				loginRequired: false,
			});
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(result.success && result.data.url).toBe(DASH_STREAM.url);
		});

		it('should try the ANDROID_VR client first when resolving playback streams', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({
				result: { stream: DIRECT_STREAM, dashStream: DASH_STREAM },
				loginRequired: false,
			});
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(mockTryMultipleClientTypes).toHaveBeenCalledWith(
				expect.anything(),
				'abc123',
				'high',
				['ANDROID_VR', 'IOS'],
				undefined,
				true
			);
		});

		it('should not request a DASH manifest on the download path', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({
				result: { stream: DIRECT_STREAM, contentLength: 1000 },
				loginRequired: false,
			});
			mockDownloadToCache.mockResolvedValue('file:///cache/audio/abc123.m4a');
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			await ops.getStreamUrl(TRACK_ID, { preferDownloadable: true });

			// Assert
			expect(mockTryMultipleClientTypes).toHaveBeenCalledWith(
				expect.anything(),
				'abc123',
				'high',
				['ANDROID_VR', 'IOS'],
				undefined,
				false
			);
		});

		it('should download to cache when the adaptive format has no DASH manifest', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({
				result: { stream: DIRECT_STREAM, contentLength: 1000 },
				loginRequired: false,
			});
			mockDownloadToCache.mockResolvedValue('file:///cache/audio/abc123.m4a');
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(result.success && result.data.url).toBe('file:///cache/audio/abc123.m4a');
		});

		it('should fall back to HLS when no adaptive format is available', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({ result: null, loginRequired: false });
			mockTryHlsStream.mockResolvedValueOnce('https://example.com/manifest.m3u8');
			mockRewriteHlsManifest.mockResolvedValue('file:///cache/abc123/playlist.m3u8');
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(result.success && result.data.format).toBe('hls');
		});

		it('should return error when neither adaptive formats nor HLS are available', async () => {
			// Arrange
			mockTryMultipleClientTypes.mockResolvedValue({ result: null, loginRequired: false });
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(!result.success && result.error.message).toContain(
				'No streaming data available'
			);
		});

		it('should retry with unauthenticated client when cookies are bot-flagged', async () => {
			// Arrange
			const clientManager = createMockClientManager();
			mockTryMultipleClientTypes
				.mockResolvedValueOnce({ result: null, loginRequired: true })
				.mockResolvedValueOnce({
					result: { stream: DIRECT_STREAM, dashStream: DASH_STREAM },
					loginRequired: false,
				});
			const ops = createStreamingOperations(clientManager);

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(clientManager.createFreshClient).toHaveBeenCalledWith({ skipAuth: true });
			expect(result.success).toBe(true);
		});

		it('should return cached file stream when the track is already cached', async () => {
			// Arrange
			mockCheckCache.mockResolvedValue({ path: 'file:///cache/abc123.m4a', format: 'm4a' });
			const ops = createStreamingOperations(createMockClientManager());

			// Act
			const result = await ops.getStreamUrl(TRACK_ID);

			// Assert
			expect(result.success && result.data.url).toBe('file:///cache/abc123.m4a');
			expect(mockTryMultipleClientTypes).not.toHaveBeenCalled();
		});
	});
});
