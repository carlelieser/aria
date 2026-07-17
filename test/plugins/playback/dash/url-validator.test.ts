import { describe, it, expect } from 'vitest';
import { canHandleUrl, isDashUrl, resolveContentType } from '@plugins/playback/dash/url-validator';

describe('isDashUrl', () => {
	it('should return true when the URL is a dash+xml data URI', () => {
		// Arrange
		const url = 'data:application/dash+xml;base64,PE1QRC8+';

		// Act
		const result = isDashUrl(url);

		// Assert
		expect(result).toBe(true);
	});

	it('should return true when the URL is a local .mpd manifest file', () => {
		// Arrange
		const url = 'file:///cache/audio/abc123.mpd';

		// Act
		const result = isDashUrl(url);

		// Assert
		expect(result).toBe(true);
	});

	it('should return false when the URL is a progressive audio stream', () => {
		// Arrange
		const url = 'https://example.googlevideo.com/videoplayback?itag=140';

		// Act
		const result = isDashUrl(url);

		// Assert
		expect(result).toBe(false);
	});
});

describe('canHandleUrl', () => {
	it('should return true when given a local .mpd manifest file', () => {
		// Arrange
		const url = 'file:///cache/audio/abc123.mpd';

		// Act
		const result = canHandleUrl(url);

		// Assert
		expect(result).toBe(true);
	});

	it('should return false when given a local audio file', () => {
		// Arrange
		const url = 'file:///cache/audio/abc123.m4a';

		// Act
		const result = canHandleUrl(url);

		// Assert
		expect(result).toBe(false);
	});
});

describe('resolveContentType', () => {
	it('should resolve to dash when given a local .mpd manifest file', () => {
		// Arrange
		const url = 'file:///cache/audio/abc123.mpd';

		// Act
		const result = resolveContentType(url);

		// Assert
		expect(result).toBe('dash');
	});

	it('should resolve to hls when given an m3u8 playlist', () => {
		// Arrange
		const url = 'file:///cache/audio/abc123_segments/playlist.m3u8';

		// Act
		const result = resolveContentType(url);

		// Assert
		expect(result).toBe('hls');
	});
});
