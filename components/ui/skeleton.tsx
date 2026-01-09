import { useEffect, useState } from 'react';
import { View, type ViewProps, LayoutChangeEvent, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const skeletonVariants = cva('overflow-hidden bg-muted', {
	variants: {
		rounded: {
			none: 'rounded-none',
			sm: 'rounded-sm',
			md: 'rounded-md',
			lg: 'rounded-lg',
			xl: 'rounded-xl',
			'2xl': 'rounded-2xl',
			full: 'rounded-full',
		},
	},
	defaultVariants: {
		rounded: 'md',
	},
});

interface SkeletonProps extends ViewProps, VariantProps<typeof skeletonVariants> {
	width?: number | `${number}%`;

	height?: number;

	shimmer?: boolean;

	duration?: number;
}

function Skeleton({
	width,
	height,
	rounded,
	shimmer = true,
	duration = 1500,
	className,
	style,
	...props
}: SkeletonProps) {
	const [layoutWidth, setLayoutWidth] = useState(0);
	const translateX = useSharedValue(-layoutWidth);

	const handleLayout = (event: LayoutChangeEvent) => {
		const measuredWidth = event.nativeEvent.layout.width;
		setLayoutWidth(measuredWidth);
		translateX.value = -measuredWidth;
	};

	useEffect(() => {
		if (shimmer && layoutWidth > 0) {
			translateX.value = -layoutWidth;
			translateX.value = withRepeat(
				withTiming(layoutWidth * 2, {
					duration,
					easing: Easing.linear,
				}),
				-1,
				false
			);
		}
	}, [shimmer, layoutWidth, duration]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }],
	}));

	const dimensionStyle = {
		...(width !== undefined && { width }),
		...(height !== undefined && { height }),
	};

	return (
		<View
			className={cn(skeletonVariants({ rounded }), className)}
			style={[dimensionStyle, style]}
			onLayout={handleLayout}
			{...props}
		>
			{shimmer && layoutWidth > 0 && (
				<Animated.View
					style={[StyleSheet.absoluteFill, animatedStyle]}
					pointerEvents="none"
				>
					<LinearGradient
						colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']}
						start={{ x: 0, y: 0.5 }}
						end={{ x: 1, y: 0.5 }}
						style={{ flex: 1, width: layoutWidth * 0.6 }}
					/>
				</Animated.View>
			)}
		</View>
	);
}

export { Skeleton, skeletonVariants };
export type { SkeletonProps };
