import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { colors, disabledOpacity, layout, maxScale, pressedOpacity, radii, shadow, space, type } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export function Button({ title, onPress, disabled = false, loading = false, variant = 'primary', secondary = false, accessibilityLabel, accessibilityHint, style }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: ButtonVariant;
  /** Shorthand for variant="secondary". */
  secondary?: boolean; accessibilityLabel?: string; accessibilityHint?: string; style?: StyleProp<ViewStyle>;
}) {
  const kind: ButtonVariant = secondary ? 'secondary' : variant;
  const inactive = disabled || loading;
  const textColor = kind === 'primary' || kind === 'destructive' ? colors.white : kind === 'ghost' ? colors.ink : colors.ink;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress}
    style={({ pressed }) => [ui.button, ui[kind], pressed && { opacity: pressedOpacity }, inactive && { opacity: disabledOpacity }, style]}>
    {loading && <ActivityIndicator color={textColor} />}
    <Text style={[type.button, ui.buttonText, { color: textColor }]}>{title}</Text>
  </Pressable>;
}

export function Card({ children, style, tone = 'default' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'muted' | 'danger' | 'success' }) {
  return <View style={[ui.card, tone === 'muted' && ui.cardMuted, tone === 'danger' && ui.cardDanger, tone === 'success' && ui.cardSuccess, style]}>{children}</View>;
}

/** Large tappable card with title, optional description and chevron. */
export function NavCard({ title, description, kicker, onPress, disabled = false, dark = false, accessibilityLabel, accessibilityHint, children }: {
  title: string; description?: string; kicker?: string; onPress: () => void; disabled?: boolean; dark?: boolean;
  accessibilityLabel?: string; accessibilityHint?: string; children?: ReactNode;
}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [kicker, title, description].filter(Boolean).join('. ')} accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.card, ui.navCard, dark && ui.navCardDark, pressed && (dark ? { opacity: 0.85 } : { backgroundColor: colors.surfacePressed }), disabled && { opacity: disabledOpacity }]}>
    <View style={ui.navCopy}>
      {!!kicker && <Text style={[type.overline, dark && { color: colors.accent }]}>{kicker}</Text>}
      <Text style={[type.subheading, dark && { color: colors.white }]}>{title}</Text>
      {!!description && <Text style={[type.caption, dark && { color: colors.onDarkMuted }]}>{description}</Text>}
      {children}
    </View>
    <Chevron light={dark} />
  </Pressable>;
}

export function Chevron({ light = false }: { light?: boolean }) {
  return <Text importantForAccessibility="no" accessibilityElementsHidden style={[ui.chevron, light && { color: colors.onDarkMuted }]}>›</Text>;
}

/** Compact list row, e.g. a history entry. */
export function ListRow({ title, subtitle, badge, trailing, onPress, accessibilityLabel }: {
  title: string; subtitle?: string; badge?: string; trailing?: string; onPress?: () => void; accessibilityLabel?: string;
}) {
  const content = <>
    {!!badge && <View style={ui.badge}><Text style={ui.badgeText} maxFontSizeMultiplier={1.3}>{badge}</Text></View>}
    <View style={ui.rowCopy}>
      <Text style={type.label} numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text style={type.caption} numberOfLines={2}>{subtitle}</Text>}
    </View>
    {!!trailing && <Text style={[type.label, ui.trailing]}>{trailing}</Text>}
    {onPress && <Chevron />}
  </>;
  const label = accessibilityLabel ?? [title, subtitle, trailing].filter(Boolean).join(', ');
  if (!onPress) return <View accessible accessibilityLabel={label} style={[ui.card, ui.row]}>{content}</View>;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => [ui.card, ui.row, pressed && { backgroundColor: colors.surfacePressed }]}>{content}</Pressable>;
}

export function Chip({ label, selected = false, onPress, disabled = false }: { label: string; selected?: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.chip, selected && ui.chipOn, pressed && !selected && { backgroundColor: colors.surfacePressed }, disabled && { opacity: disabledOpacity }]}>
    <Text style={[ui.chipText, selected && { color: colors.white }]}>{label}</Text>
  </Pressable>;
}

export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={ui.chipRow}>{children}</View>;
}

export function Field({ label, hint, style, multiline, ...props }: TextInputProps & { label?: string; hint?: string }) {
  return <View style={ui.field}>
    {!!label && <Text style={type.label}>{label}</Text>}
    <TextInput placeholderTextColor={colors.placeholder} accessibilityLabel={props.accessibilityLabel ?? label} multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'} {...props}
      style={[ui.input, multiline && ui.inputMultiline, props.editable === false && { opacity: 0.6 }, style]} />
    {!!hint && <Text style={type.caption}>{hint}</Text>}
  </View>;
}

