/**
 * Progress Tracker
 *
 * Manages progress polling and progress update handling.
 */

import TrackPlayer from 'react-native-track-player';
import { Duration } from '@domain/value-objects/duration';
import type { PlaybackEvent } from '@plugins/core/interfaces/playback-provider';
import type { PlaybackState } from './playback-state';
import { PROGRESS_POLL_INTERVAL_MS } from './constants';

export class ProgressTracker {
	private progressInterval: ReturnType<typeof setInterval> | null = null;

	constructor(
		private readonly state: PlaybackState,
		private readonly emitEvent: (event: PlaybackEvent) => void
	) {}

	start(): void {
		if (this.progressInterval) {
			return;
		}

		this.progressInterval = setInterval(async () => {
			try {
				const progress = await TrackPlayer.getProgress();
				this.handleProgressUpdate(progress.position, progress.duration);
			} catch {
				// Ignore polling errors
			}
		}, PROGRESS_POLL_INTERVAL_MS);
	}

	stop(): void {
		if (this.progressInterval) {
			clearInterval(this.progressInterval);
			this.progressInterval = null;
		}
	}

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
