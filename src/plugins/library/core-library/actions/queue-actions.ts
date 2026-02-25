import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { usePlayerStore } from '../../../../application/state/player-store';

export function getQueueActions(_context: TrackActionContext): TrackAction[] {
	return [
		{
			id: CORE_ACTION_IDS.PLAY_NEXT,
			label: 'Play Next',
			icon: 'ListStart',
			group: 'primary',
			priority: 20,
			enabled: true,
		},
		{
			id: CORE_ACTION_IDS.ADD_TO_QUEUE,
			label: 'Add to Queue',
			icon: 'ListEnd',
			group: 'primary',
			priority: 10,
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
		case CORE_ACTION_IDS.PLAY_NEXT: {
			const store = usePlayerStore.getState();
			const insertIndex = store.queueIndex + 1;
			store.insertIntoQueue(track, insertIndex);
			return {
				handled: true,
				success: true,
				feedback: { message: 'Playing next', description: track.title },
			};
		}

		case CORE_ACTION_IDS.ADD_TO_QUEUE: {
			usePlayerStore.getState().appendToQueue(track);
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
