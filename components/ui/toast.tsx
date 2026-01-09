import { cn } from '@/lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import { View, Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  useSharedValue,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  type LucideIcon,
} from 'lucide-react-native';
import { Portal } from '@rn-primitives/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import {
  useCurrentToast,
  useToastStore,
  type ToastVariant,
} from '@/src/application/state/toast-store';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { usePathname } from 'expo-router';

const toastVariants = cva(
  cn('flex-row items-center gap-3 rounded-xl px-4 py-3 border'),
  {
    variants: {
      variant: {
        default: 'bg-secondary border-border/50',
        success: 'bg-green-500/15 border-green-500/30',
        error: 'bg-destructive/15 border-destructive/30',
        warning: 'bg-amber-500/15 border-amber-500/30',
        info: 'bg-blue-500/15 border-blue-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const toastIconVariants = cva('', {
  variants: {
    variant: {
      default: 'text-foreground',
      success: 'text-green-500',
      error: 'text-destructive',
      warning: 'text-amber-500',
      info: 'text-blue-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const toastTitleVariants = cva('text-sm font-semibold', {
  variants: {
    variant: {
      default: 'text-foreground',
      success: 'text-green-500',
      error: 'text-destructive',
      warning: 'text-amber-500',
      info: 'text-blue-500',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const DEFAULT_ICONS: Record<ToastVariant, LucideIcon> = {
  default: Info,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

interface ToastProps extends VariantProps<typeof toastVariants> {
  id: string;
  title: string;
  description?: string;
  duration: number;
  onDismiss: () => void;
}

function Toast({
  id,
  title,
  description,
  variant = 'default',
  duration,
  onDismiss,
}: ToastProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  const IconComponent = DEFAULT_ICONS[variant ?? 'default'];

  useEffect(() => {
    translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
    opacity.value = withTiming(1, { duration: 200 });
  }, []);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleDismiss = () => {
    translateY.value = withTiming(100, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onDismiss)();
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable onPress={handleDismiss}>
        <View className={cn(toastVariants({ variant }))}>
          <Icon
            as={IconComponent}
            size={20}
            className={cn(toastIconVariants({ variant }))}
          />
          <View className="flex-1">
            <Text className={cn(toastTitleVariants({ variant }))}>{title}</Text>
            {description && (
              <Text variant="muted" className="text-xs mt-0.5">
                {description}
              </Text>
            )}
          </View>
          <Pressable onPress={handleDismiss} hitSlop={8}>
            <Icon as={X} size={16} className="text-muted-foreground" />
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const FLOATING_PLAYER_HEIGHT = 64;
const PLAYER_BOTTOM_MARGIN = 8;
const TOAST_GAP = 8;

function ToastContainer() {
  const insets = useSafeAreaInsets();
  const currentToast = useCurrentToast();
  const dismiss = useToastStore((state) => state.dismiss);
  const currentTrack = useCurrentTrack();
  const pathname = usePathname();

  const isPlayerVisible = pathname !== '/player' && currentTrack !== null;

  const bottomOffset = isPlayerVisible
    ? insets.bottom + PLAYER_BOTTOM_MARGIN + FLOATING_PLAYER_HEIGHT + TOAST_GAP
    : insets.bottom + 16;

  if (!currentToast) {
    return null;
  }

  return (
    <Portal name="toast-container">
      <View
        style={{
          position: 'absolute',
          bottom: bottomOffset,
          left: 16,
          right: 16,
        }}
        pointerEvents="box-none"
      >
        <Toast
          key={currentToast.id}
          id={currentToast.id}
          title={currentToast.title}
          description={currentToast.description}
          variant={currentToast.variant}
          duration={currentToast.duration}
          onDismiss={() => dismiss(currentToast.id)}
        />
      </View>
    </Portal>
  );
}

export { Toast, ToastContainer, toastVariants };
