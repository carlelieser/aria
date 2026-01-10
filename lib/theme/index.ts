/**
 * Material 3 Theme System
 *
 * This module exports the complete M3 theme system including:
 * - Color palettes (static and dynamic)
 * - Typography scale
 * - Shape tokens
 * - Motion/animation tokens
 * - Theme provider components
 */

// Color system
export { M3Colors, SEED_COLOR, type M3ColorScheme } from './colors';

// Typography
export { M3Typography, type M3TypographyVariant } from './typography';

// Shapes
export { M3Shapes, M3ShapeStyles, getShapeRadius, type M3ShapeSize } from './shapes';

// Motion
export {
	M3Easing,
	M3Duration,
	M3AnimationConfig,
	type M3EasingType,
	type M3DurationType,
} from './motion';

// Dynamic theme
export { useDynamicTheme, getStaticTheme, type AppTheme } from './dynamic-theme';

// Theme provider
export { AppThemeProvider, useAppTheme } from './theme-provider';
