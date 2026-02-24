/**
 * AnimatedSplash Component
 *
 * Full-screen animated splash overlay shown during app bootstrap.
 * Displays a morphing polygon with progress bar, then dismisses upward.
 * Delegates to platform-specific renderers for web and native.
 */

import { M3Colors } from '@/lib/theme/colors';
import type { AnimatedSplashProps } from './types';
import { IS_WEB } from './types';
import { usePolygonMorph, usePolygonRotation, useBootstrapProgressAnimation } from './hooks';
import {
	useDismissAnimation,
	useDismissReaction,
	useDismissEffect,
	useNativeDismissReaction,
	useAnimatedStyles,
} from './dismiss-hooks';
import { SplashWeb } from './splash-web';
import { SplashNative } from './splash-native';

export type { AnimatedSplashProps } from './types';

export function AnimatedSplash({
	isReady,
	onAnimationComplete,
	isDark = true,
}: AnimatedSplashProps) {
	const colors = isDark ? M3Colors.dark : M3Colors.light;
	const { segments, polygonScale } = usePolygonMorph();
	const polygonRotation = usePolygonRotation();
	const {
		progress,
		progressMessage,
		progressWidth: bootstrapProgressWidth,
	} = useBootstrapProgressAnimation();

	const {
		screenHeight,
		translateY,
		opacity,
		bootstrapDone,
		dismissReady,
		setDismissReady,
		handleAnimationComplete,
	} = useDismissAnimation(isReady, onAnimationComplete);

	useDismissReaction(bootstrapDone, bootstrapProgressWidth, setDismissReady);
	useDismissEffect(dismissReady, translateY, opacity, handleAnimationComplete, screenHeight);
	useNativeDismissReaction(translateY, screenHeight, handleAnimationComplete);

	// Hooks must be called unconditionally, before any early return
	const animatedStyles = useAnimatedStyles(
		translateY,
		opacity,
		polygonScale,
		polygonRotation,
		screenHeight,
		bootstrapProgressWidth
	);

	if (IS_WEB) {
		return (
			<SplashWeb
				dismissReady={dismissReady}
				screenHeight={screenHeight}
				progress={progress}
				progressMessage={progressMessage}
				segments={segments}
				colors={colors}
				onAnimationComplete={onAnimationComplete}
			/>
		);
	}

	return (
		<SplashNative
			progressMessage={progressMessage}
			segments={segments}
			colors={colors}
			containerStyle={animatedStyles.containerStyle}
			backgroundStyle={animatedStyles.backgroundStyle}
			polygonContainerStyle={animatedStyles.polygonContainerStyle}
			progressFillStyle={animatedStyles.progressFillStyle}
			progressSectionStyle={animatedStyles.progressSectionStyle}
		/>
	);
}
