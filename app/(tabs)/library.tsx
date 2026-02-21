import { View, StyleSheet } from 'react-native';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import { PageLayout } from '@/src/components/ui/page-layout';
import { useState, useEffect, useRef } from 'react';
import { usePlaylists, useIsLibraryLoading } from '@/src/application/state/library-store';
import { useDefaultLibraryTab, useSettingsStore } from '@/src/application/state/settings-store';
import { useAggregatedArtists, useAggregatedAlbums } from '@/src/hooks/use-aggregated-library';
import {
	SongsTab,
	PlaylistList,
	ArtistList,
	AlbumList,
	LibrarySortFilterSheet,
} from '@/src/components/library';
import { useLibraryFilter } from '@/src/hooks/use-library-filter';
import { useTabShadow } from '@/src/hooks/use-tab-shadow';
import { useAppTheme } from '@/lib/theme';
import { MusicIcon } from 'lucide-react-native';
import { TAB_INDEX_MAP } from '@/lib/settings-config';

export default function HomeScreen() {
	const { colors } = useAppTheme();
	const defaultLibraryTab = useDefaultLibraryTab();
	const [tabIndex, setTabIndex] = useState(TAB_INDEX_MAP[defaultLibraryTab]);
	const hasAppliedDefaultRef = useRef(false);

	useEffect(() => {
		if (hasAppliedDefaultRef.current) return;

		if (useSettingsStore.persist.hasHydrated()) {
			hasAppliedDefaultRef.current = true;
			setTabIndex(TAB_INDEX_MAP[useSettingsStore.getState().defaultLibraryTab]);
			return;
		}

		const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
			hasAppliedDefaultRef.current = true;
			const storedTab = useSettingsStore.getState().defaultLibraryTab;
			setTabIndex(TAB_INDEX_MAP[storedTab]);
		});

		return unsubscribe;
	}, []);

	const playlists = usePlaylists();
	const artists = useAggregatedArtists();
	const albums = useAggregatedAlbums();
	const isLoading = useIsLibraryLoading();

	const {
		tracks: filteredTracks,
		hasFilters,
		isFilterSheetOpen,
		closeFilterSheet,
	} = useLibraryFilter();

	const { handleScroll, shadowStyle } = useTabShadow({ tabIndex });

	return (
		<PageLayout
			header={{
				icon: MusicIcon,
				title: 'Library',
				showBorder: false,
			}}
		>
			<View style={styles.content}>
				<TabsProvider defaultIndex={tabIndex} onChangeIndex={setTabIndex}>
					<Tabs
						uppercase={false}
						mode="scrollable"
						showLeadingSpace={false}
						style={{ backgroundColor: colors.surface, ...shadowStyle }}
					>
						<TabScreen label="Songs" icon="music-note">
							<View style={styles.tabContent}>
								<SongsTab
									tracks={filteredTracks}
									isLoading={isLoading}
									hasFilters={hasFilters}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
						<TabScreen label="Artists" icon="account-music">
							<View style={styles.tabContent}>
								<ArtistList
									artists={artists}
									isLoading={isLoading}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
						<TabScreen label="Albums" icon="album">
							<View style={styles.tabContent}>
								<AlbumList
									albums={albums}
									isLoading={isLoading}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
						<TabScreen label="Playlists" icon="playlist-music">
							<View style={styles.tabContent}>
								<PlaylistList
									playlists={playlists}
									isLoading={isLoading}
									onScroll={handleScroll}
								/>
							</View>
						</TabScreen>
					</Tabs>
				</TabsProvider>
			</View>

			<LibrarySortFilterSheet isOpen={isFilterSheetOpen} onClose={closeFilterSheet} />
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	content: {
		flex: 1,
	},
	tabContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
