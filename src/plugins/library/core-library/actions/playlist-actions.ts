import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { libraryService } from '../../../../application/services/library-service';

export function getPlaylistActions(context: TrackActionContext): TrackAction[] {
	const { source, playlistId } = context;
	const actions: TrackAction[] = [];

	actions.push({
		id: CORE_ACTION_IDS.ADD_TO_PLAYLIST,
		label: 'Add to Playlist',
		icon: 'ListMusic',
		group: 'primary',
		priority: 90,
		enabled: true,
	});

	if (source === 'playlist' && playlistId) {
		actions.push({
			id: CORE_ACTION_IDS.REMOVE_FROM_PLAYLIST,
			label: 'Remove from Playlist',
			icon: 'ListMinus',
			group: 'secondary',
			priority: 10,
			enabled: true,
			variant: 'destructive',
		});
	}

	return actions;
}

export async function executePlaylistAction(
	actionId: string,
	context: TrackActionContext
): Promise<boolean> {
	const { playlistId, trackPosition } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
			// Handled by navigation to playlist-picker screen
			return true;

		case CORE_ACTION_IDS.REMOVE_FROM_PLAYLIST:
			if (playlistId && trackPosition !== undefined) {
				libraryService.removeTrackFromPlaylist(playlistId, trackPosition);
				return true;
			}
			return false;

		default:
			return false;
	}
}
