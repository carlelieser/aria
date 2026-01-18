export const M3Shapes = {
	extraSmall: 4,

	small: 8,

	medium: 12,

	large: 16,

	extraLarge: 28,

	full: 9999,
} as const;

export type M3ShapeSize = keyof typeof M3Shapes;

export function getShapeRadius(size: M3ShapeSize): number {
	return M3Shapes[size];
}

export const M3ShapeStyles = {
	extraSmall: { borderRadius: M3Shapes.extraSmall },
	small: { borderRadius: M3Shapes.small },
	medium: { borderRadius: M3Shapes.medium },
	large: { borderRadius: M3Shapes.large },
	extraLarge: { borderRadius: M3Shapes.extraLarge },
	full: { borderRadius: M3Shapes.full },
} as const;
