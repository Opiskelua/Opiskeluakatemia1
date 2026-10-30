import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, PixelRatio, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { makeStyles, radii, space, useTheme } from '../theme';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { useSession } from '../providers/SessionProvider';
import { altFor, MASCOT_POINTS, mascotAsset, type MascotPose, type MascotSize } from '../lib/mascot';

const nativeDriver = Platform.OS !== 'web';

/** Supabase user id for line rotation, or 'anon' (spec rules.rotateLines). */
export function useMascotUserId() {
  const { session } = useSession();
  return session?.user.id ?? 'anon';
}

/**
 * Abi. Always an extra layer: the same information must also be in text nearby.
 * `decorative` hides the image from screen readers (use it when the adjacent text says the same
 * thing); otherwise the spec alt text is the label. `animateIn` fades (and, without Reduce motion,
 * gently rises) on mount.
 */
export function Mascot({ pose, size = 'md', decorative = false, animateIn = false, style }: {
  pose: MascotPose; size?: MascotSize; decorative?: boolean; animateIn?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const reduce = useReduceMotion();
  const appear = useState(() => new Animated.Value(animateIn ? 0 : 1))[0];
  useEffect(() => {
    if (!animateIn || reduce === null) return;
    const animation = Animated.timing(appear, { toValue: 1, duration: reduce ? 200 : 320, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [animateIn, reduce, appear]);
  const points = MASCOT_POINTS[size];
  const motion = animateIn && reduce === false ? [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] : [];
  const a11y = decorative
    ? { accessible: false, accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: altFor(pose) };
  return <Animated.View pointerEvents="none" {...a11y} style={[{ width: points, height: points, opacity: appear, transform: motion }, style]}>
    <Animated.Image source={mascotAsset(pose, size, PixelRatio.get())} style={{ width: points, height: points }} resizeMode="contain" fadeDuration={0} />
  </Animated.View>;
}

/** Speech-bubble line next to the mascot. Real text, so screen readers read it. */
export function MascotLine({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  return <View style={[styles.bubble, dark && { backgroundColor: colors.heroTrack, borderColor: colors.heroTrack }]}>
    <Text style={[type.body, styles.bubbleText, dark && { color: colors.onHero }]}>{children}</Text>
  </View>;
}

/** Mascot beside a line, the common layout for cards. */
export function MascotRow({ pose, line, size = 'md', dark = false, animateIn = false }: { pose: MascotPose; line: string | null; size?: MascotSize; dark?: boolean; animateIn?: boolean }) {
  const styles = useStyles();
  return <View style={styles.row}>
    <Mascot pose={pose} size={size} decorative={!!line} animateIn={animateIn} />
    {!!line && <View style={styles.flex}><MascotLine dark={dark}>{line}</MascotLine></View>}
  </View>;
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: space.sm, paddingVertical: space.xs, borderRadius: radii.lg, borderBottomLeftRadius: radii.sm / 2, backgroundColor: colors.surfaceMuted, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  bubbleText: { fontSize: 15, lineHeight: 21, color: colors.ink },
}));
