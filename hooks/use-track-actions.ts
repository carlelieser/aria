import { useState, useCallback, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { CORE_ACTION_IDS } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { downloadService } from '@/src/application/services/download-service';
import { useIsFavorite } from '@/src/application/state/library-store';
import { useIsDownloaded, useIsDownloading } from '@/src/application/state/download-store';
import { useToast } from '@/hooks/use-toast';

interface UseTrackActionsOptions {
	track: Track;

	source: TrackActionSource;

	playlistId?: string;

	trackPosition?: number;
}

interface UseTrackActionsResult {
	actions: TrackAction[];

	isLoading: boolean;

	executeAction: (actionId: string) => Promise<void>;

	refresh: () => Promise<void>;
}

export function useTrackActions({
	track,
	source,
	playlistId,
	trackPosition,
}: UseTrackActionsOptions): UseTrackActionsResult {
	const [actions, setActions] = useState<TrackAction[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const { success, error } = useToast();

	const trackRef = useRef(track);
	trackRef.current = track;

	const trackIdValue = track.id.value;
	const isFavorite = useIsFavorite(trackIdValue);
	const isDownloaded = useIsDownloaded(trackIdValue);
	const isDownloading = useIsDownloading(trackIdValue);

	const loadActions = useCallback(async () => {
		setIsLoading(true);
		try {
			const fetchedActions = await trackActionsService.getActionsForTrack({
				track: trackRef.current,
				source,
				playlistId,
				trackPosition,
			});
			setActions(fetchedActions);
		} finally {
			setIsLoading(false);
		}
	}, [source, playlistId, trackPosition]);

	useEffect(() => {
		loadActions();
	}, [loadActions, isFavorite, isDownloaded, isDownloading]);

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
					await loadActions();
					return;
				}

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

					await loadActions();
				}
			}
		},
		[source, loadActions, isFavorite, success, error, playlistId, trackPosition]
	);

	return {
		actions,
		isLoading,
		executeAction,
		refresh: loadActions,
	};
}
