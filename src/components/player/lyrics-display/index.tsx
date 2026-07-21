/**
 * LyricsDisplay Component
 *
 * Displays synced or plain lyrics with auto-scroll to current line.
 * Uses M3 theming.
 */

import { useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useLyrics } from '@/src/hooks/use-lyrics';
import { usePlayer } from '@/src/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { usePlayerTheme } from '@/src/components/player/player-theme-context';
import { Skeleton } from '@/src/components/ui/skeleton';
import { LyricLine } from './lyric-line';
import { useLyricsScroll } from './use-lyrics-scroll';
import type { LyricsDisplayProps } from './types';

export type { LyricsDisplayProps } from './types';

const LINE_HEIGHT = 32;

/** Placeholder line widths for the loading state — varied like real lyric lines. */
const LYRIC_SKELETON_WIDTHS: `${number}%`[] = [
	'70%',
	'88%',
	'62%',
	'95%',
	'78%',
	'55%',
	'84%',
	'68%',
	'91%',
	'60%',
	'82%',
	'73%',
];

export function LyricsDisplay({ maxHeight, onLineTap }: LyricsDisplayProps) {
	const { colors } = usePlayerTheme();
	const { lyrics, currentLineIndex, isLoading, hasAnyLyrics, hasSyncedLyrics } = useLyrics();
	const { seekTo } = usePlayer();
	const {
		scrollViewRef,
		handleScrollBegin,
		handleScrollEnd,
		handleLineLayout,
		handleViewportLayout,
	} = useLyricsScroll(currentLineIndex, hasSyncedLyrics);

	const handleLineTap = useCallback(
		async (timeMs: number) => {
			if (onLineTap) {
				onLineTap(timeMs);
			} else {
				await seekTo(Duration.fromMilliseconds(timeMs));
			}
		},
		[onLineTap, seekTo]
	);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					{LYRIC_SKELETON_WIDTHS.map((width, index) => (
						<Skeleton
							key={index}
							width={width}
							height={16}
							rounded={'sm'}
							color={colors.surfaceContainerHighest}
						/>
					))}
				</View>
			</View>
		);
	}

	if (!hasAnyLyrics) {
		return (
			<View style={styles.container}>
				<View style={styles.noLyricsContainer}>
					<Text
						variant={'bodyMedium'}
						style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
					>
						No lyrics available
					</Text>
				</View>
			</View>
		);
	}

	if (hasSyncedLyrics && lyrics?.syncedLyrics) {
		const scrollSizeStyle = maxHeight ? { maxHeight } : styles.fill;

		return (
			<Animated.View
				entering={FadeIn.duration(300)}
				exiting={FadeOut.duration(200)}
				style={styles.container}
			>
				<ScrollView
					ref={scrollViewRef}
					style={[styles.scrollView, scrollSizeStyle]}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					onLayout={(e) => handleViewportLayout(e.nativeEvent.layout.height)}
					onScrollBeginDrag={handleScrollBegin}
					onScrollEndDrag={handleScrollEnd}
					onMomentumScrollEnd={handleScrollEnd}
				>
					{lyrics.syncedLyrics.map((line, index) => (
						<View
							key={`${index}-${line.startTime}`}
							onLayout={(e) =>
								handleLineLayout(
									index,
									e.nativeEvent.layout.y,
									e.nativeEvent.layout.height
								)
							}
						>
							<LyricLine
								text={line.text}
								startTime={line.startTime}
								isActive={index === currentLineIndex}
								isPast={index < currentLineIndex}
								onSeek={handleLineTap}
							/>
						</View>
					))}
				</ScrollView>

				{lyrics.attribution && (
					<Text
						variant={'labelSmall'}
						style={[styles.attribution, { color: colors.onSurfaceVariant }]}
					>
						{lyrics.attribution}
					</Text>
				)}
			</Animated.View>
		);
	}

	return (
		<Animated.View
			entering={FadeIn.duration(300)}
			exiting={FadeOut.duration(200)}
			style={styles.container}
		>
			<ScrollView
				style={[styles.scrollView, maxHeight ? { maxHeight } : styles.fill]}
				contentContainerStyle={styles.plainLyricsContent}
				showsVerticalScrollIndicator={false}
			>
				<Text variant={'bodyMedium'} style={{ color: colors.onSurface, lineHeight: 24 }}>
					{lyrics?.plainLyrics}
				</Text>
			</ScrollView>

			{lyrics?.attribution && (
				<Text
					variant={'labelSmall'}
					style={[styles.attribution, { color: colors.onSurfaceVariant }]}
				>
					{lyrics.attribution}
				</Text>
			)}
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		width: '100%',
	},
	fill: {
		flex: 1,
	},
	loadingContainer: {
		flex: 1,
		gap: 16,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
	},
	noLyricsContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
	},
	scrollView: {
		width: '100%',
		borderRadius: 12,
	},
	scrollContent: {
		paddingVertical: LINE_HEIGHT,
	},
	plainLyricsContent: {
		paddingVertical: 16,
	},
	attribution: {
		textAlign: 'center',
		marginTop: 12,
		opacity: 0.7,
	},
});
