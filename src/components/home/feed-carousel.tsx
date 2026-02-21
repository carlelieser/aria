import { memo, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { router } from 'expo-router';
import { TrackCard } from '@/src/components/media-list/track-card';
import { AlbumCard } from '@/src/components/media-list/album-card';
import { ArtistCard } from './artist-card';
import { PlaylistCard } from './playlist-card';
import { useAppTheme } from '@/lib/theme';
import type { FeedSection } from '@/src/domain/entities/feed-section';
import type { Track } from '@/src/domain/entities/track';

interface FeedCarouselProps {
	readonly section: FeedSection;
}

export const FeedCarousel = memo(function FeedCarousel({ section }: FeedCarouselProps) {
	const { colors } = useAppTheme();

	const trackItems = section.items
		.filter((item) => item.type === 'track')
		.map((item) => item.data as Track);

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text
					variant="titleMedium"
					style={[styles.title, { color: colors.onSurface }]}
				>
					{section.title}
				</Text>
				{section.subtitle && (
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
						{section.subtitle}
					</Text>
				)}
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.scrollContent}
			>
				{section.items.map((item, index) => (
					<FeedCarouselItem
						key={`${section.id}-${index}`}
						item={item}
						trackQueue={trackItems}
						trackQueueIndex={
							item.type === 'track'
								? trackItems.indexOf(item.data as Track)
								: undefined
						}
					/>
				))}
			</ScrollView>
		</View>
	);
});

interface FeedCarouselItemProps {
	readonly item: FeedSection['items'][number];
	readonly trackQueue: Track[];
	readonly trackQueueIndex?: number;
}

const FeedCarouselItem = memo(function FeedCarouselItem({
	item,
	trackQueue,
	trackQueueIndex,
}: FeedCarouselItemProps) {
	const handleAlbumPress = useCallback(() => {
		if (item.type === 'album') {
			router.push(`/album/${item.data.id.value}`);
		}
	}, [item]);

	const handlePlaylistPress = useCallback(() => {
		if (item.type === 'playlist') {
			router.push({
				pathname: '/remote-playlist/[id]',
				params: {
					id: item.data.id,
					name: item.data.name,
					artwork: item.data.artwork?.[0]?.url,
				},
			});
		}
	}, [item]);

	switch (item.type) {
		case 'track':
			return (
				<TrackCard
					track={item.data}
					queue={trackQueue}
					queueIndex={trackQueueIndex}
				/>
			);
		case 'album':
			return <AlbumCard album={item.data} onPress={handleAlbumPress} />;
		case 'artist':
			return <ArtistCard artist={item.data} />;
		case 'playlist':
			return <PlaylistCard playlist={item.data} onPress={handlePlaylistPress} />;
	}
});

const styles = StyleSheet.create({
	container: {
		gap: 12,
	},
	header: {
		paddingHorizontal: 16,
		gap: 2,
	},
	title: {
		fontWeight: '600',
	},
	scrollContent: {
		paddingHorizontal: 16,
		gap: 12,
	},
});
