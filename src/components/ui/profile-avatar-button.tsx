import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { CircleUserRound } from 'lucide-react-native';
import { router } from 'expo-router';
import { Icon } from '@/src/components/ui/icon';
import { useProfileStore } from '@/src/application/state/profile-store';
import { useAppTheme } from '@/lib/theme';

export function ProfileAvatarButton() {
	const { colors } = useAppTheme();
	const avatarUri = useProfileStore((s) => s.avatarUri);

	return (
		<Pressable onPress={() => router.push('/profile')} style={styles.button}>
			{avatarUri ? (
				<Image source={{ uri: avatarUri }} style={styles.avatar} contentFit={'cover'} />
			) : (
				<Icon as={CircleUserRound} size={22} color={colors.onSurfaceVariant} />
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	button: {
		width: 48,
		height: 48,
		alignItems: 'center',
		justifyContent: 'center',
	},
	avatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
	},
});
