/**
 * SplashWeb
 *
 * Web-specific rendering of the animated splash screen.
 * Uses CSS transitions instead of Reanimated for reliable web animation.
 */

import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { AnimatedPolygonView } from '../animated-polygon';
import { POLYGON_SIZE, ICON_SIZE, ANIMATION_DURATION, PROGRESS_BAR_WIDTH } from './types';
import { styles } from './styles';

interface SplashWebProps {
	readonly dismissReady: boolean;
	readonly screenHeight: number;
	readonly progress: number;
	readonly progressMessage: string;
	readonly segments: number;
	readonly colors: {
		readonly background: string;
		readonly onSurface: string;
		readonly surfaceVariant: string;
		readonly onSurfaceVariant: string;
	};
	readonly onAnimationComplete?: () => void;
}

export function SplashWeb({
	dismissReady,
	screenHeight,
	progress,
	progressMessage,
	segments,
	colors,
	onAnimationComplete,
}: SplashWebProps) {
	const [webDismissing, setWebDismissing] = useState(false);

	useEffect(() => {
		if (dismissReady) {
			setWebDismissing(true);
			const timer = setTimeout(() => {
				onAnimationComplete?.();
			}, ANIMATION_DURATION);
			return () => clearTimeout(timer);
		}
	}, [dismissReady, onAnimationComplete]);

	return (
		<View
			style={[
				styles.container,
				{
					transform: [{ translateY: webDismissing ? -screenHeight : 0 }],
					opacity: webDismissing ? 0 : 1,
					// @ts-expect-error - web-only CSS property
					transition: `transform ${ANIMATION_DURATION}ms ease-in, opacity ${ANIMATION_DURATION}ms ease-out`,
				},
			]}
		>
			<View style={[styles.background, { backgroundColor: colors.background }]} />
			<View style={styles.content}>
				<View style={styles.iconWrapper}>
					<Image
						source={require('@/assets/icon-content.png')}
						style={{ width: ICON_SIZE, height: ICON_SIZE }}
						resizeMode={'contain'}
					/>
				</View>
				<View style={styles.polygonWrapper}>
					<AnimatedPolygonView
						segments={segments}
						size={POLYGON_SIZE}
						fill={colors.onSurface}
						stroke={colors.onSurface}
						strokeWidth={40}
						springConfig={{ damping: 20, stiffness: 100, mass: 0.5 }}
					/>
				</View>
			</View>
			<View style={styles.progressSection}>
				<View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
					<View
						style={[
							styles.progressFill,
							{
								backgroundColor: colors.onSurface,
								width: progress * PROGRESS_BAR_WIDTH,
							},
						]}
					/>
				</View>
				<Text
					style={[styles.progressLabel, { color: colors.onSurfaceVariant }]}
					numberOfLines={1}
				>
					{progressMessage}
				</Text>
			</View>
		</View>
	);
}
