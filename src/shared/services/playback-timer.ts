/**
 * Playback Timer
 *
 * Instruments the time-to-playback pipeline, measuring the duration
 * of each phase from user action to audible output.
 */

import { getLogger } from './logger';

const logger = getLogger('PlaybackTimer');

interface TimerPhase {
	readonly name: string;
	readonly startMs: number;
	readonly endMs?: number;
}

interface PlaybackTimingResult {
	readonly trackTitle: string;
	readonly totalMs: number;
	readonly phases: readonly {
		readonly name: string;
		readonly durationMs: number;
	}[];
}

const SLOW_PLAYBACK_THRESHOLD_MS = 3000;

export class PlaybackTimer {
	private _startMs = 0;
	private _trackTitle = '';
	private _phases: TimerPhase[] = [];
	private _currentPhase: TimerPhase | null = null;
	private _active = false;

	start(trackTitle: string): void {
		this._startMs = Date.now();
		this._trackTitle = trackTitle;
		this._phases = [];
		this._currentPhase = null;
		this._active = true;
	}

	beginPhase(name: string): void {
		if (!this._active) return;

		this._endCurrentPhase();
		this._currentPhase = { name, startMs: Date.now() };
	}

	endPhase(): void {
		if (!this._active) return;
		this._endCurrentPhase();
	}

	finish(): PlaybackTimingResult | null {
		if (!this._active) return null;

		this._endCurrentPhase();
		this._active = false;

		const totalMs = Date.now() - this._startMs;
		const phases = this._phases
			.filter((p): p is TimerPhase & { endMs: number } => p.endMs !== undefined)
			.map((p) => ({
				name: p.name,
				durationMs: p.endMs - p.startMs,
			}));

		const result: PlaybackTimingResult = {
			trackTitle: this._trackTitle,
			totalMs,
			phases,
		};

		this._logResult(result);

		return result;
	}

	cancel(): void {
		this._active = false;
		this._phases = [];
		this._currentPhase = null;
	}

	private _endCurrentPhase(): void {
		if (this._currentPhase) {
			this._phases = [...this._phases, { ...this._currentPhase, endMs: Date.now() }];
			this._currentPhase = null;
		}
	}

	private _logResult(result: PlaybackTimingResult): void {
		const phaseBreakdown = result.phases.map((p) => `${p.name}=${p.durationMs}ms`).join(', ');

		const level = result.totalMs > SLOW_PLAYBACK_THRESHOLD_MS ? 'warn' : 'info';

		logger[level](
			`Time-to-playback: ${result.totalMs}ms for "${result.trackTitle}" [${phaseBreakdown}]`
		);
	}
}

export const playbackTimer = new PlaybackTimer();
