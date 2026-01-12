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
		private readonly queueManager: QueueManager,
		private readonly state: PlaybackState,
		private readonly emitEvent: (event: PlaybackEvent) => void
	) {}

	getQueue(): QueueItem[] {
		return this.queueManager.getQueue();
	}

	async setQueue(tracks: Track[], startIndex: number = 0): AsyncResult<void, Error> {
		const result = this.queueManager.setQueue(tracks, startIndex);
		if (result.success) {
			this.emitQueueChangeEvent();
		}
		return result;
	}

	addToQueue(tracks: Track[], atIndex?: number): Result<void, Error> {
		const result = this.queueManager.addToQueue(tracks, atIndex);
		if (result.success) {
			this.emitQueueChangeEvent();
		}
		return result;
	}

	removeFromQueue(index: number): Result<void, Error> {
		const result = this.queueManager.removeFromQueue(index);
		if (result.success) {
			this.emitQueueChangeEvent();
		}
		return result;
	}

	clearQueue(): Result<void, Error> {
		const result = this.queueManager.clearQueue();
		if (result.success) {
			this.emitEvent({
				type: 'queue-change',
				tracks: [],
				currentIndex: -1,
				timestamp: Date.now(),
			});
		}
		return result;
	}

	async skipToNext(): AsyncResult<void, Error> {
		return this.queueManager.skipToNext();
	}

	async skipToPrevious(): AsyncResult<void, Error> {
		return this.queueManager.skipToPrevious();
	}

	private emitQueueChangeEvent(): void {
		this.emitEvent({
			type: 'queue-change',
			tracks: this.state.queue,
			currentIndex: this.state.currentIndex,
			timestamp: Date.now(),
		});
	}
}
