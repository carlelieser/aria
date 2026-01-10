import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { useLibraryStore } from '../../../../application/state/library-store';

export function getFavoriteActions(context: TrackActionContext): TrackAction[] {
	const { track } = context;
	const isFavorite = useLibraryStore.getState().isFavorite(track.id.value);

	return [
		{
			id: CORE_ACTION_IDS.TOGGLE_FAVORITE,
			label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
			icon: isFavorite ? 'HeartOff' : 'Heart',
			group: 'primary',
			priority: 80,
			enabled: true,
			checked: isFavorite,
		},
	];
}

export async function executeFavoriteAction(
	actionId: string,
	context: TrackActionContext
): Promise<boolean> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.TOGGLE_FAVORITE:
			useLibraryStore.getState().toggleFavorite(track.id.value);
			return true;

		default:
			return false;
	}
}
