import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { playbackService } from '@/src/application/services/playback-service';

vi.mock('@shared/services/logger', () => ({
	getLogger: () => ({
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	}),
}));

vi.mock('@/src/application/services/playback-service', () => ({
	playbackService: {
		pause: vi.fn().mockResolvedValue({ success: true, data: undefined }),
	},
}));

// Must import after mocks are set up
const { sleepTimerService } = await import('@/src/application/services/sleep-timer-service');

describe('SleepTimerService', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		sleepTimerService.cancel();
		vi.clearAllMocks();
	});

	afterEach(() => {
		sleepTimerService.cancel();
		vi.useRealTimers();
	});

	describe('isActive', () => {
		it('should return false when no timer is set', () => {
			expect(sleepTimerService.isActive).toBe(false);
		});

		it('should return true when timer is started', () => {
			sleepTimerService.start(10);

			expect(sleepTimerService.isActive).toBe(true);
		});

		it('should return false after timer is cancelled', () => {
			sleepTimerService.start(10);
			sleepTimerService.cancel();

			expect(sleepTimerService.isActive).toBe(false);
		});
	});

	describe('remainingMs', () => {
		it('should return 0 when no timer is set', () => {
			expect(sleepTimerService.remainingMs).toBe(0);
		});

		it('should return remaining time when timer is active', () => {
			sleepTimerService.start(5);

			vi.advanceTimersByTime(60 * 1000);

			expect(sleepTimerService.remainingMs).toBe(4 * 60 * 1000);
		});
	});

	describe('remainingSeconds', () => {
		it('should return remaining time in seconds rounded up', () => {
			sleepTimerService.start(1);

			vi.advanceTimersByTime(30500);

			expect(sleepTimerService.remainingSeconds).toBe(30);
		});
	});

	describe('remainingMinutes', () => {
		it('should return remaining time in minutes rounded up', () => {
			sleepTimerService.start(5);

			vi.advanceTimersByTime(2 * 60 * 1000);

			expect(sleepTimerService.remainingMinutes).toBe(3);
		});
	});

	describe('getState', () => {
		it('should return inactive state when no timer is set', () => {
			const state = sleepTimerService.getState();

			expect(state.isActive).toBe(false);
			expect(state.mode).toBe('duration');
			expect(state.endTime).toBeNull();
			expect(state.remainingMs).toBe(0);
		});

		it('should return active state when timer is running', () => {
			sleepTimerService.start(10);

			const state = sleepTimerService.getState();

			expect(state.isActive).toBe(true);
			expect(state.mode).toBe('duration');
			expect(state.endTime).not.toBeNull();
		});
	});

	describe('start', () => {
		it('should activate the timer for the given duration', () => {
			sleepTimerService.start(15);

			expect(sleepTimerService.isActive).toBe(true);
			expect(sleepTimerService.getState().mode).toBe('duration');
		});

		it('should cancel any previous timer before starting', () => {
			sleepTimerService.start(10);
			sleepTimerService.start(20);

			expect(sleepTimerService.remainingMinutes).toBe(20);
		});

		it('should notify listeners when started', () => {
			const listener = vi.fn();
			sleepTimerService.subscribe(listener);

			sleepTimerService.start(5);

			expect(listener).toHaveBeenCalled();
		});

		it('should trigger sleep when timer expires', async () => {
			sleepTimerService.start(1);

			vi.advanceTimersByTime(61 * 1000);

			await vi.runAllTimersAsync();

			expect(playbackService.pause).toHaveBeenCalled();
		});
	});

	describe('startEndOfTrack', () => {
		it('should set mode to end-of-track', () => {
			sleepTimerService.startEndOfTrack();

			const state = sleepTimerService.getState();
			expect(state.mode).toBe('end-of-track');
		});

		it('should notify listeners', () => {
			const listener = vi.fn();
			sleepTimerService.subscribe(listener);

			sleepTimerService.startEndOfTrack();

			expect(listener).toHaveBeenCalled();
		});
	});

	describe('cancel', () => {
		it('should deactivate the timer', () => {
			sleepTimerService.start(10);
			sleepTimerService.cancel();

			expect(sleepTimerService.isActive).toBe(false);
			expect(sleepTimerService.remainingMs).toBe(0);
		});

		it('should reset mode to duration', () => {
			sleepTimerService.startEndOfTrack();
			sleepTimerService.cancel();

			expect(sleepTimerService.getState().mode).toBe('duration');
		});

		it('should notify listeners', () => {
			sleepTimerService.start(10);

			const listener = vi.fn();
			sleepTimerService.subscribe(listener);
			sleepTimerService.cancel();

			expect(listener).toHaveBeenCalled();
		});
	});

	describe('extendByMinutes', () => {
		it('should extend the active timer', () => {
			sleepTimerService.start(5);

			vi.advanceTimersByTime(60 * 1000);

			sleepTimerService.extendByMinutes(3);

			expect(sleepTimerService.remainingMinutes).toBe(7);
		});

		it('should start a new timer when no timer is active', () => {
			sleepTimerService.extendByMinutes(5);

			expect(sleepTimerService.isActive).toBe(true);
			expect(sleepTimerService.remainingMinutes).toBe(5);
		});
	});

	describe('subscribe', () => {
		it('should call listener when timer state changes', () => {
			const listener = vi.fn();
			sleepTimerService.subscribe(listener);

			sleepTimerService.start(5);

			expect(listener).toHaveBeenCalled();
		});

		it('should return an unsubscribe function', () => {
			const listener = vi.fn();
			const unsubscribe = sleepTimerService.subscribe(listener);

			unsubscribe();
			listener.mockClear();
			sleepTimerService.start(5);

			expect(listener).not.toHaveBeenCalled();
		});
	});

	describe('onTrackEnded', () => {
		it('should trigger sleep when mode is end-of-track', async () => {
			sleepTimerService.startEndOfTrack();

			await sleepTimerService.onTrackEnded();

			expect(playbackService.pause).toHaveBeenCalled();
		});

		it('should not trigger sleep when mode is duration', async () => {
			sleepTimerService.start(10);

			await sleepTimerService.onTrackEnded();

			expect(playbackService.pause).not.toHaveBeenCalled();
		});

		it('should not trigger sleep when no timer is active', async () => {
			await sleepTimerService.onTrackEnded();

			expect(playbackService.pause).not.toHaveBeenCalled();
		});
	});
});
