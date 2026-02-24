/**
 * Queue Manager
 *
 * Handles queue operations including adding, removing, and navigating tracks.
 */

import type { Track } from '@domain/entities/track';
import type { QueueItem } from '@plugins/core/interfaces/playback-provider';
import { ok, err, type Result } from '@shared/types/result';
import type { PlaybackState } from './playback-state';

export class QueueManager {
	constructor(private readonly state: PlaybackState) {}

	getQueue(): QueueItem[] {
		return this.state.queue.map((track, index) => ({
			track,
			isActive: index === this.state.currentIndex,
			position: index,
		}));
	}

	setQueue(tracks: Track[], startIndex: number = 0): Result<void, Error> {
		this.state.queue = [...tracks];
		this.state.currentIndex = startIndex;
		return ok(undefined);
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		const queue = this.state.queue;
		const currentIndex = this.state.currentIndex;

		if (atIndex !== undefined && atIndex >= 0 && atIndex <= queue.length) {
			this.state.queue = [...queue.slice(0, atIndex), ...tracks, ...queue.slice(atIndex)];
			if (currentIndex >= atIndex) {
				this.state.currentIndex += tracks.length;
			}
		} else {
			this.state.queue = [...queue, ...tracks];
		}

		return ok(undefined);
	}

	removeFromQueue(index: number): Result<void, Error> {
		const queue = this.state.queue;
		const currentIndex = this.state.currentIndex;

		if (index >= 0 && index < queue.length) {
			this.state.queue = queue.filter((_, i) => i !== index);

			if (index < currentIndex) {
				this.state.currentIndex--;
			} else if (index === currentIndex) {
				this.state.reset();
			}
		}

		return ok(undefined);
	}

	clearQueue(): Result<void, Error> {
		this.state.queue = [];
		this.state.currentIndex = -1;
		return ok(undefined);
	}

	canSkipNext(): boolean {
		return this.state.currentIndex < this.state.queue.length - 1;
	}

	canSkipPrevious(): boolean {
		return this.state.currentIndex > 0;
	}

	skipToNext(): Result<void, Error> {
		if (this.canSkipNext()) {
			this.state.currentIndex++;
			return ok(undefined);
		}
		return err(new Error('No next track'));
	}

	skipToPrevious(): Result<void, Error> {
		if (this.canSkipPrevious()) {
			this.state.currentIndex--;
			return ok(undefined);
		}
		return err(new Error('No previous track'));
	}
}
