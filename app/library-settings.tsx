/**
 * LibrarySettingsScreen
 *
 * Settings for the library screen.
 * Uses M3 theming.
 */

import { ScrollView, StyleSheet } from 'react-native';
import { PageLayout } from '@/components/page-layout';
import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsSelect } from '@/components/settings/settings-select';
import {
	MusicIcon,
	ListMusicIcon,
	UsersIcon,
	DiscIcon,
	type LucideIcon,
} from 'lucide-react-native';
import {
	useDefaultLibraryTab,
	useSetDefaultLibraryTab,
	type LibraryTabId,
} from '@/src/application/state/settings-store';

const LIBRARY_TAB_OPTIONS: { value: LibraryTabId; label: string; icon: LucideIcon }[] = [
	{ value: 'songs', label: 'Songs', icon: MusicIcon },
	{ value: 'playlists', label: 'Playlists', icon: ListMusicIcon },
	{ value: 'artists', label: 'Artists', icon: UsersIcon },
	{ value: 'albums', label: 'Albums', icon: DiscIcon },
];

export default function LibrarySettingsScreen() {
	const defaultLibraryTab = useDefaultLibraryTab();
	const setDefaultLibraryTab = useSetDefaultLibraryTab();

	return (
		<PageLayout header={{ title: 'Library', showBack: true, compact: true }}>
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
				<SettingsSection title="Display">
					<SettingsSelect
						icon={MusicIcon}
						title="Default Tab"
						options={LIBRARY_TAB_OPTIONS}
						value={defaultLibraryTab}
						onValueChange={setDefaultLibraryTab}
						portalName="library-default-tab-select"
					/>
				</SettingsSection>
			</ScrollView>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		paddingHorizontal: 8,
	},
	scrollContent: {
		paddingBottom: 32,
	},
});
