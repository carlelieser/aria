import { playbackService } from './playback-service';
import { getLogger } from '../../shared/services/logger';

const logger = getLogger('SleepTimerService');

export type SleepTimerMode = 'duration' | 'end-of-track';

interface SleepTimerState {
	isActive: boolean;
	mode: SleepTimerMode;
	endTime: number | null;
	remainingMs: number;
}

class SleepTimerService {
	private intervalId: ReturnType<typeof setInterval> | null = null;
	private endTime: number | null = null;
	private mode: SleepTimerMode = 'duration';
	private listeners: Set<() => void> = new Set();
	private cachedState: SleepTimerState = {
		isActive: false,
		mode: 'duration',
		endTime: null,
		remainingMs: 0,
	};

	get isActive(): boolean {
		return this.endTime !== null;
	}

	get remainingMs(): number {
		if (!this.endTime) return 0;
		return Math.max(0, this.endTime - Date.now());
	}

	get remainingSeconds(): number {
		return Math.ceil(this.remainingMs / 1000);
	}

	get remainingMinutes(): number {
		return Math.ceil(this.remainingMs / 60000);
	}

	getState(): SleepTimerState {
		return this.cachedState;
	}

	private _updateCachedState(): void {
		this.cachedState = {
			isActive: this.isActive,
			mode: this.mode,
			endTime: this.endTime,
			remainingMs: this.remainingMs,
		};
	}

	start(durationMinutes: number): void {
		this.cancel();

		const durationMs = durationMinutes * 60 * 1000;
		this.endTime = Date.now() + durationMs;
		this.mode = 'duration';

		logger.info(`Sleep timer started for ${durationMinutes} minutes`);

		this._startInterval();
		this._notifyListeners();
	}

	startEndOfTrack(): void {
		this.cancel();

		this.mode = 'end-of-track';
		this.endTime = null;

		logger.info('Sleep timer set to end of current track');
		this._notifyListeners();
	}

	cancel(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}

		if (this.isActive || this.mode === 'end-of-track') {
			logger.info('Sleep timer cancelled');
		}

		this.endTime = null;
		this.mode = 'duration';
		this._notifyListeners();
	}

	extendByMinutes(minutes: number): void {
		if (!this.endTime) {
			this.start(minutes);
			return;
		}

		this.endTime += minutes * 60 * 1000;
		logger.info(`Sleep timer extended by ${minutes} minutes`);
		this._notifyListeners();
	}

	subscribe(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	}

	async onTrackEnded(): Promise<void> {
		if (this.mode === 'end-of-track') {
			logger.info('Track ended, triggering sleep timer');
			await this._triggerSleep();
		}
	}

	private _startInterval(): void {
		this.intervalId = setInterval(() => {
			if (!this.endTime) {
				this.cancel();
				return;
			}

			const remaining = this.remainingMs;

			if (remaining <= 0) {
				this._triggerSleep();
			} else {
				this._notifyListeners();
			}
		}, 1000);
	}

	private async _triggerSleep(): Promise<void> {
		logger.info('Sleep timer triggered, pausing playback');

		this.cancel();

		try {
			await playbackService.pause();
		} catch (error) {
			logger.error(
				'Failed to pause playback on sleep timer',
				error instanceof Error ? error : undefined
			);
		}
	}

	private _notifyListeners(): void {
		this._updateCachedState();
		for (const listener of this.listeners) {
			try {
				listener();
			} catch (error) {
				logger.warn(
					'Sleep timer listener threw an error',
					error instanceof Error ? error : undefined
				);
			}
		}
	}
}

export const sleepTimerService = new SleepTimerService();
