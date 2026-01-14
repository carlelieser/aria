/**
 * Hook for executing track actions.
 *
 * This hook handles only action execution, not loading.
 * Actions are pre-loaded by track-options-store before the sheet opens.
 */

import { useCallback, useRef } from 'react';
import { router } from 'expo-router';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { CORE_ACTION_IDS } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { downloadService } from '@/src/application/services/download-service';
import { useIsFavorite } from '@/src/application/state/library-store';
import { setNavigationTrack } from '@/src/application/state/navigation-context-store';
import { usePlayerUIStore } from '@/src/application/state/player-ui-store';
import { useToast } from '@/hooks/use-toast';
import { useRefreshTrackOptionsActions } from '@/src/application/state/track-options-store';

interface UseTrackActionExecutorOptions {
	track: Track;
	source: TrackActionSource;
	playlistId?: string;
	trackPosition?: number;
}

interface UseTrackActionExecutorResult {
	executeAction: (actionId: string) => Promise<void>;
}

export function useTrackActionExecutor({
	track,
	source,
	playlistId,
	trackPosition,
}: UseTrackActionExecutorOptions): UseTrackActionExecutorResult {
	const { success, error } = useToast();
	const refreshActions = useRefreshTrackOptionsActions();

	const trackRef = useRef(track);
	trackRef.current = track;

	const trackIdValue = track.id.value;
	const isFavorite = useIsFavorite(trackIdValue);

	const executeAction = useCallback(
		async (actionId: string) => {
			const currentTrack = trackRef.current;

			switch (actionId) {
				case CORE_ACTION_IDS.VIEW_ARTIST: {
					const artist = currentTrack.artists[0];
					if (artist) {
						router.push({
							pathname: '/artist/[id]',
							params: { id: artist.id, name: artist.name },
						});
					}
					return;
				}

				case CORE_ACTION_IDS.VIEW_ALBUM: {
					const album = currentTrack.album;
					if (album) {
						router.push({
							pathname: '/album/[id]',
							params: { id: album.id, name: album.name },
						});
					}
					return;
				}

				case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
					router.push({
						pathname: '/playlist-picker',
						params: { trackId: currentTrack.id.value },
					});
					return;

				case CORE_ACTION_IDS.REMOVE_FROM_PLAYLIST:
					if (playlistId && trackPosition !== undefined) {
						await trackActionsService.executeAction(actionId, {
							track: currentTrack,
							source,
							playlistId,
							trackPosition,
						});
						success('Removed from playlist', currentTrack.title);
					}
					return;

				case CORE_ACTION_IDS.DOWNLOAD: {
					const result = await downloadService.downloadTrack(currentTrack);
					if (result.success) {
						success('Download complete', currentTrack.title);
					} else {
						error('Download failed', result.error.message);
					}
					await refreshActions();
					return;
				}

				case CORE_ACTION_IDS.VIEW_LYRICS:
					setNavigationTrack(currentTrack);
					router.push(`/lyrics?trackId=${encodeURIComponent(currentTrack.id.value)}`);
					return;

				case CORE_ACTION_IDS.SLEEP_TIMER:
					usePlayerUIStore.getState().openSleepTimerSheet();
					return;

				case CORE_ACTION_IDS.TOGGLE_LYRICS:
					usePlayerUIStore.getState().toggleShowLyrics();
					return;

				default: {
					const wasFavorite = isFavorite;

					await trackActionsService.executeAction(actionId, {
						track: currentTrack,
						source,
						playlistId,
						trackPosition,
					});

					switch (actionId) {
						case CORE_ACTION_IDS.ADD_TO_LIBRARY:
							success('Added to library', currentTrack.title);
							break;
						case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
							success('Removed from library', currentTrack.title);
							break;
						case CORE_ACTION_IDS.ADD_TO_QUEUE:
							success('Added to queue', currentTrack.title);
							break;
						case CORE_ACTION_IDS.TOGGLE_FAVORITE:
							success(
								wasFavorite ? 'Removed from favorites' : 'Added to favorites',
								currentTrack.title
							);
							break;
						case CORE_ACTION_IDS.REMOVE_DOWNLOAD:
							success('Download removed', currentTrack.title);
							break;
					}

					await refreshActions();
				}
			}
		},
		[source, isFavorite, success, error, playlistId, trackPosition, refreshActions]
	);

	return {
		executeAction,
	};
}
