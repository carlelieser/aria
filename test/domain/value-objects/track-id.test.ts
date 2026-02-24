import { describe, it, expect } from 'vitest';
import { TrackId, isValidTrackIdString, getTrackIdString } from '@domain/value-objects/track-id';

describe('TrackId', () => {
	describe('create', () => {
		it('should create TrackId from source type and source id', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(trackId.value).toBe('youtube-music:abc123');
			expect(trackId.sourceType).toBe('youtube-music');
			expect(trackId.sourceId).toBe('abc123');
		});

		it('should handle local-file source type', () => {
			const trackId = TrackId.create('local-file', '/path/to/file.mp3');
			expect(trackId.value).toBe('local-file:/path/to/file.mp3');
			expect(trackId.sourceType).toBe('local-file');
			expect(trackId.sourceId).toBe('/path/to/file.mp3');
		});

		it('should handle spotify source type', () => {
			const trackId = TrackId.create('spotify', 'track123');
			expect(trackId.sourceType).toBe('spotify');
		});

		it('should handle custom source types', () => {
			const trackId = TrackId.create('custom-source', 'id123');
			expect(trackId.sourceType).toBe('custom-source');
		});
	});

	describe('fromString', () => {
		it('should return success result when parsing valid string with colon separator', () => {
			const result = TrackId.fromString('youtube-music:video123');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceType).toBe('youtube-music');
				expect(result.data.sourceId).toBe('video123');
			}
		});

		it('should handle source id with colons', () => {
			const result = TrackId.fromString('local-file:/path:with:colons');
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceType).toBe('local-file');
				expect(result.data.sourceId).toBe('/path:with:colons');
			}
		});

		it('should return error result when string has no colon', () => {
			const result = TrackId.fromString('invalid');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Invalid TrackId format');
			}
		});

		it('should return error result when source type is empty', () => {
			const result = TrackId.fromString(':sourceId');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Both source and id are required');
			}
		});

		it('should return error result when source id is empty', () => {
			const result = TrackId.fromString('sourceType:');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Both source and id are required');
			}
		});

		it('should return error result when string is empty', () => {
			const result = TrackId.fromString('');
			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Invalid TrackId format');
			}
		});
	});

	describe('tryFromString', () => {
		it('should return TrackId on valid input', () => {
			const trackId = TrackId.tryFromString('youtube-music:abc123');
			expect(trackId).not.toBeNull();
			expect(trackId?.sourceType).toBe('youtube-music');
		});

		it('should return null on invalid input', () => {
			const trackId = TrackId.tryFromString('invalid');
			expect(trackId).toBeNull();
		});

		it('should return null on empty string', () => {
			expect(TrackId.tryFromString('')).toBeNull();
		});
	});

	describe('equals', () => {
		it('should return true for equal TrackIds', () => {
			const id1 = TrackId.create('youtube-music', 'abc123');
			const id2 = TrackId.create('youtube-music', 'abc123');
			expect(id1.equals(id2)).toBe(true);
		});

		it('should return false for different source types', () => {
			const id1 = TrackId.create('youtube-music', 'abc123');
			const id2 = TrackId.create('spotify', 'abc123');
			expect(id1.equals(id2)).toBe(false);
		});

		it('should return false for different source ids', () => {
			const id1 = TrackId.create('youtube-music', 'abc123');
			const id2 = TrackId.create('youtube-music', 'xyz789');
			expect(id1.equals(id2)).toBe(false);
		});
	});

	describe('isFromSource', () => {
		it('should return true for matching source type', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(trackId.isFromSource('youtube-music')).toBe(true);
		});

		it('should return false for non-matching source type', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(trackId.isFromSource('spotify')).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the full value string', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(trackId.toString()).toBe('youtube-music:abc123');
		});
	});

	describe('toJSON', () => {
		it('should return the full value string for JSON serialization', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(trackId.toJSON()).toBe('youtube-music:abc123');
		});

		it('should serialize correctly with JSON.stringify', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			const json = JSON.stringify({ id: trackId });
			expect(json).toBe('{"id":"youtube-music:abc123"}');
		});
	});

	describe('Immutability', () => {
		it('should be frozen', () => {
			const trackId = TrackId.create('youtube-music', 'abc123');
			expect(Object.isFrozen(trackId)).toBe(true);
		});
	});
});

describe('isValidTrackIdString', () => {
	it('should return true for valid track id string', () => {
		expect(isValidTrackIdString('youtube-music:abc123')).toBe(true);
	});

	it('should return false for string without colon', () => {
		expect(isValidTrackIdString('invalid')).toBe(false);
	});

	it('should return false for string starting with colon', () => {
		expect(isValidTrackIdString(':abc123')).toBe(false);
	});

	it('should return false for string ending with colon', () => {
		expect(isValidTrackIdString('youtube:')).toBe(false);
	});

	it('should return false for non-string values', () => {
		expect(isValidTrackIdString(123)).toBe(false);
		expect(isValidTrackIdString(null)).toBe(false);
		expect(isValidTrackIdString(undefined)).toBe(false);
		expect(isValidTrackIdString({})).toBe(false);
	});
});

describe('getTrackIdString', () => {
	it('should extract value from TrackId instance', () => {
		const trackId = TrackId.create('youtube-music', 'abc123');
		expect(getTrackIdString(trackId)).toBe('youtube-music:abc123');
	});

	it('should return plain string as-is', () => {
		expect(getTrackIdString('youtube-music:abc123')).toBe('youtube-music:abc123');
	});
});
