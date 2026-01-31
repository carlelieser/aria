/**
 * LyricsDisplay Component
 *
 * Displays synced or plain lyrics with auto-scroll to current line.
 * Uses M3 theming.
 */

import { useRef, useEffect, useCallback } from 'react';
import { View, StyleSheet, Pressable, type ScrollView } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { Text } from 'react-native-paper';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	FadeIn,
	FadeOut,
} from 'react-native-reanimated';
import { useLyrics } from '@/hooks/use-lyrics';
import { usePlayer } from '@/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useAppTheme } from '@/lib/theme';
import { Skeleton } from '@/components/ui/skeleton';

interface LyricsDisplayProps {
	maxHeight?: number;
	onLineTap?: (timeMs: number) => void;
}

const LINE_HEIGHT = 32;
const VISIBLE_LINES = 5;

export function LyricsDisplay({ maxHeight, onLineTap }: LyricsDisplayProps) {
	const { colors } = useAppTheme();
	const { lyrics, currentLineIndex, isLoading, hasAnyLyrics, hasSyncedLyrics } = useLyrics();
	const { seekTo } = usePlayer();
	const scrollViewRef = useRef<ScrollView>(null);
	const isUserScrolling = useRef(false);
	const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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

	const handleScrollBegin = useCallback(() => {
		isUserScrolling.current = true;
		if (scrollTimeout.current) {
			clearTimeout(scrollTimeout.current);
		}
	}, []);

	const handleScrollEnd = useCallback(() => {
		scrollTimeout.current = setTimeout(() => {
			isUserScrolling.current = false;
		}, 3000);
	}, []);

	useEffect(() => {
		return () => {
			if (scrollTimeout.current) {
				clearTimeout(scrollTimeout.current);
			}
		};
	}, []);

	useEffect(() => {
		if (
			!isUserScrolling.current &&
			currentLineIndex >= 0 &&
			scrollViewRef.current &&
			hasSyncedLyrics
		) {
			const scrollY = Math.max(0, currentLineIndex * LINE_HEIGHT - LINE_HEIGHT * 2);
			scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
		}
	}, [currentLineIndex, hasSyncedLyrics]);

	if (isLoading) {
		return (
			<View style={styles.container}>
				<View style={styles.loadingContainer}>
					<Skeleton width="80%" height={20} rounded="sm" />
					<Skeleton width="60%" height={20} rounded="sm" />
					<Skeleton width="70%" height={20} rounded="sm" />
					<Skeleton width="50%" height={20} rounded="sm" />
				</View>
			</View>
		);
	}

	if (!hasAnyLyrics) {
		return (
			<View style={styles.container}>
				<View style={styles.noLyricsContainer}>
					<Text
						variant="bodyMedium"
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
						variant="labelSmall"
						style={[styles.attribution, { color: colors.onSurfaceVariant }]}
					>
						{lyrics.attribution}
					</Text>
				)}
			</Animated.View>
		);
	}

	// Plain lyrics fallback
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
				<Text variant="bodyMedium" style={{ color: colors.onSurface, lineHeight: 24 }}>
					{lyrics?.plainLyrics}
				</Text>
			</PlayerAwareScrollView>

			{lyrics?.attribution && (
				<Text
					variant="labelSmall"
					style={[styles.attribution, { color: colors.onSurfaceVariant }]}
				>
					{lyrics.attribution}
				</Text>
			)}
		</Animated.View>
	);
}

interface LyricLineProps {
	text: string;
	isActive: boolean;
	isPast: boolean;
	onPress: () => void;
}

function LyricLine({ text, isActive, isPast, onPress }: LyricLineProps) {
	const { colors } = useAppTheme();
	const scale = useSharedValue(1);
	const opacity = useSharedValue(isPast ? 0.5 : isActive ? 1 : 0.7);

	useEffect(() => {
		if (isActive) {
			scale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else {
			scale.value = withSpring(1, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(isPast ? 0.5 : 0.7, { duration: 200 });
		}
	}, [isActive, isPast, scale, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const textColor = isActive ? colors.primary : colors.onSurface;

	return (
		<Pressable onPress={onPress}>
			<Animated.View style={[styles.lineContainer, animatedStyle]}>
				<Text
					variant={isActive ? 'titleMedium' : 'bodyLarge'}
					style={[
						styles.lineText,
						{
							color: textColor,
							fontWeight: isActive ? '700' : '400',
						},
					]}
				>
					{text || '♪'}
				</Text>
			</Animated.View>
		</Pressable>
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
	lineContainer: {
		height: LINE_HEIGHT,
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	lineText: {
		textAlign: 'center',
	},
	attribution: {
		textAlign: 'center',
		marginTop: 12,
		opacity: 0.7,
	},
});
