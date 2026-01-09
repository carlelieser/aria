/**
 * TrackOptionsMenu Component
 *
 * Options menu for track actions using bottom sheet.
 * Uses M3 theming.
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import * as LucideIcons from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { IconButton, Text } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { ActionSheet, type ActionSheetGroup } from '@/components/ui/action-sheet';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { ACTION_GROUP_ORDER } from '@/src/domain/actions/track-action';
import { useTrackActions } from '@/hooks/use-track-actions';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';

type Orientation = 'vertical' | 'horizontal';

interface TrackOptionsMenuProps {
  track: Track;
  source: TrackActionSource;
  orientation?: Orientation;
}

function getIconComponent(iconName: string): LucideIcon {
  const icons = LucideIcons as unknown as Record<string, LucideIcon>;
  return icons[iconName] || LucideIcons.Circle;
}

export function TrackOptionsMenu({
  track,
  source,
  orientation = 'vertical',
}: TrackOptionsMenuProps) {
  const bottomSheetRef = useRef<BottomSheetMethods>(null);
  const { actions, executeAction } = useTrackActions({ track, source });
  const { colors } = useAppTheme();

  const groups = useMemo<ActionSheetGroup[]>(() => {
    const groupMap = new Map<string, typeof actions>();

    for (const action of actions) {
      const group = groupMap.get(action.group) || [];
      group.push(action);
      groupMap.set(action.group, group);
    }

    return ACTION_GROUP_ORDER.filter((groupName) => groupMap.has(groupName)).map(
      (groupName) => ({
        items: groupMap.get(groupName)!.map((action) => ({
          id: action.id,
          label: action.label,
          icon: getIconComponent(action.icon),
          variant: action.variant,
          disabled: !action.enabled,
          checked: action.checked,
        })),
      })
    );
  }, [actions]);

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.snapToIndex(0);
  }, []);

  const handleSelect = useCallback(
    (itemId: string) => {
      executeAction(itemId);
    },
    [executeAction]
  );

  const artwork = getBestArtwork(track.artwork, 56);
  const artistNames = getArtistNames(track);

  const header = (
    <View style={styles.header}>
      <Image
        source={{ uri: artwork?.url }}
        style={styles.headerArtwork}
        contentFit="cover"
      />
      <View style={styles.headerText}>
        <Text
          variant="bodyLarge"
          numberOfLines={1}
          style={{ color: colors.onSurface, fontWeight: '600' }}
        >
          {track.title}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: colors.onSurfaceVariant }}
        >
          {artistNames}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      <IconButton
        icon={() => (
          <Icon
            as={
              orientation === 'horizontal'
                ? LucideIcons.MoreHorizontal
                : LucideIcons.MoreVertical
            }
            size={20}
            color={colors.onSurfaceVariant}
          />
        )}
        onPress={handleOpen}
        size={20}
      />

      <ActionSheet
        ref={bottomSheetRef}
        groups={groups}
        onSelect={handleSelect}
        header={header}
        portalName={track.id.value}
      />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerArtwork: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  headerText: {
    flex: 1,
  },
});
