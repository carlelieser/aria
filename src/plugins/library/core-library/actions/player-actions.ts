import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { sleepTimerService } from '../../../../application/services/sleep-timer-service';
import { usePlayerUIStore } from '../../../../application/state/player-ui-store';
import { useLyricsStore } from '../../../../application/state/lyrics-store';

export function getPlayerActions(context: TrackActionContext): TrackAction[] {
	const { source } = context;

	if (source !== 'player') {
		return [];
	}

	const actions: TrackAction[] = [];
	const sleepTimerActive = sleepTimerService.getState().isActive;
	const showLyrics = usePlayerUIStore.getState().showLyrics;
	const hasLyrics = _hasLyrics();

	actions.push({
		id: CORE_ACTION_IDS.SLEEP_TIMER,
		label: sleepTimerActive ? 'Sleep Timer (On)' : 'Sleep Timer',
		icon: 'Timer',
		group: 'secondary',
		priority: 45,
		enabled: true,
		checked: sleepTimerActive,
	});

	if (hasLyrics) {
		actions.push({
			id: CORE_ACTION_IDS.TOGGLE_LYRICS,
			label: showLyrics ? 'Hide Lyrics' : 'Show Lyrics',
			icon: 'MicVocal',
			group: 'secondary',
			priority: 44,
			enabled: true,
			checked: showLyrics,
		});
	}

	return actions;
}

export async function executePlayerAction(
	actionId: string,
	_context: TrackActionContext
): Promise<boolean> {
	switch (actionId) {
		case CORE_ACTION_IDS.SLEEP_TIMER:
			usePlayerUIStore.getState().openSleepTimerSheet();
			return true;

		case CORE_ACTION_IDS.TOGGLE_LYRICS:
			usePlayerUIStore.getState().toggleShowLyrics();
			return true;

		default:
			return false;
	}
}

function _hasLyrics(): boolean {
	const lyrics = useLyricsStore.getState().lyrics;
	return lyrics !== null && (!!lyrics.syncedLyrics?.length || !!lyrics.plainLyrics);
}
