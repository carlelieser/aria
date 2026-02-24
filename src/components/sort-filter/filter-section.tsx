/**
 * FilterSection Component
 *
 * Generic filter options for artists, albums, and configurable toggles.
 * Uses M3 theming.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import { FilterChip } from './filter-chip';
import { useAppTheme } from '@/lib/theme';
import type { ArtistReference } from '@/src/domain/entities/artist';
import type { AlbumReference } from '@/src/domain/entities/album';

interface ToggleConfig {
	readonly label: string;
	readonly value: boolean;
	readonly onToggle: () => void;
}

interface ProviderOption {
	readonly id: string;
	readonly name: string;
}

interface FilterSectionProps {
	readonly artists: ArtistReference[];
	readonly albums: AlbumReference[];
	readonly providers?: readonly ProviderOption[];
	readonly selectedArtistIds: readonly string[];
	readonly selectedAlbumIds: readonly string[];
	readonly selectedProviderIds?: readonly string[];
	readonly onToggleArtist: (artistId: string) => void;
	readonly onToggleAlbum: (albumId: string) => void;
	readonly onToggleProvider?: (providerId: string) => void;
	readonly toggles: readonly ToggleConfig[];
	readonly headerContent?: React.ReactNode;
}

function FilterChipSection({
	label,
	items,
	selectedIds,
	onToggle,
}: {
	readonly label: string;
	readonly items: readonly { readonly id: string; readonly name: string }[];
	readonly selectedIds: readonly string[];
	readonly onToggle: (id: string) => void;
}) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.section}>
			<Text
				variant={'labelMedium'}
				style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
			>
				{label}
			</Text>
			<ScrollView
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={styles.chipContainer}
			>
				{items.map((item) => (
					<FilterChip
						key={item.id}
						id={item.id}
						label={item.name}
						selected={selectedIds.includes(item.id)}
						onToggle={onToggle}
					/>
				))}
			</ScrollView>
		</View>
	);
}

export function FilterSection({
	artists,
	albums,
	providers,
	selectedArtistIds,
	selectedAlbumIds,
	selectedProviderIds,
	onToggleArtist,
	onToggleAlbum,
	onToggleProvider,
	toggles,
	headerContent,
}: FilterSectionProps) {
	const { colors } = useAppTheme();

	return (
		<View style={styles.container}>
			{headerContent}

			{toggles.map((toggle) => (
				<View key={toggle.label} style={styles.toggleRow}>
					<Text variant={'bodyMedium'} style={{ color: colors.onSurface }}>
						{toggle.label}
					</Text>
					<Switch value={toggle.value} onValueChange={toggle.onToggle} />
				</View>
			))}

			{providers && providers.length > 1 && onToggleProvider && (
				<FilterChipSection
					label={'PROVIDER'}
					items={providers}
					selectedIds={selectedProviderIds ?? []}
					onToggle={onToggleProvider}
				/>
			)}

			{artists.length > 0 && (
				<FilterChipSection
					label={'ARTISTS'}
					items={artists}
					selectedIds={selectedArtistIds}
					onToggle={onToggleArtist}
				/>
			)}

			{albums.length > 0 && (
				<FilterChipSection
					label={'ALBUMS'}
					items={albums}
					selectedIds={selectedAlbumIds}
					onToggle={onToggleAlbum}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 16,
	},
	toggleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	section: {
		gap: 8,
	},
	sectionLabel: {
		letterSpacing: 0.5,
	},
	chipContainer: {
		gap: 8,
		paddingRight: 16,
	},
});
