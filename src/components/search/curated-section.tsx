import { memo, useMemo } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { TrackCard } from '@/src/components/media-list/track-card';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { LucideIcon } from 'lucide-react-native';

interface CuratedSectionProps {
	readonly id: string;
	readonly title: string;
	readonly icon: LucideIcon;
	readonly tracks: Track[];
}

export const CuratedSection = memo(function CuratedSection({
	id,
	title,
	tracks,
}: CuratedSectionProps) {
	const { colors } = useAppTheme();

	const titleStyle = useMemo(
		() => ({ color: colors.onSurface, fontWeight: '600' as const }),
		[colors.onSurface]
	);

	if (tracks.length === 0) return null;

	return (
		<View style={styles.curatedSection}>
			<View style={styles.curatedSectionHeader}>
				<Text variant={'labelLarge'} style={titleStyle}>
					{title}
				</Text>
			</View>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				style={styles.horizontalScrollView}
				contentContainerStyle={styles.horizontalScroll}
			>
				{tracks.map((track, index) => (
					<TrackCard
						key={`${id}-${getTrackIdString(track.id)}`}
						track={track}
						queue={tracks}
						queueIndex={index}
					/>
				))}
			</ScrollView>
		</View>
	);
});

const styles = StyleSheet.create({
	curatedSection: {
		gap: 12,
	},
	curatedSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
	},
	horizontalScrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	horizontalScroll: {
		gap: 16,
		paddingHorizontal: 16,
	},
});
