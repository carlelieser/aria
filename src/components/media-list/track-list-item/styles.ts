/**
 * TrackListItem Styles
 *
 * StyleSheet definitions for the TrackListItem component family.
 */

import { StyleSheet } from 'react-native';
import { M3Shapes } from '@/lib/theme';

export const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%',
		gap: 16,
		paddingVertical: 12,
	},
	artworkWrapper: {
		position: 'relative',
	},
	artworkContainer: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
		justifyContent: 'center',
		alignItems: 'center',
		overflow: 'hidden',
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	infoContainer: {
		flex: 1,
		flexDirection: 'column',
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 2,
	},
	statusText: {
		marginLeft: 4,
	},
	progressBarContainer: {
		marginTop: 4,
	},
	progressBar: {
		height: 3,
		borderRadius: 9999,
	},
	duration: {
		marginRight: 4,
	},
});
