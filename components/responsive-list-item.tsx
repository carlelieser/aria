/**
 * ResponsiveListItem Component
 *
 * Responsive list item for music search results.
 * Uses M3 theming.
 */

import { MusicResponsiveListItem } from '@/node_modules/youtubei.js/dist/src/parser/nodes';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Text } from 'react-native-paper';
import { useContext } from 'react';
import { AppContext } from '@/contexts/app';
import { router } from 'expo-router';
import { useAppTheme } from '@/lib/theme';

export function ResponsiveListItem(props: { data: MusicResponsiveListItem }) {
  const context = useContext(AppContext);
  const { colors } = useAppTheme();

  if (props.data.item_type === 'song') {
    return (
      <TouchableOpacity
        style={styles.container}
        onPress={() => {
          context.setPlaying(props.data);
          router.navigate('/player');
        }}
      >
        <Image
          source={{
            uri: props.data.thumbnail?.contents[0].url,
          }}
          style={styles.artwork}
        />
        <View style={styles.textContainer}>
          <Text variant="bodyMedium" style={{ color: colors.onSurface }}>
            {props.data.title}
          </Text>
          <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
            {props.data.artists?.map((artist) => artist.name).join(', ')} ·{' '}
            {props.data.album?.name}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
    paddingVertical: 16,
  },
  artwork: {
    width: 48,
    height: 48,
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
});
