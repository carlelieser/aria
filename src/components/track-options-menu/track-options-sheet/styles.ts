/**
 * TrackOptionsSheet Styles
 *
 * StyleSheet definitions for the TrackOptionsSheet component family.
 */

import { StyleSheet } from 'react-native';
import { M3Shapes } from '@/lib/theme';

export const styles = StyleSheet.create({
	background: {
		borderTopLeftRadius: M3Shapes.extraLarge,
		borderTopRightRadius: M3Shapes.extraLarge,
	},
	handleIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
	},
	contentContainer: {},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	headerArtwork: {
		width: 48,
		height: 48,
		borderRadius: 8,
	},
	headerText: {
		flex: 1,
	},
	separator: {
		marginVertical: 8,
		marginHorizontal: 16,
	},
	bottomPadding: {
		height: 34,
	},
	itemContainer: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: 8,
	},
	itemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 14,
	},
	iconWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	itemText: {
		flex: 1,
	},
	checkWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
});
