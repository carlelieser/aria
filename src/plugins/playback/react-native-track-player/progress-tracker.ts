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
		private readonly state: PlaybackState,
		private readonly emitEvent: (event: PlaybackEvent) => void
	) {}

	handleProgressUpdate(position: number, duration: number): void {
		this.state.position = Duration.fromSeconds(position);
		this.emitEvent({
			type: 'position-change',
			position: this.state.position,
			timestamp: Date.now(),
		});

		if (duration > 0) {
			const newDuration = Duration.fromSeconds(duration);
			if (newDuration.totalMilliseconds !== this.state.duration.totalMilliseconds) {
				this.state.duration = newDuration;
				this.emitEvent({
					type: 'duration-change',
					duration: newDuration,
					timestamp: Date.now(),
				});
			}
		}
	}
}
