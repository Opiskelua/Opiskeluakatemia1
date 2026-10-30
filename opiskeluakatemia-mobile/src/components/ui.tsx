import type { ReactNode, Ref } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type TextInputInstance, type TextInputProps, type ViewStyle } from 'react-native';
import { disabledOpacity, layout, makeStyles, maxScale, pressedOpacity, radii, space, useTheme } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'ghost';

export function Button({ title, onPress, disabled = false, loading = false, variant = 'primary', secondary = false, accessibilityLabel, accessibilityHint, accessibilityRole = 'button', style }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: ButtonVariant;
  /** Shorthand for variant="secondary". */
  secondary?: boolean; accessibilityLabel?: string; accessibilityHint?: string; style?: StyleProp<ViewStyle>;
  /** "link" for buttons that leave the app (browser, mail). */
  accessibilityRole?: 'button' | 'link';
}) {
  const { colors, type } = useTheme();
  const ui = useStyles();
  const kind: ButtonVariant = secondary ? 'secondary' : variant;
  const inactive = disabled || loading;
  const textColor = kind === 'primary' ? colors.onPrimary : kind === 'destructive' ? colors.white : colors.ink;
  return <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={accessibilityLabel} accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled: inactive, busy: loading }} disabled={inactive} onPress={onPress}
    style={({ pressed }) => [ui.button, ui[kind], pressed && { opacity: pressedOpacity }, inactive && { opacity: disabledOpacity }, style]}>
    {loading && <ActivityIndicator color={textColor} />}
    <Text style={[type.button, ui.buttonText, { color: textColor }]}>{title}</Text>
  </Pressable>;
}

export function Card({ children, style, tone = 'default' }: { children: ReactNode; style?: StyleProp<ViewStyle>; tone?: 'default' | 'muted' | 'danger' | 'success' }) {
  const ui = useStyles();
  return <View style={[ui.card, tone === 'muted' && ui.cardMuted, tone === 'danger' && ui.cardDanger, tone === 'success' && ui.cardSuccess, style]}>{children}</View>;
}

/** Large tappable card with title, optional description and chevron. `dark` renders the emphasised hero style. */
export function NavCard({ title, description, kicker, onPress, disabled = false, dark = false, accessibilityLabel, accessibilityHint, children }: {
  title: string; description?: string; kicker?: string; onPress: () => void; disabled?: boolean; dark?: boolean;
  accessibilityLabel?: string; accessibilityHint?: string; children?: ReactNode;
}) {
  const { colors, type } = useTheme();
  const ui = useStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? [kicker, title, description].filter(Boolean).join('. ')} accessibilityHint={accessibilityHint}
    accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.card, ui.navCard, dark && ui.navCardDark, pressed && (dark ? { opacity: 0.85 } : { backgroundColor: colors.surfacePressed }), disabled && { opacity: disabledOpacity }]}>
    <View style={ui.navCopy}>
      {!!kicker && <Text style={[type.overline, dark && { color: colors.accent }]}>{kicker}</Text>}
      <Text style={[type.subheading, dark && { color: colors.onHero }]}>{title}</Text>
      {!!description && <Text style={[type.caption, dark && { color: colors.onHeroMuted }]}>{description}</Text>}
      {children}
    </View>
    <Chevron light={dark} />
  </Pressable>;
}

export function Chevron({ light = false }: { light?: boolean }) {
  const { colors } = useTheme();
  const ui = useStyles();
  return <Text importantForAccessibility="no" accessibilityElementsHidden style={[ui.chevron, light && { color: colors.onHeroMuted }]}>›</Text>;
}

/** Compact list row, e.g. a history entry. */
export function ListRow({ title, subtitle, badge, trailing, onPress, accessibilityLabel }: {
  title: string; subtitle?: string; badge?: string; trailing?: string; onPress?: () => void; accessibilityLabel?: string;
}) {
  const { colors, type } = useTheme();
  const ui = useStyles();
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
  const { colors } = useTheme();
  const ui = useStyles();
  return <Pressable accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [ui.chip, selected && ui.chipOn, pressed && !selected && { backgroundColor: colors.surfacePressed }, disabled && { opacity: disabledOpacity }]}>
    <Text style={[ui.chipText, selected && { color: colors.onPrimary }]}>{label}</Text>
  </Pressable>;
}

export function ChipRow({ children }: { children: ReactNode }) {
  const ui = useStyles();
  return <View style={ui.chipRow}>{children}</View>;
}

