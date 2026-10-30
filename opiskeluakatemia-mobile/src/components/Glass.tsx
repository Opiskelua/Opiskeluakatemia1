import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useTheme } from '../theme';
import { useReduceTransparency } from '../hooks/useReduceTransparency';

// Resolved once: both checks are synchronous and the answer cannot change while the app runs.
// isGlassEffectAPIAvailable() guards iOS 26 betas that lack the API and would crash.
const glassKind: 'liquid' | 'blur' | 'solid' = Platform.OS !== 'ios' ? 'solid'
  : isLiquidGlassAvailable() && isGlassEffectAPIAvailable() ? 'liquid' : 'blur';

/**
 * Real glass for chrome and floating surfaces only (never for list items or long scrolling content):
 * - iOS 26+: native Liquid Glass (GlassView).
 * - older iOS: system material blur (BlurView).
 * - Android, web, "Reduce transparency" on, or `solid`: an opaque tinted View with the hairline rim
 *   (no Android blur, for performance).
 * `scrim` lays a translucent colour over the glass, e.g. the graphite hero tint, so text contrast
 * holds whatever is behind. `fallbackColor` is the opaque colour used when there is no glass.
 * Avoid opacity < 1 on this view or its parents (Liquid Glass stops rendering); pass `solid` instead
 * for disabled states.
 */
export function Glass({ children, style, scrim, fallbackColor, solid = false, interactive = false, ...props }: ViewProps & {
  children?: ReactNode; style?: StyleProp<ViewStyle>; scrim?: string; fallbackColor?: string; solid?: boolean; interactive?: boolean;
}) {
  const { colors, scheme, glass } = useTheme();
  const reduceTransparency = useReduceTransparency();
  const kind = solid || reduceTransparency ? 'solid' : glassKind;
  const radius = StyleSheet.flatten(style)?.borderRadius;
  const overlay = scrim ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: scrim, borderRadius: radius }]} /> : null;
  if (kind === 'liquid') {
    return <GlassView {...props} glassEffectStyle="regular" colorScheme={scheme} tintColor={scrim ? undefined : colors.glassTint} isInteractive={interactive} style={style}>
      {overlay}{children}
    </GlassView>;
  }
  if (kind === 'blur') {
    // BlurView ignores borderRadius on its own; overflow hidden clips it to the radius.
    return <BlurView {...props} intensity={60} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
      style={[style, glass.rim, styles.clip]}>
      {overlay ?? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassTint }]} />}{children}
    </BlurView>;
  }
  return <View {...props} style={[style, glass.rim, { backgroundColor: fallbackColor ?? colors.glassSolid }]}>{children}</View>;
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
