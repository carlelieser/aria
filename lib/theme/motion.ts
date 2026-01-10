/**
 * Material 3 Motion System
 *
 * Motion helps make a UI expressive and easy to use.
 * It brings attention to what's important and provides feedback to user interactions.
 */

import { Easing } from 'react-native-reanimated';

/**
 * M3 Easing curves
 *
 * - Emphasized: For transitions that need emphasis (entering/exiting screens)
 * - Standard: For most UI transitions
 */
export const M3Easing = {
	/** Emphasized easing - Main entrance/exit animations */
	emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),

	/** Emphasized decelerate - Elements entering the screen */
	emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),

	/** Emphasized accelerate - Elements leaving the screen */
	emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),

	/** Standard easing - Most UI transitions */
	standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),

	/** Standard decelerate - Elements appearing */
	standardDecelerate: Easing.bezier(0.0, 0.0, 0.0, 1.0),

	/** Standard accelerate - Elements disappearing */
	standardAccelerate: Easing.bezier(0.3, 0.0, 1.0, 1.0),

	/** Linear - Continuous animations like progress bars */
	linear: Easing.linear,
} as const;

/**
 * M3 Duration tokens (in milliseconds)
 *
 * Duration is organized in steps that increase in length.
 */
export const M3Duration = {
	// Short durations - Simple selections, state changes
	short1: 50,
	short2: 100,
	short3: 150,
	short4: 200,

	// Medium durations - Expanding/collapsing elements
	medium1: 250,
	medium2: 300,
	medium3: 350,
	medium4: 400,

	// Long durations - Opening overlays, page transitions
	long1: 450,
	long2: 500,
	long3: 550,
	long4: 600,

	// Extra long - Large or complex animations
	extraLong1: 700,
	extraLong2: 800,
	extraLong3: 900,
	extraLong4: 1000,
} as const;

export type M3EasingType = keyof typeof M3Easing;
export type M3DurationType = keyof typeof M3Duration;

/**
 * Common animation configurations
 */
export const M3AnimationConfig = {
	/** Standard component state change (hover, press) */
	stateChange: {
		duration: M3Duration.short2,
		easing: M3Easing.standard,
	},

	/** Element appearing on screen */
	enter: {
		duration: M3Duration.medium2,
		easing: M3Easing.emphasizedDecelerate,
	},

	/** Element leaving the screen */
	exit: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasizedAccelerate,
	},

	/** Expanding containers (FAB, menus) */
	expand: {
		duration: M3Duration.medium2,
		easing: M3Easing.emphasized,
	},

	/** Collapsing containers */
	collapse: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasized,
	},

	/** Page/screen transitions */
	pageTransition: {
		duration: M3Duration.long2,
		easing: M3Easing.emphasized,
	},

	/** Modal/dialog opening */
	modalOpen: {
		duration: M3Duration.medium4,
		easing: M3Easing.emphasizedDecelerate,
	},

	/** Modal/dialog closing */
	modalClose: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasizedAccelerate,
	},
} as const;
