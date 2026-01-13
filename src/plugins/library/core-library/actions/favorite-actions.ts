import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
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
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.TOGGLE_FAVORITE: {
			const store = useLibraryStore.getState();
			const wasCurrentlyFavorite = store.isFavorite(track.id.value);

			if (!wasCurrentlyFavorite) {
				store.addTrack(track);
			}

			store.toggleFavorite(track.id.value);

			return {
				handled: true,
				success: true,
				feedback: {
					message: wasCurrentlyFavorite ? 'Removed from favorites' : 'Added to favorites',
					description: track.title,
				},
			};
		}

		default:
			return { handled: false };
	}
}
