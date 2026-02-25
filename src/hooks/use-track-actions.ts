import { useState, useCallback, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { useIsFavorite } from '@/src/application/state/library-store';
import { useIsDownloaded, useIsDownloading } from '@/src/application/state/download-store';
import { setNavigationTrack } from '@/src/application/state/navigation-context-store';

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

			setNavigationTrack(currentTrack);

			const result = await trackActionsService.executeAction(actionId, {
				track: currentTrack,
				source,
				playlistId,
				trackPosition,
			});

			if (result.navigation) {
				const { pathname, params } = result.navigation;
				router.push({
					pathname: pathname as never,
					params: params ?? {},
				});
			}

			if (result.handled) {
				await loadActions();
			}
		},
		[source, loadActions, playlistId, trackPosition]
	);

	return {
		actions,
		isLoading,
		executeAction,
		refresh: loadActions,
	};
}
