/**
 * AnimatedSplash Styles
 *
 * StyleSheet definitions for the AnimatedSplash component family.
 */

import { StyleSheet } from 'react-native';
import { FontFamily } from '@/lib/theme/typography';
import { PROGRESS_BAR_WIDTH } from './types';

export const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 9999,
	},
	background: {
		...StyleSheet.absoluteFillObject,
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	polygonWrapper: {
		position: 'absolute',
	},
	iconWrapper: {
		width: 148,
		height: 148,
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 999999,
		overflow: 'visible',
	},
	progressSection: {
		position: 'absolute',
		bottom: '28%',
		left: 0,
		right: 0,
		alignItems: 'center',
	},
	progressTrack: {
		width: PROGRESS_BAR_WIDTH,
		height: 3,
		borderRadius: 1.5,
		overflow: 'hidden',
	},
	progressFill: {
		height: 3,
		borderRadius: 1.5,
	},
	progressLabel: {
		marginTop: 8,
		fontSize: 12,
		fontFamily: FontFamily.regular,
	},
});
