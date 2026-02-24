import { describe, it, expect } from 'vitest';
import { getArtistName } from '@domain/utils/artist-utils';
import { createTrack } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';

function makeTrack(artists: { id: string; name: string }[]) {
	return createTrack({
		id: TrackId.create('youtube-music', 'track-1'),
		title: 'Test Track',
		artists,
		duration: Duration.fromSeconds(180),
		source: { type: 'streaming', sourcePlugin: 'youtube-music', sourceId: 'track-1' },
	});
}

describe('artist-utils', () => {
	describe('getArtistName', () => {
		it('should return artist name when artist id matches', () => {
			const tracks = [
				makeTrack([
					{ id: 'artist-1', name: 'Alice' },
					{ id: 'artist-2', name: 'Bob' },
				]),
			];

			const result = getArtistName(tracks, 'artist-1');

			expect(result).toBe('Alice');
		});

		it('should return correct name when artist is in second track', () => {
			const tracks = [
				makeTrack([{ id: 'artist-1', name: 'Alice' }]),
				makeTrack([{ id: 'artist-2', name: 'Bob' }]),
			];

			const result = getArtistName(tracks, 'artist-2');

			expect(result).toBe('Bob');
		});

		it('should return fallback name when artist id not found', () => {
			const tracks = [makeTrack([{ id: 'artist-1', name: 'Alice' }])];

			const result = getArtistName(tracks, 'missing-artist', 'Fallback Name');

			expect(result).toBe('Fallback Name');
		});

		it('should return "Unknown Artist" when no fallback and artist not found', () => {
			const tracks = [makeTrack([{ id: 'artist-1', name: 'Alice' }])];

			const result = getArtistName(tracks, 'missing-artist');

			expect(result).toBe('Unknown Artist');
		});

		it('should return "Unknown Artist" when tracks array is empty', () => {
			const result = getArtistName([], 'any-id');

			expect(result).toBe('Unknown Artist');
		});

		it('should return first matching artist name across tracks', () => {
			const tracks = [
				makeTrack([{ id: 'artist-1', name: 'Alice From Track 1' }]),
				makeTrack([{ id: 'artist-1', name: 'Alice From Track 2' }]),
			];

			const result = getArtistName(tracks, 'artist-1');

			expect(result).toBe('Alice From Track 1');
		});
	});
});