export function PageHeader({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  return <View style={ui.pageHeader}>
    {!!kicker && <Text style={type.overline}>{kicker}</Text>}
    <Text accessibilityRole="header" style={type.title} maxFontSizeMultiplier={maxScale.title}>{title}</Text>
    {!!intro && <Text style={type.body}>{intro}</Text>}
  </View>;
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: { label: string; onPress: () => void; accessibilityLabel?: string } }) {
  return <View style={ui.sectionTitle}>
    <View style={ui.flex}>
      <Text accessibilityRole="header" style={type.heading}>{title}</Text>
      {!!detail && <Text style={type.caption}>{detail}</Text>}
    </View>
    {action && <Pressable accessibilityRole="button" accessibilityLabel={action.accessibilityLabel ?? action.label} onPress={action.onPress} hitSlop={8}
      style={({ pressed }) => [ui.textAction, pressed && { opacity: pressedOpacity }]}>
      <Text style={ui.textActionLabel}>{action.label}</Text>
    </Pressable>}
  </View>;
}

/** Inline status message. Error notices can offer a retry action. */
export function Notice({ tone = 'info', title, message, actionTitle, onAction, actionDisabled }: {
  tone?: 'info' | 'error' | 'success'; title?: string; message: string; actionTitle?: string; onAction?: () => void; actionDisabled?: boolean;
}) {
  const palette = tone === 'error' ? { bg: colors.dangerSurface, fg: colors.danger, line: colors.dangerLine }
    : tone === 'success' ? { bg: colors.successSurface, fg: colors.success, line: colors.successLine }
      : { bg: colors.infoSurface, fg: colors.info, line: colors.line };
  return <View accessibilityRole={tone === 'error' ? 'alert' : 'summary'} accessibilityLiveRegion="polite" style={[ui.notice, { backgroundColor: palette.bg, borderColor: palette.line }]}>
    {!!title && <Text style={[type.label, { color: palette.fg }]}>{title}</Text>}
    <Text style={[type.body, { color: tone === 'info' ? colors.inkSecondary : palette.fg, fontSize: 15, lineHeight: 21 }]}>{message}</Text>
    {!!actionTitle && !!onAction && <Button title={actionTitle} secondary disabled={actionDisabled} onPress={onAction} />}
  </View>;
}

export function LoadingState({ label }: { label: string }) {
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={ui.loading}>
    <ActivityIndicator color={colors.ink} />
    <Text style={type.caption}>{label}</Text>
  </View>;
}

export function EmptyState({ title, message, actionTitle, onAction }: { title: string; message?: string; actionTitle?: string; onAction?: () => void }) {
  return <View style={[ui.card, ui.empty]}>
    <Text style={[type.subheading, ui.center]}>{title}</Text>
    {!!message && <Text style={[type.body, ui.center]}>{message}</Text>}
    {!!actionTitle && !!onAction && <Button title={actionTitle} secondary onPress={onAction} />}
  </View>;
}

export function ProgressBar({ value, label, tone = 'ink' }: { value: number; label: string; tone?: 'ink' | 'accent' | 'success' }) {
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={ui.track}>
    <View style={[ui.fill, { width: `${pct}%`, backgroundColor: tone === 'accent' ? colors.accentInk : tone === 'success' ? colors.success : colors.ink }]} />
  </View>;
}

export function Bullet({ children }: { children: string }) {
  return <View style={ui.bullet}><Text style={type.body} importantForAccessibility="no">•</Text><Text selectable style={[type.body, ui.flex]}>{children}</Text></View>;
}

export const ui = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  button: { minHeight: layout.controlHeight, borderRadius: radii.md, paddingHorizontal: space.lg, paddingVertical: space.sm, flexDirection: 'row', gap: space.xs, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.black },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong },
  destructive: { backgroundColor: colors.danger },
  ghost: { backgroundColor: 'transparent', minHeight: layout.minTouch },
  buttonText: { textAlign: 'center', flexShrink: 1 },
  card: { padding: space.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: space.sm, ...shadow.card },
  cardMuted: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  cardDanger: { borderColor: colors.dangerLine, borderWidth: 1 },
  cardSuccess: { borderColor: colors.successLine, borderWidth: 1, backgroundColor: colors.successSurface },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 72 },
  navCardDark: { backgroundColor: colors.black, borderColor: colors.black },
  navCopy: { flex: 1, minWidth: 0, gap: space.xxs },
  chevron: { fontSize: 26, lineHeight: 28, color: colors.placeholder, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, minHeight: 64 },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  trailing: { flexShrink: 0 },
  badge: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badgeText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { minHeight: layout.minTouch, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.lineStrong, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.black, borderColor: colors.black },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.ink },
  field: { gap: space.xs },
  input: { borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16, lineHeight: 22, color: colors.ink, minHeight: layout.controlHeight },
  inputMultiline: { minHeight: 120, paddingTop: space.sm },
  pageHeader: { gap: space.xs, marginBottom: space.xxs },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm },
  textAction: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.xxs },
  textActionLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
  notice: { borderRadius: radii.md, borderWidth: 1, padding: space.md, gap: space.xs },
  loading: { alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.xxl },
  empty: { alignItems: 'stretch', paddingVertical: space.xl },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radii.pill },
  bullet: { flexDirection: 'row', gap: space.xs },
});
