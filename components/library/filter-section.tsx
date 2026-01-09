import { View, ScrollView, Switch } from 'react-native';
import { Text } from '@/components/ui/text';
import { FilterChip } from './filter-chip';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';
import type { LibraryFilters } from '@/src/domain/utils/track-filtering';

interface FilterSectionProps {
  artists: ArtistReference[];
  albums: AlbumReference[];
  activeFilters: LibraryFilters;
  onToggleArtist: (artistId: string) => void;
  onToggleAlbum: (albumId: string) => void;
  onToggleFavorites: () => void;
}

export function FilterSection({
  artists,
  albums,
  activeFilters,
  onToggleArtist,
  onToggleAlbum,
  onToggleFavorites,
}: FilterSectionProps) {
  return (
    <View className="gap-4">
      {/* Favorites toggle */}
      <View className="flex-row items-center justify-between py-1">
        <Text className="text-base">Favorites only</Text>
        <Switch
          value={activeFilters.favoritesOnly}
          onValueChange={onToggleFavorites}
        />
      </View>

      {/* Artists */}
      {artists.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-muted-foreground uppercase">
            Artists
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {artists.map((artist) => (
              <FilterChip
                key={artist.id}
                label={artist.name}
                selected={activeFilters.artistIds.includes(artist.id)}
                onPress={() => onToggleArtist(artist.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Albums */}
      {albums.length > 0 && (
        <View className="gap-2">
          <Text className="text-sm font-medium text-muted-foreground uppercase">
            Albums
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
          >
            {albums.map((album) => (
              <FilterChip
                key={album.id}
                label={album.name}
                selected={activeFilters.albumIds.includes(album.id)}
                onPress={() => onToggleAlbum(album.id)}
              />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
