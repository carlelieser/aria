import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { CORE_ACTION_IDS } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { useIsFavorite } from '@/src/application/state/library-store';
import { useIsDownloaded, useIsDownloading } from '@/src/application/state/download-store';
import { useToast } from '@/hooks/use-toast';

interface UseTrackActionsOptions {
	track: Track;

	source: TrackActionSource;
}

interface UseTrackActionsResult {
	actions: TrackAction[];

	isLoading: boolean;

	executeAction: (actionId: string) => Promise<void>;

	refresh: () => Promise<void>;
}

export function useTrackActions({ track, source }: UseTrackActionsOptions): UseTrackActionsResult {
	const [actions, setActions] = useState<TrackAction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { success } = useToast();

	const isFavorite = useIsFavorite(track.id.value);
	const isDownloaded = useIsDownloaded(track.id.value);
	const isDownloading = useIsDownloading(track.id.value);

	const loadActions = useCallback(async () => {
		setIsLoading(true);
		try {
			const fetchedActions = await trackActionsService.getActionsForTrack({
				track,
				source,
			});
			setActions(fetchedActions);
		} finally {
			setIsLoading(false);
		}
	}, [track, source]);

	useEffect(() => {
		loadActions();
	}, [loadActions, isFavorite, isDownloaded, isDownloading]);

	const executeAction = useCallback(
		async (actionId: string) => {
			switch (actionId) {
				case CORE_ACTION_IDS.VIEW_ARTIST: {
					const artist = track.artists[0];
					if (artist) {
						router.push({
							pathname: '/artist/[id]',
							params: { id: artist.id, name: artist.name },
						});
					}
					return;
				}

				case CORE_ACTION_IDS.VIEW_ALBUM: {
					const album = track.album;
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
						params: { trackId: track.id.value },
					});
					return;

				default: {
					const wasFavorite = isFavorite;

					await trackActionsService.executeAction(actionId, { track, source });

					switch (actionId) {
						case CORE_ACTION_IDS.ADD_TO_LIBRARY:
							success('Added to library', track.title);
							break;
						case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
							success('Removed from library', track.title);
							break;
						case CORE_ACTION_IDS.ADD_TO_QUEUE:
							success('Added to queue', track.title);
							break;
						case CORE_ACTION_IDS.TOGGLE_FAVORITE:
							success(
								wasFavorite ? 'Removed from favorites' : 'Added to favorites',
								track.title
							);
							break;
						case CORE_ACTION_IDS.DOWNLOAD:
							success('Download started', track.title);
							break;
						case CORE_ACTION_IDS.REMOVE_DOWNLOAD:
							success('Download removed', track.title);
							break;
					}

					await loadActions();
				}
			}
		},
		[track, source, loadActions, isFavorite, success]
	);

	return {
		actions,
		isLoading,
		executeAction,
		refresh: loadActions,
	};
}
