import { describe, it, expect } from 'vitest';
import { Duration } from '@domain/value-objects/duration';
import {
	isPlaybackActive,
	isPlaying,
	isPaused,
	isLoading,
	getProgressPercent,
	getRemainingDuration,
	hasNextTrack,
	hasPreviousTrack,
	getNextTrackIndex,
	getPreviousTrackIndex,
	shuffleArray,
	initialPlaybackState,
	initialQueueState,
	initialPlayerState,
	type PlaybackState,
	type QueueState,
} from '@domain/value-objects/playback-state';
import type { Track } from '@domain/entities/track';

const createMockTrack = (id: string): Track =>
	({
		id: { value: id, sourceType: 'test', sourceId: id },
		title: `Track ${id}`,
		artists: [],
		duration: Duration.fromSeconds(180),
		source: { type: 'local', filePath: `/path/${id}.mp3` },
		metadata: {},
	}) as Track;

describe('PlaybackState', () => {
	describe('Initial States', () => {
		describe('initialPlaybackState', () => {
			it('should have idle status', () => {
				expect(initialPlaybackState.status).toBe('idle');
			});

			it('should have null current track', () => {
				expect(initialPlaybackState.currentTrack).toBeNull();
			});

			it('should have zero position and duration', () => {
				expect(initialPlaybackState.position.isZero()).toBe(true);
				expect(initialPlaybackState.duration.isZero()).toBe(true);
			});

			it('should have default volume of 1', () => {
				expect(initialPlaybackState.volume).toBe(1);
			});

			it('should not be muted', () => {
				expect(initialPlaybackState.isMuted).toBe(false);
			});

			it('should have repeat mode off', () => {
				expect(initialPlaybackState.repeatMode).toBe('off');
			});

			it('should not be shuffled', () => {
				expect(initialPlaybackState.isShuffled).toBe(false);
			});

			it('should have default playback rate of 1', () => {
				expect(initialPlaybackState.playbackRate).toBe(1);
			});

			it('should be frozen', () => {
				expect(Object.isFrozen(initialPlaybackState)).toBe(true);
			});
		});

		describe('initialQueueState', () => {
			it('should have empty tracks array', () => {
				expect(initialQueueState.tracks).toEqual([]);
			});

			it('should have current index of -1', () => {
				expect(initialQueueState.currentIndex).toBe(-1);
			});

			it('should have empty original order', () => {
				expect(initialQueueState.originalOrder).toEqual([]);
			});

			it('should be frozen', () => {
				expect(Object.isFrozen(initialQueueState)).toBe(true);
			});
		});

		describe('initialPlayerState', () => {
			it('should include all playback state properties', () => {
				expect(initialPlayerState.status).toBe('idle');
				expect(initialPlayerState.volume).toBe(1);
			});

			it('should include queue state', () => {
				expect(initialPlayerState.queue).toEqual(initialQueueState);
			});

			it('should be frozen', () => {
				expect(Object.isFrozen(initialPlayerState)).toBe(true);
			});
		});
	});

	describe('isPlaybackActive', () => {
		it('should return false when status is idle', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				status: 'idle',
				currentTrack: createMockTrack('1'),
			};
			expect(isPlaybackActive(state)).toBe(false);
		});

		it('should return false when current track is null', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				status: 'playing',
				currentTrack: null,
			};
			expect(isPlaybackActive(state)).toBe(false);
		});

		it('should return true when playing with current track', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				status: 'playing',
				currentTrack: createMockTrack('1'),
			};
			expect(isPlaybackActive(state)).toBe(true);
		});

		it('should return true when paused with current track', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				status: 'paused',
				currentTrack: createMockTrack('1'),
			};
			expect(isPlaybackActive(state)).toBe(true);
		});
	});

	describe('isPlaying', () => {
		it('should return true when status is playing', () => {
			const state: PlaybackState = { ...initialPlaybackState, status: 'playing' };
			expect(isPlaying(state)).toBe(true);
		});

		it('should return false for other statuses', () => {
			expect(isPlaying({ ...initialPlaybackState, status: 'paused' })).toBe(false);
			expect(isPlaying({ ...initialPlaybackState, status: 'idle' })).toBe(false);
			expect(isPlaying({ ...initialPlaybackState, status: 'loading' })).toBe(false);
		});
	});

	describe('isPaused', () => {
		it('should return true when status is paused', () => {
			const state: PlaybackState = { ...initialPlaybackState, status: 'paused' };
			expect(isPaused(state)).toBe(true);
		});

		it('should return false for other statuses', () => {
			expect(isPaused({ ...initialPlaybackState, status: 'playing' })).toBe(false);
			expect(isPaused({ ...initialPlaybackState, status: 'idle' })).toBe(false);
		});
	});

	describe('isLoading', () => {
		it('should return true when status is loading', () => {
			const state: PlaybackState = { ...initialPlaybackState, status: 'loading' };
			expect(isLoading(state)).toBe(true);
		});

		it('should return true when status is buffering', () => {
			const state: PlaybackState = { ...initialPlaybackState, status: 'buffering' };
			expect(isLoading(state)).toBe(true);
		});

		it('should return false for other statuses', () => {
			expect(isLoading({ ...initialPlaybackState, status: 'playing' })).toBe(false);
			expect(isLoading({ ...initialPlaybackState, status: 'paused' })).toBe(false);
		});
	});

	describe('getProgressPercent', () => {
		it('should return 0 when duration is zero', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				position: Duration.fromSeconds(60),
				duration: Duration.ZERO,
			};
			expect(getProgressPercent(state)).toBe(0);
		});

		it('should return correct percentage', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				position: Duration.fromSeconds(90),
				duration: Duration.fromSeconds(180),
			};
			expect(getProgressPercent(state)).toBe(50);
		});

		it('should return 100 when position equals duration', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				position: Duration.fromSeconds(180),
				duration: Duration.fromSeconds(180),
			};
			expect(getProgressPercent(state)).toBe(100);
		});
	});

	describe('getRemainingDuration', () => {
		it('should return correct remaining duration', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				position: Duration.fromSeconds(60),
				duration: Duration.fromSeconds(180),
			};
			const remaining = getRemainingDuration(state);
			expect(remaining.totalSeconds).toBe(120);
		});

		it('should return zero when position equals duration', () => {
			const state: PlaybackState = {
				...initialPlaybackState,
				position: Duration.fromSeconds(180),
				duration: Duration.fromSeconds(180),
			};
			const remaining = getRemainingDuration(state);
			expect(remaining.isZero()).toBe(true);
		});
	});

	describe('Queue Navigation', () => {
		const tracks = [createMockTrack('1'), createMockTrack('2'), createMockTrack('3')];

		describe('hasNextTrack', () => {
			it('should return false for empty queue', () => {
				const queue: QueueState = { ...initialQueueState, tracks: [] };
				expect(hasNextTrack(queue, 'off')).toBe(false);
			});

			it('should return true when not at last track', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 0 };
				expect(hasNextTrack(queue, 'off')).toBe(true);
			});

			it('should return false when at last track with repeat off', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(hasNextTrack(queue, 'off')).toBe(false);
			});

			it('should return true when at last track with repeat all', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(hasNextTrack(queue, 'all')).toBe(true);
			});

			it('should return false when at last track with repeat one', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(hasNextTrack(queue, 'one')).toBe(false);
			});
		});

		describe('hasPreviousTrack', () => {
			it('should return false when at first track', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 0 };
				expect(hasPreviousTrack(queue)).toBe(false);
			});

			it('should return true when not at first track', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 1 };
				expect(hasPreviousTrack(queue)).toBe(true);
			});
		});

		describe('getNextTrackIndex', () => {
			it('should return -1 for empty queue', () => {
				const queue: QueueState = { ...initialQueueState, tracks: [], currentIndex: -1 };
				expect(getNextTrackIndex(queue, 'off')).toBe(-1);
			});

			it('should return next index when not at end', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 0 };
				expect(getNextTrackIndex(queue, 'off')).toBe(1);
			});

			it('should return -1 when at end with repeat off', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(getNextTrackIndex(queue, 'off')).toBe(-1);
			});

			it('should return 0 when at end with repeat all', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(getNextTrackIndex(queue, 'all')).toBe(0);
			});
		});

		describe('getPreviousTrackIndex', () => {
			it('should return 0 when at first track', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 0 };
				expect(getPreviousTrackIndex(queue)).toBe(0);
			});

			it('should return 0 when index is negative', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: -1 };
				expect(getPreviousTrackIndex(queue)).toBe(0);
			});

			it('should return previous index when not at start', () => {
				const queue: QueueState = { ...initialQueueState, tracks, currentIndex: 2 };
				expect(getPreviousTrackIndex(queue)).toBe(1);
			});
		});
	});

	describe('shuffleArray', () => {
		it('should return array of same length', () => {
			const input = [1, 2, 3, 4, 5];
			const result = shuffleArray(input);
			expect(result.length).toBe(input.length);
		});

		it('should contain all original elements', () => {
			const input = [1, 2, 3, 4, 5];
			const result = shuffleArray(input);
			expect(result.sort()).toEqual(input.sort());
		});

		it('should not mutate original array', () => {
			const input = [1, 2, 3, 4, 5];
			const original = [...input];
			shuffleArray(input);
			expect(input).toEqual(original);
		});

		it('should keep item at specified index', () => {
			const input = [1, 2, 3, 4, 5];
			const keepIndex = 2;
			const result = shuffleArray(input, keepIndex);
			expect(result[keepIndex]).toBe(input[keepIndex]);
		});

		it('should handle empty array', () => {
			const result = shuffleArray([]);
			expect(result).toEqual([]);
		});

		it('should handle single element array', () => {
			const result = shuffleArray([1]);
			expect(result).toEqual([1]);
		});

		it('should handle negative keep index by ignoring it', () => {
			const input = [1, 2, 3];
			const result = shuffleArray(input, -1);
			expect(result.length).toBe(3);
		});
	});
});
