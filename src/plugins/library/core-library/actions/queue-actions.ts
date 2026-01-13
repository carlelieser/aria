import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { usePlayerStore } from '../../../../application/state/player-store';

export function getQueueActions(_context: TrackActionContext): TrackAction[] {
	return [
		{
			id: CORE_ACTION_IDS.ADD_TO_QUEUE,
			label: 'Add to Queue',
			icon: 'ListPlus',
			group: 'primary',
			priority: 100,
			enabled: true,
		},
	];
}

export async function executeQueueAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_QUEUE: {
			const store = usePlayerStore.getState();
			const currentQueue = store.queue;
			store.setQueue([...currentQueue, track], store.queueIndex);
			return {
				handled: true,
				success: true,
				feedback: { message: 'Added to queue', description: track.title },
			};
		}

		default:
			return { handled: false };
	}
}
