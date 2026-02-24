import { describe, it, expect } from 'vitest';
import {
	generateStringHash,
	generatePrefixedHashId,
	generateLocalTrackId,
	generateLocalAlbumId,
	generateLocalArtistId,
} from '@shared/mappers/hash-utils';

describe('hash-utils', () => {
	describe('generateStringHash', () => {
		it('should return a non-empty string', () => {
			const result = generateStringHash('hello');

			expect(result).toBeTruthy();
			expect(typeof result).toBe('string');
		});

		it('should return consistent hash for same input', () => {
			const hash1 = generateStringHash('test input');
			const hash2 = generateStringHash('test input');

			expect(hash1).toBe(hash2);
		});

		it('should return different hashes for different inputs', () => {
			const hash1 = generateStringHash('input a');
			const hash2 = generateStringHash('input b');

			expect(hash1).not.toBe(hash2);
		});

		it('should handle empty string', () => {
			const result = generateStringHash('');

			expect(result).toBe('0');
		});

		it('should return base36 string', () => {
			const result = generateStringHash('test');

			expect(result).toMatch(/^[0-9a-z]+$/);
		});
	});

	describe('generatePrefixedHashId', () => {
		it('should return prefixed hash id', () => {
			const result = generatePrefixedHashId('test-input', 'prefix');

			expect(result).toMatch(/^prefix_[0-9a-z]+$/);
		});

		it('should return consistent results for same input', () => {
			const id1 = generatePrefixedHashId('test', 'p');
			const id2 = generatePrefixedHashId('test', 'p');

			expect(id1).toBe(id2);
		});

		it('should produce different ids for different prefixes', () => {
			const id1 = generatePrefixedHashId('test', 'a');
			const id2 = generatePrefixedHashId('test', 'b');

			expect(id1).not.toBe(id2);
		});
	});

	describe('generateLocalTrackId', () => {
		it('should generate id with "local" prefix', () => {
			const result = generateLocalTrackId('/path/to/song.mp3');

			expect(result).toMatch(/^local_/);
		});

		it('should return consistent id for same file path', () => {
			const id1 = generateLocalTrackId('/music/song.mp3');
			const id2 = generateLocalTrackId('/music/song.mp3');

			expect(id1).toBe(id2);
		});

		it('should return different ids for different file paths', () => {
			const id1 = generateLocalTrackId('/music/song1.mp3');
			const id2 = generateLocalTrackId('/music/song2.mp3');

			expect(id1).not.toBe(id2);
		});
	});

	describe('generateLocalAlbumId', () => {
		it('should generate id with "album" prefix', () => {
			const result = generateLocalAlbumId('My Album', 'Artist');

			expect(result).toMatch(/^album_/);
		});

		it('should be case insensitive', () => {
			const id1 = generateLocalAlbumId('My Album', 'Artist');
			const id2 = generateLocalAlbumId('my album', 'artist');

			expect(id1).toBe(id2);
		});

		it('should return different ids for different album-artist combinations', () => {
			const id1 = generateLocalAlbumId('Album A', 'Artist');
			const id2 = generateLocalAlbumId('Album B', 'Artist');

			expect(id1).not.toBe(id2);
		});

		it('should consider artist name in the hash', () => {
			const id1 = generateLocalAlbumId('Same Album', 'Artist A');
			const id2 = generateLocalAlbumId('Same Album', 'Artist B');

			expect(id1).not.toBe(id2);
		});
	});

	describe('generateLocalArtistId', () => {
		it('should generate id with "artist" prefix', () => {
			const result = generateLocalArtistId('My Artist');

			expect(result).toMatch(/^artist_/);
		});

		it('should be case insensitive', () => {
			const id1 = generateLocalArtistId('My Artist');
			const id2 = generateLocalArtistId('MY ARTIST');

			expect(id1).toBe(id2);
		});

		it('should trim whitespace', () => {
			const id1 = generateLocalArtistId('  My Artist  ');
			const id2 = generateLocalArtistId('My Artist');

			expect(id1).toBe(id2);
		});

		it('should return different ids for different artist names', () => {
			const id1 = generateLocalArtistId('Alice');
			const id2 = generateLocalArtistId('Bob');

			expect(id1).not.toBe(id2);
		});
	});
});
