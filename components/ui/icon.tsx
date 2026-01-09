import { cn } from '@/lib/utils';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { cssInterop } from 'nativewind';

type IconProps = LucideProps & {
	as: LucideIcon;
};

function IconImpl({ as: IconComponent, ...props }: IconProps) {
	return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
	className: {
		target: 'style',
		nativeStyleToProp: {
			height: 'size',
			width: 'size',
		},
	},
});

function Icon({ as: IconComponent, className, size = 24, ...props }: IconProps) {
	return (
		<IconImpl
			as={IconComponent}
			className={cn('text-foreground', className)}
			size={size}
			{...props}
		/>
	);
}

export { Icon };