/** Grouped single-choice list with radio marks, e.g. the appearance setting. */
export function OptionGroup<T extends string>({ options, value, onChange, accessibilityLabel }: {
  options: { value: T; label: string; icon?: string }[]; value: T; onChange: (value: T) => void; accessibilityLabel: string;
}) {
  const { colors, type } = useTheme();
  const ui = useStyles();
  return <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={ui.group}>
    {options.map((option, i) => {
      const selected = option.value === value;
      // TalkBack reads `checked` on radios; VoiceOver reads `selected` and is verbose with both.
      return <Pressable key={option.value} accessibilityRole="radio" accessibilityState={Platform.OS === 'android' ? { checked: selected } : { selected }} accessibilityLabel={option.label}
        onPress={() => onChange(option.value)}
        style={({ pressed }) => [ui.option, i > 0 && ui.optionDivider, pressed && { backgroundColor: colors.surfacePressed }]}>
        {!!option.icon && <Text style={ui.optionIcon} importantForAccessibility="no">{option.icon}</Text>}
        <Text style={[type.bodyStrong, ui.flex]}>{option.label}</Text>
        <View style={[ui.radio, selected && ui.radioOn]}>{selected && <View style={ui.radioDot} />}</View>
      </Pressable>;
    })}
  </View>;
}

/** Labelled text input. `hint` is shown below the field and read as the accessibility hint. Pass `ref` to move focus between fields. */
export function Field({ label, hint, style, multiline, ref, ...props }: TextInputProps & { label?: string; hint?: string; ref?: Ref<TextInputInstance> }) {
  const { colors, type, scheme } = useTheme();
  const ui = useStyles();
  return <View style={ui.field}>
    {!!label && <Text style={type.label}>{label}</Text>}
    <TextInput ref={ref} placeholderTextColor={colors.placeholder} keyboardAppearance={scheme} accessibilityLabel={props.accessibilityLabel ?? label} accessibilityHint={props.accessibilityHint ?? hint} multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'} {...props}
      style={[ui.input, multiline && ui.inputMultiline, props.editable === false && { opacity: 0.6 }, style]} />
    {!!hint && <Text style={type.caption} importantForAccessibility="no" accessibilityElementsHidden>{hint}</Text>}
  </View>;
}

export function PageHeader({ kicker, title, intro }: { kicker?: string; title: string; intro?: string }) {
  const { type } = useTheme();
  const ui = useStyles();
  return <View style={ui.pageHeader}>
    {!!kicker && <Text style={type.overline}>{kicker}</Text>}
    <Text accessibilityRole="header" style={type.title} maxFontSizeMultiplier={maxScale.title}>{title}</Text>
    {!!intro && <Text style={type.body}>{intro}</Text>}
  </View>;
}

export function SectionTitle({ title, detail, action }: { title: string; detail?: string; action?: { label: string; onPress: () => void; accessibilityLabel?: string } }) {
  const { type } = useTheme();
  const ui = useStyles();
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
  const { colors, type } = useTheme();
  const ui = useStyles();
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
  const { colors, type } = useTheme();
  const ui = useStyles();
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} style={ui.loading}>
    <ActivityIndicator color={colors.ink} />
    <Text style={type.caption}>{label}</Text>
  </View>;
}

export function EmptyState({ title, message, actionTitle, onAction, actionDisabled }: { title: string; message?: string; actionTitle?: string; onAction?: () => void; actionDisabled?: boolean }) {
  const { type } = useTheme();
  const ui = useStyles();
  return <View style={[ui.card, ui.empty]}>
    <Text accessibilityRole="header" style={[type.subheading, ui.center]}>{title}</Text>
    {!!message && <Text style={[type.body, ui.center]}>{message}</Text>}
    {!!actionTitle && !!onAction && <Button title={actionTitle} secondary disabled={actionDisabled} onPress={onAction} />}
  </View>;
}

export function ProgressBar({ value, label, tone = 'ink', dark = false }: { value: number; label: string; tone?: 'ink' | 'accent' | 'success'; dark?: boolean }) {
  const { colors } = useTheme();
  const ui = useStyles();
  const pct = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  // On hero surfaces the bar uses the hero track and the bright gold fill.
  const fill = dark ? colors.accent : tone === 'accent' ? colors.accentInk : tone === 'success' ? colors.success : colors.ink;
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }} style={[ui.track, dark && { backgroundColor: colors.heroTrack }]}>
    <View style={[ui.fill, { width: `${pct}%`, backgroundColor: fill }]} />
  </View>;
}

