/**
 * ToastExpanded Component
 *
 * Expanded view of the progress toast showing phase, progress bar, and details.
 */

import { View, StyleSheet } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
import { Portal } from '@rn-primitives/portal';
import { GestureDetector, type GestureType } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import type { AnimatedStyle } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import type { ViewStyle } from 'react-native';

interface ToastExpandedProps {
	readonly portalName: string;
	readonly bottomOffset: number;
	readonly phaseMessage: string;
	readonly percentage: number;
	readonly progressText: string;
	readonly currentItemLabel: string | null;
	readonly showComplete: boolean;
	readonly panGesture: GestureType;
	readonly animatedStyle: AnimatedStyle<ViewStyle>;
}

export function ToastExpanded({
	portalName,
	bottomOffset,
	phaseMessage,
	percentage,
	progressText,
	currentItemLabel,
	showComplete,
	panGesture,
	animatedStyle,
}: ToastExpandedProps) {
	const { colors } = useAppTheme();

	return (
		<Portal name={portalName}>
			<View style={[styles.container, { bottom: bottomOffset }]} pointerEvents={'box-none'}>
				<GestureDetector gesture={panGesture}>
					<Animated.View
						style={[
							styles.toast,
							{ backgroundColor: colors.primaryContainer },
							animatedStyle,
						]}
					>
						<View style={styles.header}>
							<Text
								variant={'labelLarge'}
								style={{ color: colors.onPrimaryContainer }}
							>
								{phaseMessage}
							</Text>
							{!showComplete && (
								<Text
									variant={'labelMedium'}
									style={{ color: colors.onPrimaryContainer }}
								>
									{percentage}%
								</Text>
							)}
						</View>

						{!showComplete && (
							<>
								<ProgressBar
									progress={percentage / 100}
									color={colors.primary}
									style={styles.progressBar}
								theme={{ colors: { surfaceVariant: colors.onPrimaryContainer + '33' } }}
								/>

								<View style={styles.footer}>
									<Text
										variant={'bodySmall'}
										style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}
									>
										{progressText}
									</Text>
									{currentItemLabel && (
										<Text
											variant={'bodySmall'}
											numberOfLines={1}
											style={{
												color: colors.onPrimaryContainer,
												opacity: 0.8,
												flex: 1,
												textAlign: 'right',
											}}
										>
											{currentItemLabel}
										</Text>
									)}
								</View>
							</>
						)}
					</Animated.View>
				</GestureDetector>
			</View>
		</Portal>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		alignItems: 'flex-end',
	},
	toast: {
		width: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		gap: 8,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	progressBar: {
		height: 4,
		borderRadius: 2,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
});
