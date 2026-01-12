import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	createPlaylist,
	addTrackToPlaylist,
	removeTrackFromPlaylist,
	reorderPlaylistTracks,
	getPlaylistDuration,
	getPlaylistTrackCount,
	type SmartPlaylistCriteria,
} from '@domain/entities/playlist';
import { createTrack, type Track } from '@domain/entities/track';
import { TrackId } from '@domain/value-objects/track-id';
import { Duration } from '@domain/value-objects/duration';
import { createStreamingSource } from '@domain/value-objects/audio-source';

describe('Playlist Entity', () => {
	const createTestTrack = (id: string, durationSeconds: number = 180): Track =>
		createTrack({
			id: TrackId.create('youtube-music', id),
			title: `Track ${id}`,
			artists: [{ id: `artist-${id}`, name: `Artist ${id}` }],
			duration: Duration.fromSeconds(durationSeconds),
			source: createStreamingSource('youtube-music', id),
		});

	describe('createPlaylist', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should create playlist with required properties', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });

			expect(playlist.name).toBe('My Playlist');
			expect(playlist.id).toMatch(/^playlist_\d+_[a-z0-9]+$/);
		});

		it('should create playlist with custom id', () => {
			const playlist = createPlaylist({ id: 'custom-id', name: 'My Playlist' });
			expect(playlist.id).toBe('custom-id');
		});

		it('should create playlist with description', () => {
			const playlist = createPlaylist({
				name: 'My Playlist',
				description: 'A great playlist',
			});
			expect(playlist.description).toBe('A great playlist');
		});

		it('should create playlist with artwork', () => {
			const artwork = [{ url: 'https://example.com/cover.jpg', width: 300, height: 300 }];
			const playlist = createPlaylist({ name: 'My Playlist', artwork });
			expect(playlist.artwork).toEqual(artwork);
		});

		it('should set timestamps on creation', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });

			expect(playlist.createdAt).toEqual(new Date('2024-01-15T10:00:00Z'));
			expect(playlist.updatedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
		});

		it('should create empty playlist by default', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(playlist.tracks).toHaveLength(0);
		});

		it('should create playlist with initial tracks', () => {
			const tracks = [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')];

			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks,
			});

			expect(playlist.tracks).toHaveLength(3);
			expect(playlist.tracks[0].track.title).toBe('Track 1');
			expect(playlist.tracks[0].position).toBe(0);
			expect(playlist.tracks[1].position).toBe(1);
			expect(playlist.tracks[2].position).toBe(2);
		});

		it('should set addedAt timestamp for each track', () => {
			const tracks = [createTestTrack('1')];
			const playlist = createPlaylist({ name: 'My Playlist', tracks });

			expect(playlist.tracks[0].addedAt).toEqual(new Date('2024-01-15T10:00:00Z'));
		});

		it('should create non-smart playlist by default', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(playlist.isSmartPlaylist).toBe(false);
		});

		it('should create smart playlist with criteria', () => {
			const criteria: SmartPlaylistCriteria = {
				rules: [{ field: 'artist', operator: 'contains', value: 'Beatles' }],
				matchAll: true,
				limit: 50,
				sortBy: 'addedAt',
				sortDirection: 'desc',
			};

			const playlist = createPlaylist({
				name: 'Beatles Songs',
				isSmartPlaylist: true,
				smartCriteria: criteria,
			});

			expect(playlist.isSmartPlaylist).toBe(true);
			expect(playlist.smartCriteria).toEqual(criteria);
		});

		it('should not be pinned by default', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(playlist.isPinned).toBe(false);
		});

		it('should be frozen (immutable)', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(Object.isFrozen(playlist)).toBe(true);
		});
	});

	describe('addTrackToPlaylist', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should add track to empty playlist', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({ name: 'My Playlist' });

			vi.setSystemTime(new Date('2024-01-15T11:00:00Z'));
			const track = createTestTrack('1');
			const updated = addTrackToPlaylist(playlist, track);

			expect(updated.tracks).toHaveLength(1);
			expect(updated.tracks[0].track).toBe(track);
			expect(updated.tracks[0].position).toBe(0);
		});

		it('should add track to end of playlist', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2')],
			});

			vi.setSystemTime(new Date('2024-01-15T11:00:00Z'));
			const newTrack = createTestTrack('3');
			const updated = addTrackToPlaylist(playlist, newTrack);

			expect(updated.tracks).toHaveLength(3);
			expect(updated.tracks[2].track).toBe(newTrack);
			expect(updated.tracks[2].position).toBe(2);
		});

		it('should update updatedAt timestamp', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({ name: 'My Playlist' });

			vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
			const updated = addTrackToPlaylist(playlist, createTestTrack('1'));

			expect(updated.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
		});

		it('should preserve existing tracks', () => {
			const initialTracks = [createTestTrack('1'), createTestTrack('2')];
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({ name: 'My Playlist', tracks: initialTracks });

			const updated = addTrackToPlaylist(playlist, createTestTrack('3'));

			expect(updated.tracks[0].track.title).toBe('Track 1');
			expect(updated.tracks[1].track.title).toBe('Track 2');
		});
	});

	describe('removeTrackFromPlaylist', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should remove track at specified position', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			const updated = removeTrackFromPlaylist(playlist, 1);

			expect(updated.tracks).toHaveLength(2);
			expect(updated.tracks[0].track.title).toBe('Track 1');
			expect(updated.tracks[1].track.title).toBe('Track 3');
		});

		it('should reindex remaining tracks after removal', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			const updated = removeTrackFromPlaylist(playlist, 0);

			expect(updated.tracks[0].position).toBe(0);
			expect(updated.tracks[1].position).toBe(1);
		});

		it('should update updatedAt timestamp', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1')],
			});

			vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
			const updated = removeTrackFromPlaylist(playlist, 0);

			expect(updated.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
		});

		it('should handle removing non-existent position gracefully', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1')],
			});

			const updated = removeTrackFromPlaylist(playlist, 99);
			expect(updated.tracks).toHaveLength(1);
		});
	});

	describe('reorderPlaylistTracks', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should move track from beginning to end', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			const updated = reorderPlaylistTracks(playlist, 0, 2);

			expect(updated.tracks[0].track.title).toBe('Track 2');
			expect(updated.tracks[1].track.title).toBe('Track 3');
			expect(updated.tracks[2].track.title).toBe('Track 1');
		});

		it('should move track from end to beginning', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			const updated = reorderPlaylistTracks(playlist, 2, 0);

			expect(updated.tracks[0].track.title).toBe('Track 3');
			expect(updated.tracks[1].track.title).toBe('Track 1');
			expect(updated.tracks[2].track.title).toBe('Track 2');
		});

		it('should update position indices after reorder', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			const updated = reorderPlaylistTracks(playlist, 0, 2);

			expect(updated.tracks[0].position).toBe(0);
			expect(updated.tracks[1].position).toBe(1);
			expect(updated.tracks[2].position).toBe(2);
		});

		it('should update updatedAt timestamp', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2')],
			});

			vi.setSystemTime(new Date('2024-01-15T12:00:00Z'));
			const updated = reorderPlaylistTracks(playlist, 0, 1);

			expect(updated.updatedAt).toEqual(new Date('2024-01-15T12:00:00Z'));
		});

		it('should handle moving to same position', () => {
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2')],
			});

			const updated = reorderPlaylistTracks(playlist, 1, 1);

			expect(updated.tracks[0].track.title).toBe('Track 1');
			expect(updated.tracks[1].track.title).toBe('Track 2');
		});
	});

	describe('getPlaylistDuration', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return 0 for empty playlist', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(getPlaylistDuration(playlist)).toBe(0);
		});

		it('should return total duration of all tracks', () => {
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [
					createTestTrack('1', 180),
					createTestTrack('2', 240),
					createTestTrack('3', 120),
				],
			});

			expect(getPlaylistDuration(playlist)).toBe(540000);
		});
	});

	describe('getPlaylistTrackCount', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should return 0 for empty playlist', () => {
			const playlist = createPlaylist({ name: 'My Playlist' });
			expect(getPlaylistTrackCount(playlist)).toBe(0);
		});

		it('should return correct track count', () => {
			const playlist = createPlaylist({
				name: 'My Playlist',
				tracks: [createTestTrack('1'), createTestTrack('2'), createTestTrack('3')],
			});

			expect(getPlaylistTrackCount(playlist)).toBe(3);
		});
	});

	describe('SmartPlaylistCriteria', () => {
		beforeEach(() => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2024-01-15T10:00:00Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should support all rule fields', () => {
			const criteria: SmartPlaylistCriteria = {
				rules: [
					{ field: 'artist', operator: 'contains', value: 'Artist' },
					{ field: 'album', operator: 'equals', value: 'Album' },
					{ field: 'genre', operator: 'startsWith', value: 'Rock' },
					{ field: 'year', operator: 'greaterThan', value: 2020 },
					{ field: 'duration', operator: 'lessThan', value: 300000 },
					{ field: 'playCount', operator: 'between', value: [10, 100] },
					{ field: 'addedAt', operator: 'greaterThan', value: Date.now() - 86400000 },
				],
				matchAll: true,
			};

			const playlist = createPlaylist({
				name: 'Smart Playlist',
				isSmartPlaylist: true,
				smartCriteria: criteria,
			});

			expect(playlist.smartCriteria?.rules).toHaveLength(7);
		});

		it('should support matchAll option', () => {
			const matchAllCriteria: SmartPlaylistCriteria = {
				rules: [{ field: 'artist', operator: 'contains', value: 'A' }],
				matchAll: true,
			};

			const matchAnyCriteria: SmartPlaylistCriteria = {
				rules: [{ field: 'artist', operator: 'contains', value: 'A' }],
				matchAll: false,
			};

			const matchAllPlaylist = createPlaylist({
				name: 'Match All',
				isSmartPlaylist: true,
				smartCriteria: matchAllCriteria,
			});

			const matchAnyPlaylist = createPlaylist({
				name: 'Match Any',
				isSmartPlaylist: true,
				smartCriteria: matchAnyCriteria,
			});

			expect(matchAllPlaylist.smartCriteria?.matchAll).toBe(true);
			expect(matchAnyPlaylist.smartCriteria?.matchAll).toBe(false);
		});

		it('should support all sort options', () => {
			const sortOptions: SmartPlaylistCriteria['sortBy'][] = [
				'title',
				'artist',
				'album',
				'addedAt',
				'playCount',
				'random',
			];

			sortOptions.forEach((sortBy) => {
				const playlist = createPlaylist({
					name: `Sorted by ${sortBy}`,
					isSmartPlaylist: true,
					smartCriteria: {
						rules: [],
						matchAll: true,
						sortBy,
						sortDirection: 'asc',
					},
				});

				expect(playlist.smartCriteria?.sortBy).toBe(sortBy);
			});
		});
	});
});
