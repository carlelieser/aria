import { router } from 'expo-router';
import { IconButton } from 'react-native-paper';
import { SettingsIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme } from '@/lib/theme';

export function SettingsHeaderAction() {
	const { colors } = useAppTheme();

	return (
		<IconButton
			icon={() => <Icon as={SettingsIcon} size={22} color={colors.onSurfaceVariant} />}
			onPress={() => router.push('/settings')}
		/>
	);
}
