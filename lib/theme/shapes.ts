/**
 * Material 3 Shape System
 *
 * Shapes help direct attention, identify components, communicate state,
 * and express brand.
 */

export const M3Shapes = {
	/** Extra small (4px) - Small components like chips */
	extraSmall: 4,

	/** Small (8px) - Buttons, input fields, small cards */
	small: 8,

	/** Medium (12px) - Cards, dialogs, menus */
	medium: 12,

	/** Large (16px) - FABs, larger cards, navigation drawers */
	large: 16,

	/** Extra large (28px) - Large sheets, expanded elements */
	extraLarge: 28,

	/** Full (9999px) - Pills, circular elements */
	full: 9999,
} as const;

export type M3ShapeSize = keyof typeof M3Shapes;

/**
 * Get corner radius for a shape size
 */
export function getShapeRadius(size: M3ShapeSize): number {
	return M3Shapes[size];
}

/**
 * Shape styles for React Native
 */
export const M3ShapeStyles = {
	extraSmall: { borderRadius: M3Shapes.extraSmall },
	small: { borderRadius: M3Shapes.small },
	medium: { borderRadius: M3Shapes.medium },
	large: { borderRadius: M3Shapes.large },
	extraLarge: { borderRadius: M3Shapes.extraLarge },
	full: { borderRadius: M3Shapes.full },
} as const;
