/**
 * SyncedLyricsDisplay
 *
 * Displays synced lyrics with line-by-line highlighting, auto-scroll,
 * and tap-to-seek functionality.
 */

import { useEffect, useRef, useCallback, memo } from 'react';
import { View, StyleSheet, Pressable, type ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, withTiming, interpolateColor } from 'react-native-reanimated';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { useCurrentLineIndex } from '@/src/application/state/lyrics-store';
import { usePlayer } from '@/src/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useAppTheme } from '@/lib/theme';
import { FontFamily } from '@/lib/theme/typography';
import type { LyricsLine } from '@shared/types/lyrics';

interface LyricsLineItemProps {
	readonly line: LyricsLine;
	readonly index: number;
	readonly currentIndex: number;
	readonly onPress: (startTime: number) => void;
	readonly activeColor: string;
	readonly inactiveColor: string;
}

const LyricsLineItem = memo(function LyricsLineItem({
	line,
	index,
	currentIndex,
	onPress,
	activeColor,
	inactiveColor,
}: LyricsLineItemProps) {
	const isCurrent = index === currentIndex;
	const isPast = index < currentIndex;

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = isCurrent ? 1 : isPast ? 0.4 : 0.6;
		const scale = isCurrent ? 1.05 : 1;

		return {
			opacity: withTiming(opacity, { duration: 200 }),
			transform: [{ scale: withTiming(scale, { duration: 500 }) }],
		};
	}, [isCurrent, isPast]);

	const textAnimatedStyle = useAnimatedStyle(() => {
		const color = interpolateColor(isCurrent ? 1 : 0, [0, 1], [inactiveColor, activeColor]);
		const fontSize = withTiming(isCurrent ? 36 : 24, { duration: 300 });
		return { color, fontSize };
	}, [isCurrent, activeColor, inactiveColor]);

	const handlePress = useCallback(() => {
		onPress(line.startTime);
	}, [line.startTime, onPress]);

	if (!line.text.trim()) {
		return <View style={styles.emptyLine} />;
	}

	return (
		<Pressable onPress={handlePress}>
			<Animated.View style={[styles.lineContainer, animatedStyle]}>
				<Animated.Text
					style={[
						styles.lineText,
						isCurrent && styles.currentLineFont,
						textAnimatedStyle,
					]}
				>
					{line.text}
				</Animated.Text>
			</Animated.View>
		</Pressable>
	);
});

interface SyncedLyricsDisplayProps {
	readonly lines: LyricsLine[];
	readonly attribution?: string;
}

export function SyncedLyricsDisplay({ lines, attribution }: SyncedLyricsDisplayProps) {
	const { colors } = useAppTheme();
	const scrollViewRef = useRef<ScrollView>(null);
	const lineLayouts = useRef<Map<number, { y: number; height: number }>>(new Map());
	const viewportHeight = useRef(0);

	const currentLineIndex = useCurrentLineIndex();
	const { seekTo } = usePlayer();

	// Auto-scroll to center the active line vertically
	useEffect(() => {
		if (currentLineIndex < 0) {
			return;
		}

		const layout = lineLayouts.current.get(currentLineIndex);
		if (layout && scrollViewRef.current) {
			const lineCenter = layout.y + layout.height / 2;
			scrollViewRef.current.scrollTo({
				y: Math.max(0, lineCenter - viewportHeight.current / 2),
				animated: true,
			});
		}
	}, [currentLineIndex]);

	const handleLinePress = useCallback(
		(startTimeMs: number) => {
			seekTo(Duration.fromMilliseconds(startTimeMs));
		},
		[seekTo]
	);

	const handleLineLayout = useCallback((index: number, y: number, height: number) => {
		lineLayouts.current.set(index, { y, height });
	}, []);

	return (
		<PlayerAwareScrollView
			ref={scrollViewRef}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
			onLayout={(e) => {
				viewportHeight.current = e.nativeEvent.layout.height;
			}}
		>
			<View style={styles.lyricsContainer}>
				{lines.map((line, index) => (
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
						<LyricsLineItem
							line={line}
							index={index}
							currentIndex={currentLineIndex}
							onPress={handleLinePress}
							activeColor={colors.primary}
							inactiveColor={colors.onSurfaceVariant}
						/>
					</View>
				))}
				{attribution && (
					<Text
						variant={'labelSmall'}
						style={[styles.attribution, { color: colors.onSurfaceVariant }]}
					>
						{attribution}
					</Text>
				)}
			</View>
		</PlayerAwareScrollView>
	);
}

const styles = StyleSheet.create({
	scrollContent: {
		paddingVertical: 32,
		paddingHorizontal: 20,
	},
	lyricsContainer: {
		gap: 8,
	},
	lineContainer: {
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	lineText: {
		fontFamily: FontFamily.medium,
		textAlign: 'center',
	},
	currentLineFont: {
		fontFamily: FontFamily.bold,
	},
	emptyLine: {
		height: 24,
	},
	attribution: {
		textAlign: 'center',
		marginTop: 32,
		opacity: 0.7,
	},
});
