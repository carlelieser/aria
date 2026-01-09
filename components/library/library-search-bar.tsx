import { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	interpolate,
	Extrapolation,
} from 'react-native-reanimated';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useThemeColor } from '@/hooks/use-theme-color';
import {Search, X, ArrowLeft, ChevronLeftIcon} from 'lucide-react-native';

const DEBOUNCE_DELAY_MS = 300;
const SPRING_CONFIG = { damping: 22, stiffness: 280 };

interface LibrarySearchBarProps {
	value: string;
	onChangeText: (text: string) => void;
	placeholder?: string;
	isExpanded: boolean;
	onToggle: () => void;
}

export function LibrarySearchBar({
	value,
	onChangeText,
	placeholder = 'Search your library...',
	isExpanded,
	onToggle,
}: LibrarySearchBarProps) {
	const { width: screenWidth } = useWindowDimensions();
	const backgroundColor = useThemeColor({}, 'background');
	const [localValue, setLocalValue] = useState(value);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const inputRef = useRef<TextInput>(null);
	const expandProgress = useSharedValue(0);

	useEffect(() => {
		setLocalValue(value);
	}, [value]);

	useEffect(() => {
		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		expandProgress.value = withSpring(isExpanded ? 1 : 0, SPRING_CONFIG);

		if (isExpanded) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 150);
			return () => clearTimeout(timer);
		}
	}, [isExpanded, expandProgress]);

	const handleChangeText = useCallback(
		(text: string) => {
			setLocalValue(text);

			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			debounceTimerRef.current = setTimeout(() => {
				onChangeText(text);
			}, DEBOUNCE_DELAY_MS);
		},
		[onChangeText]
	);

	const handleClear = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		setLocalValue('');
		onChangeText('');
		inputRef.current?.focus();
	}, [onChangeText]);

	const handleClose = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
		}
		setLocalValue('');
		onChangeText('');
		onToggle();
	}, [onChangeText, onToggle]);

	const hasValue = localValue.length > 0;

	const expandedContainerStyle = useAnimatedStyle(() => {
		const containerWidth = interpolate(
			expandProgress.value,
			[0, 1],
			[36, screenWidth - 32],
			Extrapolation.CLAMP
		);

		return {
			width: containerWidth,
		};
	});

	const iconButtonAnimatedStyle = useAnimatedStyle(() => ({
		opacity: interpolate(expandProgress.value, [0, 0.2], [1, 0], Extrapolation.CLAMP),
		transform: [
			{
				scale: interpolate(expandProgress.value, [0, 0.2], [1, 0.8], Extrapolation.CLAMP),
			},
		],
	}));

	const inputContainerStyle = useAnimatedStyle(() => ({
		opacity: interpolate(expandProgress.value, [0.4, 1], [0, 1], Extrapolation.CLAMP),
	}));

	return (
		<View style={[styles.wrapper, { backgroundColor: isExpanded ? backgroundColor : 'transparent' },]}>
			{/* Expanded state - Full width search bar overlay */}
			{isExpanded && (
				<Animated.View
					style={[
						styles.expandedContainer,
						{ backgroundColor },
						expandedContainerStyle,
					]}
				>
					<Animated.View style={[styles.searchRow, inputContainerStyle]}>
						<Pressable onPress={handleClose} style={styles.backButton}>
							<Icon as={ChevronLeftIcon} size={22} className="text-foreground" />
						</Pressable>

						<View className="flex-1 flex-row items-center bg-secondary rounded-xl px-3 gap-2 h-9">
							<Icon as={Search} size={18} className="text-muted-foreground" />
							<Input
								ref={inputRef}
								value={localValue}
								onChangeText={handleChangeText}
								placeholder={placeholder}
								className="flex-1 border-0 bg-transparent px-0"
								autoCapitalize="none"
								autoCorrect={false}
							/>
							{hasValue && (
								<Pressable onPress={handleClear} style={styles.clearButton}>
									<Icon as={X} size={16} className="text-muted-foreground" />
								</Pressable>
							)}
						</View>
					</Animated.View>
				</Animated.View>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		height: 64,
		borderRadius: 8,
		justifyContent: 'center',
	},
	expandedContainer: {
		position: 'absolute',
		width: '100%',
		paddingHorizontal: 8,
		borderRadius: 12,
		top: 0,
		right: 0,
		bottom: 0,
		zIndex: 50,
		justifyContent: 'center',
	},
	searchRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		padding: 4
	},
	backButton: {
		width: 36,
		height: 36,
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 18,
	},
	clearButton: {
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
