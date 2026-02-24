import { describe, it, expect } from 'vitest';
import { AlbumId, isValidAlbumIdString, getAlbumIdString } from '@domain/value-objects/album-id';

describe('AlbumId', () => {
	describe('create', () => {
		it('should create album id with correct value format', () => {
			const albumId = AlbumId.create('youtube-music', 'abc123');

			expect(albumId.value).toBe('youtube-music:abc123');
		});

		it('should set sourceType correctly', () => {
			const albumId = AlbumId.create('spotify', 'xyz');

			expect(albumId.sourceType).toBe('spotify');
		});

		it('should set sourceId correctly', () => {
			const albumId = AlbumId.create('youtube-music', 'abc123');

			expect(albumId.sourceId).toBe('abc123');
		});

		it('should be frozen', () => {
			const albumId = AlbumId.create('youtube-music', 'abc123');

			expect(Object.isFrozen(albumId)).toBe(true);
		});
	});

	describe('fromString', () => {
		it('should return success result for valid album id string', () => {
			const result = AlbumId.fromString('youtube-music:abc123');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceType).toBe('youtube-music');
				expect(result.data.sourceId).toBe('abc123');
				expect(result.data.value).toBe('youtube-music:abc123');
			}
		});

		it('should handle source id with colons', () => {
			const result = AlbumId.fromString('spotify:album:abc123');

			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.data.sourceType).toBe('spotify');
				expect(result.data.sourceId).toBe('album:abc123');
			}
		});

		it('should return error result on string without colon', () => {
			const result = AlbumId.fromString('nocolon');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Invalid AlbumId format');
			}
		});

		it('should return error result on string with colon at start', () => {
			const result = AlbumId.fromString(':abc');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Both source and id are required');
			}
		});

		it('should return error result on string with colon at end', () => {
			const result = AlbumId.fromString('source:');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Both source and id are required');
			}
		});

		it('should return error result on empty string', () => {
			const result = AlbumId.fromString('');

			expect(result.success).toBe(false);
			if (!result.success) {
				expect(result.error.message).toContain('Invalid AlbumId format');
			}
		});
	});

	describe('tryFromString', () => {
		it('should return AlbumId on valid input', () => {
			const albumId = AlbumId.tryFromString('youtube-music:abc123');

			expect(albumId).not.toBeNull();
			expect(albumId?.sourceType).toBe('youtube-music');
		});

		it('should return null on invalid input', () => {
			const albumId = AlbumId.tryFromString('invalid');

			expect(albumId).toBeNull();
		});

		it('should return null on empty string', () => {
			const albumId = AlbumId.tryFromString('');

			expect(albumId).toBeNull();
		});
	});

	describe('equals', () => {
		it('should return true for equal album ids', () => {
			const a = AlbumId.create('youtube-music', 'abc123');
			const b = AlbumId.create('youtube-music', 'abc123');

			expect(a.equals(b)).toBe(true);
		});

		it('should return false for different album ids', () => {
			const a = AlbumId.create('youtube-music', 'abc123');
			const b = AlbumId.create('youtube-music', 'xyz789');

			expect(a.equals(b)).toBe(false);
		});

		it('should return false for different source types', () => {
			const a = AlbumId.create('youtube-music', 'abc123');
			const b = AlbumId.create('spotify', 'abc123');

			expect(a.equals(b)).toBe(false);
		});
	});

	describe('isFromSource', () => {
		it('should return true when source type matches', () => {
			const albumId = AlbumId.create('spotify', 'abc123');

			expect(albumId.isFromSource('spotify')).toBe(true);
		});

		it('should return false when source type does not match', () => {
			const albumId = AlbumId.create('spotify', 'abc123');

			expect(albumId.isFromSource('youtube-music')).toBe(false);
		});
	});

	describe('toString', () => {
		it('should return the value string', () => {
			const albumId = AlbumId.create('youtube-music', 'abc123');

			expect(albumId.toString()).toBe('youtube-music:abc123');
		});
	});

	describe('toJSON', () => {
		it('should return the value string', () => {
			const albumId = AlbumId.create('youtube-music', 'abc123');

			expect(albumId.toJSON()).toBe('youtube-music:abc123');
		});

		it('should serialize correctly with JSON.stringify', () => {
			const albumId = AlbumId.create('spotify', 'xyz');
			const json = JSON.stringify({ id: albumId });

			expect(json).toBe('{"id":"spotify:xyz"}');
		});
	});
});

describe('isValidAlbumIdString', () => {
	it('should return true for valid album id string', () => {
		expect(isValidAlbumIdString('youtube-music:abc123')).toBe(true);
	});

	it('should return false for string without colon', () => {
		expect(isValidAlbumIdString('nocolon')).toBe(false);
	});

	it('should return false for string with colon at start', () => {
		expect(isValidAlbumIdString(':abc')).toBe(false);
	});

	it('should return false for string with colon at end', () => {
		expect(isValidAlbumIdString('source:')).toBe(false);
	});

	it('should return false for non-string values', () => {
		expect(isValidAlbumIdString(42)).toBe(false);
		expect(isValidAlbumIdString(null)).toBe(false);
		expect(isValidAlbumIdString(undefined)).toBe(false);
	});

	it('should return false for empty string', () => {
		expect(isValidAlbumIdString('')).toBe(false);
	});
});

describe('getAlbumIdString', () => {
	it('should return value from AlbumId instance', () => {
		const albumId = AlbumId.create('youtube-music', 'abc123');

		expect(getAlbumIdString(albumId)).toBe('youtube-music:abc123');
	});

	it('should return the string directly when given a string', () => {
		expect(getAlbumIdString('youtube-music:abc123')).toBe('youtube-music:abc123');
	});
});
