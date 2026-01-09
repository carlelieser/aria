import { View, ScrollView } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { FilterChip } from './filter-chip';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';
import type { LibraryFilters } from '@/src/domain/utils/track-filtering';

interface ActiveFiltersBarProps {
  activeFilters: LibraryFilters;
  artists: ArtistReference[];
  albums: AlbumReference[];
  onToggleArtist: (artistId: string) => void;
  onToggleAlbum: (albumId: string) => void;
  onToggleFavorites: () => void;
  onClearAll: () => void;
}

export function ActiveFiltersBar({
  activeFilters,
  artists,
  albums,
  onToggleArtist,
  onToggleAlbum,
  onToggleFavorites,
  onClearAll,
}: ActiveFiltersBarProps) {
  const selectedArtists = artists.filter((a) =>
    activeFilters.artistIds.includes(a.id)
  );
  const selectedAlbums = albums.filter((a) =>
    activeFilters.albumIds.includes(a.id)
  );

  const hasFilters =
    activeFilters.favoritesOnly ||
    selectedArtists.length > 0 ||
    selectedAlbums.length > 0;

  if (!hasFilters) {
    return null;
  }

  return (
    <View className="flex-row items-center px-4 gap-2">
      <Text className="text-sm text-muted-foreground">Filtered:</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2 flex-row items-center"
        className="flex-1"
      >
        {activeFilters.favoritesOnly && (
          <FilterChip
            label="Favorites"
            selected
            showRemoveIcon
            onRemove={onToggleFavorites}
          />
        )}
        {selectedArtists.map((artist) => (
          <FilterChip
            key={artist.id}
            label={artist.name}
            selected
            showRemoveIcon
            onRemove={() => onToggleArtist(artist.id)}
          />
        ))}
        {selectedAlbums.map((album) => (
          <FilterChip
            key={album.id}
            label={album.name}
            selected
            showRemoveIcon
            onRemove={() => onToggleAlbum(album.id)}
          />
        ))}
      </ScrollView>
      <Button variant="ghost" size="sm" onPress={onClearAll}>
        <Text className="text-sm text-muted-foreground">Clear</Text>
      </Button>
    </View>
  );
}
