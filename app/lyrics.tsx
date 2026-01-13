/**
 * LyricsScreen
 *
 * Modal screen for viewing lyrics of a track.
 * Uses M3 theming.
 */

import { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, MicVocalIcon } from 'lucide-react-native';
import { Text, IconButton } from 'react-native-paper';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrack } from '@/src/application/state/library-store';
import { useLyricsForTrack } from '@/hooks/use-lyrics';
import { getArtistNames } from '@/src/domain/entities/track';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme } from '@/lib/theme';

export default function LyricsScreen() {
	const insets = useSafeAreaInsets();
	const { trackId } = useLocalSearchParams<{ trackId: string }>();
	const { colors } = useAppTheme();

	const track = useTrack(trackId);
	const { lyrics, isLoading, error } = useLyricsForTrack(track ?? null);

	useEffect(() => {
		if (!trackId) {
			router.back();
		}
	}, [trackId]);

	if (!track) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<View style={[styles.header, { paddingTop: insets.top + 16 }]}>
					<IconButton
						icon={() => <Icon as={ChevronLeftIcon} size={22} color={colors.onSurface} />}
						onPress={() => router.back()}
					/>
					<Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700' }}>
						Lyrics
					</Text>
					<View style={styles.headerSpacer} />
				</View>
				<View style={styles.emptyState}>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						Track not found
					</Text>
				</View>
			</View>
		);
	}

	const artwork = getBestArtwork(track.artwork, 80);
	const artistNames = getArtistNames(track);
	const hasLyrics = !!lyrics?.syncedLyrics?.length || !!lyrics?.plainLyrics;
	const lyricsText = lyrics?.syncedLyrics?.map((line) => line.text).join('\n') || lyrics?.plainLyrics;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{ backgroundColor: colors.surfaceContainerHigh, paddingTop: insets.top + 16 },
				]}
			>
				<View style={styles.headerRow}>
					<IconButton
						icon={() => <Icon as={ChevronLeftIcon} size={22} color={colors.onSurface} />}
						onPress={() => router.back()}
					/>
					<Text variant="titleLarge" style={{ color: colors.onSurface, fontWeight: '700' }}>
						Lyrics
					</Text>
					<View style={styles.headerSpacer} />
				</View>

				<View style={styles.trackInfo}>
					<Image source={{ uri: artwork?.url }} style={styles.artwork} contentFit="cover" />
					<View style={styles.trackText}>
						<Text
							variant="bodyLarge"
							numberOfLines={1}
							style={{ color: colors.onSurface, fontWeight: '600' }}
						>
							{track.title}
						</Text>
						<Text
							variant="bodyMedium"
							numberOfLines={1}
							style={{ color: colors.onSurfaceVariant }}
						>
							{artistNames}
						</Text>
					</View>
				</View>
			</View>

			<ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
				showsVerticalScrollIndicator={false}
			>
				{isLoading ? (
					<View style={styles.loadingContainer}>
						<Skeleton width="80%" height={20} rounded="sm" />
						<Skeleton width="60%" height={20} rounded="sm" />
						<Skeleton width="70%" height={20} rounded="sm" />
						<Skeleton width="55%" height={20} rounded="sm" />
						<Skeleton width="75%" height={20} rounded="sm" />
					</View>
				) : error ? (
					<View style={styles.emptyState}>
						<Icon as={MicVocalIcon} size={48} color={colors.onSurfaceVariant} />
						<Text
							variant="bodyMedium"
							style={{ color: colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}
						>
							Failed to load lyrics
						</Text>
						<Text
							variant="bodySmall"
							style={{ color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}
						>
							{error}
						</Text>
					</View>
				) : !hasLyrics ? (
					<View style={styles.emptyState}>
						<Icon as={MicVocalIcon} size={48} color={colors.onSurfaceVariant} />
						<Text
							variant="bodyMedium"
							style={{ color: colors.onSurfaceVariant, marginTop: 16, textAlign: 'center' }}
						>
							No lyrics available
						</Text>
						<Text
							variant="bodySmall"
							style={{ color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' }}
						>
							We could not find lyrics for this track
						</Text>
					</View>
				) : (
					<>
						<Text
							variant="bodyLarge"
							style={[styles.lyricsText, { color: colors.onSurface }]}
						>
							{lyricsText}
						</Text>
						{lyrics?.attribution && (
							<Text
								variant="labelSmall"
								style={[styles.attribution, { color: colors.onSurfaceVariant }]}
							>
								{lyrics.attribution}
							</Text>
						)}
					</>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 8,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerSpacer: {
		width: 48,
	},
	trackInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 16,
	},
	artwork: {
		width: 56,
		height: 56,
		borderRadius: 8,
	},
	trackText: {
		flex: 1,
	},
	scrollContent: {
		paddingVertical: 24,
		paddingHorizontal: 24,
	},
	loadingContainer: {
		gap: 16,
		alignItems: 'center',
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
		paddingHorizontal: 16,
	},
	lyricsText: {
		lineHeight: 28,
		textAlign: 'center',
	},
	attribution: {
		textAlign: 'center',
		marginTop: 24,
		opacity: 0.7,
	},
});
