/**
 * LyricsDisplay Component
 *
 * Displays synced or plain lyrics with auto-scroll to current line.
 * Uses M3 theming.
 */

import { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { Text } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useLyrics } from '@/src/hooks/use-lyrics';
import { usePlayer } from '@/src/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useAppTheme } from '@/lib/theme';
import { Skeleton } from '@/src/components/ui/skeleton';
import { LyricLine } from './lyric-line';
import { useLyricsScroll } from './use-lyrics-scroll';
import type { LyricsDisplayProps } from './types';

export type { LyricsDisplayProps } from './types';

const LINE_HEIGHT = 32;
const VISIBLE_LINES = 5;

export function LyricsDisplay({ maxHeight, onLineTap }: LyricsDisplayProps) {
	const { colors } = useAppTheme();
	const { lyrics, currentLineIndex, isLoading, hasAnyLyrics, hasSyncedLyrics } = useLyrics();
	const { seekTo } = usePlayer();
	const { scrollViewRef, handleScrollBegin, handleScrollEnd } = useLyricsScroll(
		currentLineIndex,
		hasSyncedLyrics
	);

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
					<Skeleton width={'80%'} height={20} rounded={'sm'} />
					<Skeleton width={'60%'} height={20} rounded={'sm'} />
					<Skeleton width={'70%'} height={20} rounded={'sm'} />
					<Skeleton width={'50%'} height={20} rounded={'sm'} />
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
		const effectiveMaxHeight = maxHeight ?? LINE_HEIGHT * VISIBLE_LINES;

		return (
			<Animated.View
				entering={FadeIn.duration(300)}
				exiting={FadeOut.duration(200)}
				style={styles.container}
			>
				<PlayerAwareScrollView
					ref={scrollViewRef}
					style={[styles.scrollView, { maxHeight: effectiveMaxHeight }]}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					onScrollBeginDrag={handleScrollBegin}
					onScrollEndDrag={handleScrollEnd}
					onMomentumScrollEnd={handleScrollEnd}
				>
					{lyrics.syncedLyrics.map((line, index) => (
						<LyricLine
							key={`${index}-${line.startTime}`}
							text={line.text}
							isActive={index === currentLineIndex}
							isPast={index < currentLineIndex}
							onPress={() => handleLineTap(line.startTime)}
						/>
					))}
				</PlayerAwareScrollView>

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
			<PlayerAwareScrollView
				style={[styles.scrollView, { maxHeight: maxHeight ?? 200 }]}
				contentContainerStyle={styles.plainLyricsContent}
				showsVerticalScrollIndicator={false}
			>
				<Text variant={'bodyMedium'} style={{ color: colors.onSurface, lineHeight: 24 }}>
					{lyrics?.plainLyrics}
				</Text>
			</PlayerAwareScrollView>

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
		width: '100%',
	},
	loadingContainer: {
		gap: 12,
		alignItems: 'center',
		paddingVertical: 16,
	},
	noLyricsContainer: {
		paddingVertical: 24,
		alignItems: 'center',
	},
	scrollView: {
		width: '100%',
		borderRadius: 12,
		overflow: 'hidden',
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
