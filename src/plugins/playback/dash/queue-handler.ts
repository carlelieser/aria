/**
 * Queue Handler
 *
 * Wraps queue operations and emits events for queue changes.
 */

import type { Track } from '@domain/entities/track';
import type { PlaybackEvent, QueueItem } from '@plugins/core/interfaces/playback-provider';
import { type Result, type AsyncResult } from '@shared/types/result';
import type { QueueManager } from './queue-manager';
import type { PlaybackState } from './playback-state';

export class QueueHandler {
	constructor(
		private readonly _queueManager: QueueManager,
		private readonly _state: PlaybackState,
		private readonly _emitEvent: (event: PlaybackEvent) => void
	) {}

	getQueue(): QueueItem[] {
		return this._queueManager.getQueue();
	}

	async setQueue(tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> {
		const result = this._queueManager.setQueue(tracks, startIndex);
		if (result.success) {
			this._emitQueueChangeEvent();
		}
		return result;
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		const result = this._queueManager.addToQueue(tracks, atIndex);
		if (result.success) {
			this._emitQueueChangeEvent();
		}
		return result;
	}

	removeFromQueue(index: number): Result<void, Error> {
		const result = this._queueManager.removeFromQueue(index);
		if (result.success) {
			this._emitQueueChangeEvent();
		}
		return result;
	}

	clearQueue(): Result<void, Error> {
		const result = this._queueManager.clearQueue();
		if (result.success) {
			this._emitEvent({
				type: 'queue-change',
				tracks: [],
				currentIndex: -1,
				timestamp: Date.now(),
			});
		}
		return result;
	}

	async skipToNext(): AsyncResult<void, Error> {
		return this._queueManager.skipToNext();
	}

	async skipToPrevious(): AsyncResult<void, Error> {
		return this._queueManager.skipToPrevious();
	}

	private _emitQueueChangeEvent(): void {
		this._emitEvent({
			type: 'queue-change',
			tracks: this._state.queue,
			currentIndex: this._state.currentIndex,
			timestamp: Date.now(),
		});
	}
}
