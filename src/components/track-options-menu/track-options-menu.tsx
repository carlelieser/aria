/**
 * TrackOptionsMenu Component
 *
 * Trigger button for track options menu.
 * Opens the shared TrackOptionsSheet via track-options-store.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { MoreVertical, MoreHorizontal } from 'lucide-react-native';
import { IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import {
	useOpenTrackOptions,
	type TrackOptionsContext,
} from '@/src/application/state/track-options-store';

type Orientation = 'vertical' | 'horizontal';

interface TrackOptionsMenuProps {
	readonly track: Track;
	readonly source: TrackActionSource;
	readonly orientation?: Orientation;
	readonly playlistId?: string;
	readonly trackPosition?: number;
	/** Override icon color (e.g. for player screen with artwork-derived theme) */
	readonly iconColor?: string;
}

export const TrackOptionsMenu = memo(function TrackOptionsMenu({
	track,
	source,
	orientation = 'vertical',
	playlistId,
	trackPosition,
	iconColor: iconColorOverride,
}: TrackOptionsMenuProps) {
	const openTrackOptions = useOpenTrackOptions();
	const { colors } = useAppTheme();

	const handleOpen = useCallback(() => {
		const context: TrackOptionsContext = {};
		if (playlistId !== undefined) context.playlistId = playlistId;
		if (trackPosition !== undefined) context.trackPosition = trackPosition;
		openTrackOptions(track, source, context);
	}, [openTrackOptions, track, source, playlistId, trackPosition]);

	const resolvedIconColor = iconColorOverride ?? colors.onSurfaceVariant;

	const iconRenderer = useMemo(() => {
		const IconComponent = orientation === 'horizontal' ? MoreHorizontal : MoreVertical;
		const RenderedIcon = () => <Icon as={IconComponent} size={20} color={resolvedIconColor} />;
		RenderedIcon.displayName = 'TrackOptionsIcon';
		return RenderedIcon;
	}, [orientation, resolvedIconColor]);

	return <IconButton icon={iconRenderer} onPress={handleOpen} size={20} />;
});
