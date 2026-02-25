/**
 * Progress Tracker
 *
 * Handles progress updates from RNTP's PlaybackProgressUpdated events.
 * No polling - relies entirely on event-based updates configured via progressUpdateEventInterval.
 */

import { Duration } from '@domain/value-objects/duration';
import type { PlaybackEvent } from '@plugins/core/interfaces/playback-provider';
import type { PlaybackState } from './playback-state';

export class ProgressTracker {
	constructor(
		private readonly _state: PlaybackState,
		private readonly _emitEvent: (event: PlaybackEvent) => void
	) {}

	handleProgressUpdate(position: number, duration: number): void {
		if (this._state.isTransitioning) return;

		this._state.position = Duration.fromSeconds(position);
		this._emitEvent({
			type: 'position-change',
			position: this._state.position,
			timestamp: Date.now(),
		});

		if (duration > 0) {
			const newDuration = Duration.fromSeconds(duration);
			if (newDuration.totalMilliseconds !== this._state.duration.totalMilliseconds) {
				this._state.duration = newDuration;
				this._emitEvent({
					type: 'duration-change',
					duration: newDuration,
					timestamp: Date.now(),
				});
			}
		}
	}
}
