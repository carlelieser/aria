import { Pressable, type PressableProps } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Check, X } from 'lucide-react-native';
import { cn } from '@/lib/utils';

interface FilterChipProps extends Omit<PressableProps, 'children'> {
	label: string;
	selected?: boolean;
	onRemove?: () => void;
	showRemoveIcon?: boolean;
}

export function FilterChip({
	label,
	selected = false,
	onRemove,
	showRemoveIcon = false,
	className,
	...props
}: FilterChipProps) {
	return (
		<Pressable
			className={cn(
				'flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border',
				selected ? 'bg-primary border-primary' : 'bg-secondary border-secondary',
				className
			)}
			{...props}
		>
			{selected && !showRemoveIcon && (
				<Icon
					as={Check}
					size={14}
					className={selected ? 'text-primary-foreground' : 'text-foreground'}
				/>
			)}
			<Text
				className={cn('text-sm', selected ? 'text-primary-foreground' : 'text-foreground')}
			>
				{label}
			</Text>
			{showRemoveIcon && onRemove && (
				<Pressable onPress={onRemove} hitSlop={8}>
					<Icon
						as={X}
						size={14}
						className={selected ? 'text-primary-foreground' : 'text-muted-foreground'}
					/>
				</Pressable>
			)}
		</Pressable>
	);
}
