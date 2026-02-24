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
	constructor(private readonly _state: PlaybackState) {}

	getQueue(): QueueItem[] {
		return this._state.queue.map((track, index) => ({
			track,
			isActive: index === this._state.currentIndex,
			position: index,
		}));
	}

	setQueue(tracks: Track[], startIndex: number = 0): Result<void, Error> {
		this._state.queue = [...tracks];
		this._state.currentIndex = startIndex;
		return ok(undefined);
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		const queue = this._state.queue;
		const currentIndex = this._state.currentIndex;

		if (atIndex !== undefined && atIndex >= 0 && atIndex <= queue.length) {
			this._state.queue = [...queue.slice(0, atIndex), ...tracks, ...queue.slice(atIndex)];
			if (currentIndex >= atIndex) {
				this._state.currentIndex += tracks.length;
			}
		} else {
			this._state.queue = [...queue, ...tracks];
		}

		return ok(undefined);
	}

	removeFromQueue(index: number): Result<void, Error> {
		const queue = this._state.queue;
		const currentIndex = this._state.currentIndex;

		if (index >= 0 && index < queue.length) {
			this._state.queue = queue.filter((_, i) => i !== index);

			if (index < currentIndex) {
				this._state.currentIndex--;
			} else if (index === currentIndex) {
				this._state.reset();
			}
		}

		return ok(undefined);
	}

	clearQueue(): Result<void, Error> {
		this._state.queue = [];
		this._state.currentIndex = -1;
		return ok(undefined);
	}

	canSkipNext(): boolean {
		return this._state.currentIndex < this._state.queue.length - 1;
	}

	canSkipPrevious(): boolean {
		return this._state.currentIndex > 0;
	}

	skipToNext(): Result<void, Error> {
		if (this.canSkipNext()) {
			this._state.currentIndex++;
			return ok(undefined);
		}
		return err(new Error('No next track'));
	}

	skipToPrevious(): Result<void, Error> {
		if (this.canSkipPrevious()) {
			this._state.currentIndex--;
			return ok(undefined);
		}
		return err(new Error('No previous track'));
	}
}
