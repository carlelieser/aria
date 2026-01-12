import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { SearchIcon, XIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';

interface SearchInputProps {
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	autoFocus?: TextInputProps['autoFocus'];
}

export function SearchInput({
	value,
	onChangeText,
	placeholder = 'Search library...',
	autoFocus = false,
}: SearchInputProps) {
	const { colors } = useAppTheme();

	const handleClear = () => {
		onChangeText('');
	};

	const hasValue = value.length > 0;

	return (
		<View style={[styles.container, { backgroundColor: colors.surfaceContainerHigh }]}>
			<Icon as={SearchIcon} size={20} color={colors.onSurfaceVariant} />
			<TextInput
				value={value}
				onChangeText={onChangeText}
				placeholder={placeholder}
				placeholderTextColor={colors.onSurfaceVariant}
				style={[styles.input, { color: colors.onSurface }]}
				autoFocus={autoFocus}
				autoCapitalize="none"
				autoCorrect={false}
				returnKeyType="search"
			/>
			{hasValue && (
				<IconButton
					icon={() => <Icon as={XIcon} size={18} color={colors.onSurfaceVariant} />}
					onPress={handleClear}
					size={20}
					style={styles.clearButton}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 28,
		gap: 12,
	},
	input: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 4,
	},
	clearButton: {
		margin: 0,
	},
});
