import { Redirect } from 'expo-router';
import { useDefaultTab, useSettingsStore } from '@/src/application/state/settings-store';

export default function DefaultTabRedirect() {
	const defaultTab = useDefaultTab();
	const isHydrated = useSettingsStore.persist.hasHydrated();

	if (!isHydrated) return null;

	return <Redirect href={`/${defaultTab}`} />;
}
