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
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { useCurrentLineIndex } from '@/src/application/state/lyrics-store';
import { usePlayer } from '@/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useAppTheme } from '@/lib/theme';
import type { LyricsLine } from '@/src/plugins/core/interfaces/metadata-provider';

const SCROLL_OFFSET = 120;

interface LyricsLineItemProps {
	line: LyricsLine;
	index: number;
	currentIndex: number;
	onPress: (startTime: number) => void;
	activeColor: string;
	inactiveColor: string;
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
			transform: [{ scale: withTiming(scale, { duration: 200 }) }],
		};
	}, [isCurrent, isPast]);

	const textAnimatedStyle = useAnimatedStyle(() => {
		const color = interpolateColor(isCurrent ? 1 : 0, [0, 1], [inactiveColor, activeColor]);
		return { color };
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
						isCurrent && styles.currentLineText,
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
	lines: LyricsLine[];
	attribution?: string;
}

export function SyncedLyricsDisplay({ lines, attribution }: SyncedLyricsDisplayProps) {
	const { colors } = useAppTheme();
	const scrollViewRef = useRef<ScrollView>(null);
	const linePositions = useRef<Map<number, number>>(new Map());

	const currentLineIndex = useCurrentLineIndex();
	const { seekTo } = usePlayer();

	// Auto-scroll to current line
	useEffect(() => {
		if (currentLineIndex < 0) {
			return;
		}

		const position = linePositions.current.get(currentLineIndex);
		if (position !== undefined && scrollViewRef.current) {
			scrollViewRef.current.scrollTo({
				y: Math.max(0, position - SCROLL_OFFSET),
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

	const handleLineLayout = useCallback((index: number, y: number) => {
		linePositions.current.set(index, y);
	}, []);

	return (
		<PlayerAwareScrollView
			ref={scrollViewRef}
			contentContainerStyle={styles.scrollContent}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.lyricsContainer}>
				{lines.map((line, index) => (
					<View
						key={`${index}-${line.startTime}`}
						onLayout={(e) => handleLineLayout(index, e.nativeEvent.layout.y)}
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
						variant="labelSmall"
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
		fontSize: 18,
		lineHeight: 32,
		textAlign: 'center',
		fontWeight: '500',
	},
	currentLineText: {
		fontSize: 20,
		fontWeight: '700',
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
