/**
 * TabItemRow Component
 *
 * A single row in the tab reorder list. Thin adapter over the shared
 * MovableItem, mapping tab-specific props to its generic shape.
 */

import { MovableItem } from '@/src/components/ui/movable-item';
import type { TabItemRowProps } from './types';

export function TabItemRow({
	tabId,
	title,
	icon,
	index,
	isFirst,
	isLast,
	isEnabled,
	isRequired,
	onMoveUp,
	onMoveDown,
	onToggle,
}: TabItemRowProps) {
	return (
		<MovableItem
			label={title}
			icon={icon}
			enabled={isEnabled}
			isFirst={isFirst}
			isLast={isLast}
			toggleDisabled={isRequired}
			onToggle={() => onToggle(tabId)}
			onMoveUp={() => onMoveUp(index)}
			onMoveDown={() => onMoveDown(index)}
		/>
	);
}
