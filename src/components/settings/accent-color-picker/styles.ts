/**
 * AccentColorPicker Styles
 *
 * StyleSheet definitions for the AccentColorPicker component family.
 */

import { StyleSheet } from 'react-native';
import { M3Shapes } from '@/lib/theme';

export const styles = StyleSheet.create({
	valueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
	background: {
		borderTopLeftRadius: M3Shapes.extraLarge,
		borderTopRightRadius: M3Shapes.extraLarge,
	},
	handleIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	headerTitle: {
		fontWeight: '600',
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
	colorIndicator: {
		width: 24,
		height: 24,
		borderRadius: 12,
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
