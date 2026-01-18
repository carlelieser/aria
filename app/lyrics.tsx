import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MicVocalIcon, AlertCircleIcon } from 'lucide-react-native';
import { Text } from 'react-native-paper';
import { Image } from 'expo-image';
import { Skeleton } from '@/components/ui/skeleton';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import { SyncedLyricsDisplay } from '@/components/lyrics/synced-lyrics-display';
import { useNavigationContextStore } from '@/src/application/state/navigation-context-store';
import { useLyricsForTrack } from '@/hooks/use-lyrics';
import { getArtistNames } from '@/src/domain/entities/track';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme } from '@/lib/theme';

export default function LyricsScreen() {
	const { trackId } = useLocalSearchParams<{ trackId: string }>();
	const { colors } = useAppTheme();

	const track = useNavigationContextStore((state) => state.track);
	const { lyrics, isLoading, error } = useLyricsForTrack(track);

	useEffect(() => {
		if (!trackId) {
			router.back();
		}
	}, [trackId]);

	if (!track) {
		return (
			<PageLayout header={{ title: 'Lyrics', showBack: true }}>
				<EmptyState
					icon={AlertCircleIcon}
					title="Track not found"
					description="Unable to load track information"
				/>
			</PageLayout>
		);
	}

	const artwork = getBestArtwork(track.artwork, 80);
	const artistNames = getArtistNames(track);
	const hasSyncedLyrics = !!lyrics?.syncedLyrics?.length;
	const hasPlainLyrics = !!lyrics?.plainLyrics;
	const hasLyrics = hasSyncedLyrics || hasPlainLyrics;

	const trackInfoHeader = (
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
	);

	const renderContent = () => {
		if (isLoading) {
			return (
				<PlayerAwareScrollView
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.loadingContainer}>
						<Skeleton width="80%" height={24} rounded="sm" />
						<Skeleton width="60%" height={24} rounded="sm" />
						<Skeleton width="70%" height={24} rounded="sm" />
						<Skeleton width="55%" height={24} rounded="sm" />
						<Skeleton width="75%" height={24} rounded="sm" />
						<Skeleton width="65%" height={24} rounded="sm" />
						<Skeleton width="85%" height={24} rounded="sm" />
					</View>
				</PlayerAwareScrollView>
			);
		}

		if (error) {
			return (
				<EmptyState
					icon={AlertCircleIcon}
					title="Failed to load lyrics"
					description={error}
				/>
			);
		}

		if (!hasLyrics) {
			return (
				<EmptyState
					icon={MicVocalIcon}
					title="No lyrics available"
					description="We couldn't find lyrics for this track"
				/>
			);
		}

		if (hasSyncedLyrics) {
			return (
				<SyncedLyricsDisplay
					lines={lyrics.syncedLyrics!}
					attribution={lyrics.attribution}
				/>
			);
		}

		return (
			<PlayerAwareScrollView
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<Text
					variant="bodyLarge"
					style={[styles.plainLyricsText, { color: colors.onSurface }]}
				>
					{lyrics.plainLyrics}
				</Text>
				{lyrics.attribution && (
					<Text
						variant="labelSmall"
						style={[styles.attribution, { color: colors.onSurfaceVariant }]}
					>
						{lyrics.attribution}
					</Text>
				)}
			</PlayerAwareScrollView>
		);
	};

	return (
		<PageLayout
			header={{
				title: 'Lyrics',
				showBack: true,
				backgroundColor: colors.surfaceContainerHigh,
				borderRadius: 24,
				belowTitle: trackInfoHeader,
				extended: true,
			}}
		>
			{renderContent()}
		</PageLayout>
	);
}

const styles = StyleSheet.create({
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
		paddingVertical: 32,
		paddingHorizontal: 20,
	},
	loadingContainer: {
		gap: 20,
		alignItems: 'center',
		paddingVertical: 24,
	},
	plainLyricsText: {
		fontSize: 18,
		lineHeight: 32,
		textAlign: 'center',
	},
	attribution: {
		textAlign: 'center',
		marginTop: 32,
		opacity: 0.7,
	},
});
