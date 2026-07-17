import { describe, it, expect, vi, beforeEach } from 'vitest';
import { writeAsStringAsync } from 'expo-file-system/legacy';
import {
	buildAudioDashManifestXml,
	writeAudioDashManifest,
} from '@plugins/metadata/youtube-music/dash-manifest';

vi.mock('expo-file-system/legacy', () => ({
	writeAsStringAsync: vi.fn(),
	cacheDirectory: 'file:///cache/',
}));

vi.mock('@plugins/metadata/youtube-music/cache-operations', () => ({
	ensureCacheDirectory: vi.fn(),
	getCachedFilePath: vi.fn(
		(videoId: string, format: string) => `file:///cache/audio/${videoId}.${format}`
	),
}));

const BASE_PARAMS = {
	url: 'https://rr3---sn-example.googlevideo.com/videoplayback?itag=140&sig=a&other=b',
	mimeType: 'audio/mp4; codecs="mp4a.40.2"',
	bitrate: 132216,
	durationMs: 277000,
	initRange: { start: 0, end: 631 },
	indexRange: { start: 632, end: 1207 },
	audioSamplingRate: 44100,
};

describe('buildAudioDashManifestXml', () => {
	it('should build a SegmentBase manifest when the format has codec info', () => {
		// Arrange
		const params = BASE_PARAMS;

		// Act
		const xml = buildAudioDashManifestXml(params);

		// Assert
		expect(xml).toContain('<SegmentBase indexRange="632-1207"');
		expect(xml).toContain('<Initialization range="0-631"/>');
	});

	it('should escape XML special characters when the stream URL contains query parameters', () => {
		// Arrange
		const params = BASE_PARAMS;

		// Act
		const xml = buildAudioDashManifestXml(params);

		// Assert
		expect(xml).toContain('itag=140&amp;sig=a&amp;other=b</BaseURL>');
	});

	it('should return null when the mime type carries no codec information', () => {
		// Arrange
		const params = { ...BASE_PARAMS, mimeType: 'audio/mp4' };

		// Act
		const xml = buildAudioDashManifestXml(params);

		// Assert
		expect(xml).toBeNull();
	});

	it('should declare the media presentation duration in seconds when given a duration in milliseconds', () => {
		// Arrange
		const params = BASE_PARAMS;

		// Act
		const xml = buildAudioDashManifestXml(params);

		// Assert
		expect(xml).toContain('mediaPresentationDuration="PT277.000S"');
	});
});

describe('writeAudioDashManifest', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return the manifest file path when the write succeeds', async () => {
		// Arrange
		vi.mocked(writeAsStringAsync).mockResolvedValue(undefined);

		// Act
		const path = await writeAudioDashManifest('abc123', BASE_PARAMS);

		// Assert
		expect(path).toBe('file:///cache/audio/abc123.mpd');
	});

	it('should return null when writing the manifest file fails', async () => {
		// Arrange
		vi.mocked(writeAsStringAsync).mockRejectedValue(new Error('disk full'));

		// Act
		const path = await writeAudioDashManifest('abc123', BASE_PARAMS);

		// Assert
		expect(path).toBeNull();
	});

	it('should return null when the manifest cannot be built', async () => {
		// Arrange
		const params = { ...BASE_PARAMS, mimeType: 'audio/mp4' };

		// Act
		const path = await writeAudioDashManifest('abc123', params);

		// Assert
		expect(path).toBeNull();
		expect(writeAsStringAsync).not.toHaveBeenCalled();
	});
});
