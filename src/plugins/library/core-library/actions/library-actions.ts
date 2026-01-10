import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { libraryService } from '../../../../application/services/library-service';

export function getLibraryActions(context: TrackActionContext): TrackAction[] {
	const { track, source } = context;
	const isInLibrary = libraryService.isInLibrary(track.id.value);

	if (source !== 'search' && !isInLibrary) {
		return [];
	}

	return [
		{
			id: isInLibrary ? CORE_ACTION_IDS.REMOVE_FROM_LIBRARY : CORE_ACTION_IDS.ADD_TO_LIBRARY,
			label: isInLibrary ? 'Remove from Library' : 'Add to Library',
			icon: 'LibraryBig',
			group: 'primary',
			priority: 110,
			enabled: true,
			variant: isInLibrary ? 'destructive' : 'default',
		},
	];
}

export async function executeLibraryAction(
	actionId: string,
	context: TrackActionContext
): Promise<boolean> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_LIBRARY:
			libraryService.addTrack(track);
			return true;

		case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
			libraryService.removeTrack(track.id.value);
			return true;

		default:
			return false;
	}
}