/** Small status label, e.g. "Tulossa" or "Kesken". */
export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'success' | 'accent' | 'dark' }) {
  const { colors } = useTheme();
  const ui = useStyles();
  const palette = tone === 'success' ? { bg: colors.successSurface, fg: colors.success }
    : tone === 'accent' ? { bg: colors.accentSurface, fg: colors.accentInk }
      : tone === 'dark' ? { bg: colors.primary, fg: colors.onPrimary }
        : { bg: colors.surfaceMuted, fg: colors.inkSecondary };
  return <View style={[ui.pill, { backgroundColor: palette.bg }]}>
    <Text style={[ui.pillText, { color: palette.fg }]} maxFontSizeMultiplier={1.4}>{label}</Text>
  </View>;
}

export function Bullet({ children }: { children: string }) {
  const { type } = useTheme();
  const ui = useStyles();
  return <View style={ui.bullet}><Text style={type.body} importantForAccessibility="no">•</Text><Text selectable style={[type.body, ui.flex]}>{children}</Text></View>;
}

const useStyles = makeStyles(({ colors, shadow, scheme }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  button: { minHeight: layout.controlHeight, borderRadius: radii.pill, paddingHorizontal: space.xl, paddingVertical: space.sm, flexDirection: 'row', gap: space.xs, alignItems: 'center', justifyContent: 'center' },
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceMuted },
  destructive: { backgroundColor: scheme === 'dark' ? '#C4392F' : colors.danger },
  ghost: { backgroundColor: 'transparent', minHeight: layout.minTouch },
  buttonText: { textAlign: 'center', flexShrink: 1 },
  card: { padding: space.lg, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: scheme === 'dark' ? 0 : StyleSheet.hairlineWidth, borderColor: colors.line, gap: space.sm, ...shadow.card },
  cardMuted: { backgroundColor: colors.surfaceMuted, borderColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  cardDanger: { borderColor: colors.dangerLine, borderWidth: 1 },
  cardSuccess: { borderColor: colors.successLine, borderWidth: 1, backgroundColor: colors.successSurface },
  navCard: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 76 },
  navCardDark: { backgroundColor: colors.hero, borderColor: colors.hero },
  navCopy: { flex: 1, minWidth: 0, gap: space.xxs },
  chevron: { fontSize: 26, lineHeight: 28, color: colors.placeholder, flexShrink: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.sm, paddingHorizontal: space.md, minHeight: 68 },
  rowCopy: { flex: 1, minWidth: 0, gap: 2 },
  trailing: { flexShrink: 0 },
  badge: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badgeText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: { minHeight: layout.minTouch, paddingHorizontal: space.md, paddingVertical: space.xs, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, justifyContent: 'center' },
  chipOn: { backgroundColor: colors.primary },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600', color: colors.ink },
  group: { borderRadius: radii.xl, backgroundColor: colors.surface, overflow: 'hidden', borderWidth: scheme === 'dark' ? 0 : StyleSheet.hairlineWidth, borderColor: colors.line },
  option: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, minHeight: 60 },
  optionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  optionIcon: { fontSize: 20, width: 28, textAlign: 'center', color: colors.ink },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.control, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.onPrimary },
  field: { gap: space.xs },
  input: { borderWidth: 1, borderColor: colors.control, backgroundColor: colors.surface, borderRadius: radii.md, paddingHorizontal: space.md, paddingVertical: space.sm, fontSize: 16, lineHeight: 22, color: colors.ink, minHeight: layout.controlHeight },
  inputMultiline: { minHeight: 120, paddingTop: space.sm },
  pageHeader: { gap: space.xs, marginBottom: space.xxs },
  sectionTitle: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, marginTop: space.sm },
  textAction: { minHeight: layout.minTouch, justifyContent: 'center', paddingHorizontal: space.xxs },
  textActionLabel: { fontSize: 15, fontWeight: '600', color: colors.ink, textDecorationLine: 'underline' },
  notice: { borderRadius: radii.lg, borderWidth: 1, padding: space.md, gap: space.xs },
  loading: { alignItems: 'center', justifyContent: 'center', gap: space.sm, paddingVertical: space.xxl },
  empty: { alignItems: 'stretch', paddingVertical: space.xl },
  track: { height: 8, borderRadius: radii.pill, backgroundColor: colors.track, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radii.pill },
  bullet: { flexDirection: 'row', gap: space.xs },
  pill: { alignSelf: 'flex-start', borderRadius: radii.pill, paddingHorizontal: space.xs + 2, paddingVertical: 3 },
  pillText: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.2 },
}));
