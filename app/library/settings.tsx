import { StyleSheet } from 'react-native';
import { MusicIcon } from 'lucide-react-native';
import { PageLayout } from '@/src/components/ui/page-layout';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { SettingsSelect } from '@/src/components/settings/settings-select';
import { LIBRARY_TAB_OPTIONS } from '@/lib/settings-config';
import {
	useDefaultLibraryTab,
	useSetDefaultLibraryTab,
} from '@/src/application/state/settings-store';

export default function LibrarySettingsScreen() {
	const defaultLibraryTab = useDefaultLibraryTab();
	const setDefaultLibraryTab = useSetDefaultLibraryTab();

	return (
		<PageLayout header={{ title: 'Library', showBack: true }}>
			<PlayerAwareScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
			>
				<SettingsSection title={'Display'}>
					<SettingsSelect
						icon={MusicIcon}
						title={'Default tab'}
						options={LIBRARY_TAB_OPTIONS}
						value={defaultLibraryTab}
						onValueChange={setDefaultLibraryTab}
						portalName={'library-default-tab-select'}
					/>
				</SettingsSection>
			</PlayerAwareScrollView>
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
