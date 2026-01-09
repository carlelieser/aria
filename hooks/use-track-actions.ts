import { useState, useCallback, useEffect } from 'react';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { CORE_ACTION_IDS } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { useIsFavorite } from '@/src/application/state/library-store';

interface UseTrackActionsOptions {
  /** The track to get actions for */
  track: Track;
  /** Where the menu was opened from */
  source: TrackActionSource;
}

interface UseTrackActionsResult {
  /** List of available actions */
  actions: TrackAction[];
  /** Whether actions are being loaded */
  isLoading: boolean;
  /** Execute an action by ID */
  executeAction: (actionId: string) => Promise<void>;
  /** Manually refresh the actions list */
  refresh: () => Promise<void>;
}

/**
 * Hook to get and execute track actions
 * Handles navigation actions in the UI layer, delegates others to the service
 */
export function useTrackActions({
  track,
  source,
}: UseTrackActionsOptions): UseTrackActionsResult {
  const [actions, setActions] = useState<TrackAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Re-fetch when favorite status changes to update the toggle label
  const isFavorite = useIsFavorite(track.id.value);

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

  // Reload when track, source, or favorite status changes
  useEffect(() => {
    loadActions();
  }, [loadActions, isFavorite]);

  const executeAction = useCallback(
    async (actionId: string) => {
      // Handle navigation actions in the UI layer
      switch (actionId) {
        case CORE_ACTION_IDS.VIEW_ARTIST:
          // TODO: Implement artist screen route
          // if (track.artists[0]) {
          //   router.push(`/artist/${track.artists[0].id}`);
          // }
          return;

        case CORE_ACTION_IDS.VIEW_ALBUM:
          // TODO: Implement album screen route
          // if (track.album) {
          //   router.push(`/album/${track.album.id}`);
          // }
          return;

        case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
          // TODO: Implement playlist picker screen
          // router.push({
          //   pathname: '/playlist-picker',
          //   params: { trackId: track.id.value },
          // });
          return;

        default:
          // Delegate to service for all other actions
          await trackActionsService.executeAction(actionId, { track, source });

          // Refresh actions after execution (state may have changed)
          await loadActions();
      }
    },
    [track, source, loadActions]
  );

  return {
    actions,
    isLoading,
    executeAction,
    refresh: loadActions,
  };
}
