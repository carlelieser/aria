import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
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
): Promise<boolean> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_QUEUE: {
			const store = usePlayerStore.getState();
			const currentQueue = store.queue;
			store.setQueue([...currentQueue, track], store.queueIndex);
			return true;
		}

		default:
			return false;
	}
}
