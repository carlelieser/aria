/**
 * ProgressTrack Styles
 *
 * StyleSheet definitions for the ProgressTrack component family.
 */

import { StyleSheet } from 'react-native';
import {
	THUMB_SIZE,
	HIT_SLOP,
	TRACK_HEIGHT,
	BASIC_TRACK_HEIGHT,
	BASIC_THUMB_SIZE,
	VARIANT_TRACK_HEIGHT,
	VARIANT_HANDLE_WIDTH,
	VARIANT_HANDLE_HEIGHT,
	VARIANT_HANDLE_RADIUS,
} from './types';

export const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	trackContainer: {
		width: '100%',
		justifyContent: 'center',
		height: THUMB_SIZE + HIT_SLOP * 2,
		paddingVertical: HIT_SLOP,
	},
	trackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - TRACK_HEIGHT) / 2,
		left: 0,
	},
	basicTrackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - BASIC_TRACK_HEIGHT) / 2,
		left: 0,
	},
	variantTrackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - VARIANT_TRACK_HEIGHT) / 2,
		left: 0,
	},
	thumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - THUMB_SIZE / 2,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
	},
	variantThumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - VARIANT_HANDLE_HEIGHT / 2,
		width: VARIANT_HANDLE_WIDTH,
		height: VARIANT_HANDLE_HEIGHT,
		borderRadius: VARIANT_HANDLE_RADIUS,
	},
	basicThumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - BASIC_THUMB_SIZE / 2,
		width: BASIC_THUMB_SIZE,
		height: BASIC_THUMB_SIZE,
		borderRadius: BASIC_THUMB_SIZE / 2,
	},
	timeContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	timeText: {
		fontVariant: ['tabular-nums'],
	},
});
