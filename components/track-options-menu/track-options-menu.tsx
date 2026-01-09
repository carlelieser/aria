/**
 * TrackOptionsMenu Component
 *
 * Trigger button for track options menu.
 * Opens the shared TrackOptionsSheet via track-options-store.
 */

import React, { useCallback } from 'react';
import { MoreVertical, MoreHorizontal } from 'lucide-react-native';
import { IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { useOpenTrackOptions } from '@/src/application/state/track-options-store';

type Orientation = 'vertical' | 'horizontal';

interface TrackOptionsMenuProps {
  track: Track;
  source: TrackActionSource;
  orientation?: Orientation;
}

export function TrackOptionsMenu({
  track,
  source,
  orientation = 'vertical',
}: TrackOptionsMenuProps) {
  const openTrackOptions = useOpenTrackOptions();
  const { colors } = useAppTheme();

  const handleOpen = useCallback(() => {
    openTrackOptions(track, source);
  }, [openTrackOptions, track, source]);

  return (
    <IconButton
      icon={() => (
        <Icon
          as={orientation === 'horizontal' ? MoreHorizontal : MoreVertical}
          size={20}
          color={colors.onSurfaceVariant}
        />
      )}
      onPress={handleOpen}
      size={20}
    />
  );
}
