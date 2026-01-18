import { Easing } from 'react-native-reanimated';

export const M3Easing = {
	emphasized: Easing.bezier(0.2, 0.0, 0.0, 1.0),

	emphasizedDecelerate: Easing.bezier(0.05, 0.7, 0.1, 1.0),

	emphasizedAccelerate: Easing.bezier(0.3, 0.0, 0.8, 0.15),

	standard: Easing.bezier(0.2, 0.0, 0.0, 1.0),

	standardDecelerate: Easing.bezier(0.0, 0.0, 0.0, 1.0),

	standardAccelerate: Easing.bezier(0.3, 0.0, 1.0, 1.0),

	linear: Easing.linear,
} as const;

export const M3Duration = {
	short1: 50,
	short2: 100,
	short3: 150,
	short4: 200,

	medium1: 250,
	medium2: 300,
	medium3: 350,
	medium4: 400,

	long1: 450,
	long2: 500,
	long3: 550,
	long4: 600,

	extraLong1: 700,
	extraLong2: 800,
	extraLong3: 900,
	extraLong4: 1000,
} as const;

export type M3EasingType = keyof typeof M3Easing;
export type M3DurationType = keyof typeof M3Duration;

export const M3AnimationConfig = {
	stateChange: {
		duration: M3Duration.short2,
		easing: M3Easing.standard,
	},

	enter: {
		duration: M3Duration.medium2,
		easing: M3Easing.emphasizedDecelerate,
	},

	exit: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasizedAccelerate,
	},

	expand: {
		duration: M3Duration.medium2,
		easing: M3Easing.emphasized,
	},

	collapse: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasized,
	},

	pageTransition: {
		duration: M3Duration.long2,
		easing: M3Easing.emphasized,
	},

	modalOpen: {
		duration: M3Duration.medium4,
		easing: M3Easing.emphasizedDecelerate,
	},

	modalClose: {
		duration: M3Duration.short4,
		easing: M3Easing.emphasizedAccelerate,
	},
} as const;
