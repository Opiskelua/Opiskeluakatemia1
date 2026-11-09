import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { disabledOpacity, makeStyles, maxScale, radii, space, useTheme } from '../theme';
import { Button, Card, Chevron, ProgressBar } from './ui';
import { Glass } from './Glass';
import { Mascot, MascotRow, useMascotUserId } from './Mascot';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { addCelebration, celebrationsOn, dismissIntro, useMascotFlags } from '../hooks/useMascotFlags';
import { isBigCelebration, moment, momentForResult, pickLine, poseFor, showOnboarding, type ResultMoment } from '../lib/mascot';
import { COURSES, type CourseId } from '../lib/courses';
import type { GradeResult, PathStateV2, PathSummaryV2, RewardSummary, StreakInfo } from '../lib/path-v2-types';
import { dayCount, nextStepLabel, pathSteps, pathStepsLabel, percent, streakHint, streakLabel } from '../lib/path-v2-model';

const nativeDriver = Platform.OS !== 'web';

/** Abi's first-time intro (moments.onboarding). "Aloitetaan" and "Ohita" both hide it for good on this device, for this course (as on the website). */
export function MascotIntro({ course, onStart }: { course: CourseId; onStart: () => void }) {
  const { type } = useTheme();
  const styles = useStyles();
  const intro = moment('onboarding');
  return <Card style={{ gap: space.sm }}>
    <View style={styles.introTop}>
      <Mascot pose={poseFor('onboarding')} size="md" decorative animateIn />
      <Text accessibilityRole="header" style={[type.heading, styles.flex]}>{intro.title}</Text>
    </View>
    {intro.lines.map(line => <Text key={line} style={type.body}>{line}</Text>)}
    <Button title={intro.cta ?? ''} onPress={() => { dismissIntro(course); onStart(); }} />
    <Button title={intro.dismiss ?? ''} variant="ghost" onPress={() => dismissIntro(course)} accessibilityHint="Piilottaa esittelyn" />
  </Card>;
}

/** Home screen entry to Polku: steps done, streak and the next step. */
export function PathHomeCard({ course, state, error, disabled, onPress, onStart }: {
  /** The course `state` belongs to. */ course: CourseId;
  state: PathStateV2 | null; error: boolean; disabled: boolean; onPress: () => void;
  /** Onboarding "Aloitetaan"; defaults to onPress. */ onStart?: () => void;
}) {
  const mascot = useMascotFlags();
  const intro = !!state && !disabled && mascot.ready && showOnboarding(state, mascot.introDismissed[course]);
  return <>
    {intro && <MascotIntro course={course} onStart={onStart ?? onPress} />}
    <PathHomeButton course={course} state={state} error={error} disabled={disabled} onPress={onPress} />
  </>;
}

function PathHomeButton({ course, state, error, disabled, onPress }: { course: CourseId; state: PathStateV2 | null; error: boolean; disabled: boolean; onPress: () => void }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const next = state ? nextStepLabel(state, COURSES[course].features.flashcards) : null;
  const kicker = state ? `Polku · ${pathStepsLabel(state)}` : 'Polku';
  const title = next ? (state?.nextLessonId ? `Seuraavaksi: ${next.title}` : next.title) : error ? 'Avaa oppimispolku' : 'Ladataan polkua…';
  const detail = state ? `${streakLabel(state.streak)} · ${next?.detail ?? ''}` : error ? 'Tilannetta ei saatu juuri nyt. Avaa polku yrittääksesi uudelleen.' : 'Oppitunnit, välietapit ja kertaus.';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${kicker}. ${title}. ${detail}`} accessibilityHint="Avaa oppimispolun" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[styles.homeShell, disabled && { opacity: disabledOpacity }]}>
    {/* Real glass under a graphite scrim (contrast holds whatever is behind). Pressed darkens the scrim
        instead of lowering opacity, and disabled goes solid, because Liquid Glass stops rendering below opacity 1. */}
    {({ pressed }) => <Glass solid={disabled} interactive style={styles.home} scrim={pressed ? colors.heroGlassPressed : colors.heroGlass} fallbackColor={pressed ? colors.heroTrack : colors.hero}>
    <View style={styles.homeTop}>
      <View style={styles.flex}>
        <Text style={[type.overline, { color: colors.accent }]} numberOfLines={2}>{kicker}</Text>
        <Text style={[type.subheading, { color: colors.onHero }]}>{title}</Text>
        <Text style={[type.caption, { color: colors.onHeroMuted }]}>{detail}</Text>
      </View>
      <Chevron light />
    </View>
    {state && <ProgressBar dark value={percent(pathSteps(state).fraction)} label={`Polun eteneminen: ${pathStepsLabel(state)}`} />}
    </Glass>}
  </Pressable>;
}

/** Two side-by-side tiles: path progress and the study streak. Stacks at large text sizes. */
export function StepsStreak({ summary, streak, stacked = false, atRiskLine = null }: {
  summary: Pick<PathSummaryV2, 'units'>; streak: StreakInfo; stacked?: boolean;
  /** moments.streakAtRisk line; replaces the hint and adds Abi when the streak can still be kept this evening. */ atRiskLine?: string | null;
}) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const steps = pathSteps(summary);
  return <View style={[styles.tiles, stacked && { flexDirection: 'column' }]}>
    <View accessible accessibilityLabel={`Polku: ${pathStepsLabel(summary)} tehty, ${steps.unitsDone} / ${steps.units} osiota valmiina`} style={styles.tile}>
      <Text style={type.overline}>Polku</Text>
      <Text style={[type.subheading, steps.done === steps.total && { color: colors.success }]}>{pathStepsLabel(summary)}</Text>
      <ProgressBar tone={steps.done === steps.total ? 'success' : 'accent'} value={percent(steps.fraction)} label="Polun eteneminen" />
      <Text style={type.caption}>{steps.unitsDone} / {steps.units} osiota valmiina</Text>
    </View>
    <View accessible accessibilityLabel={`Opiskeluputki: ${streakLabel(streak)}. Pisin ${dayCount(streak.longest)}. ${atRiskLine ?? streakHint(streak)}`} style={styles.tile}>
      <Text style={type.overline}>Putki</Text>
      <View style={styles.streakRow}>
        <View style={[styles.streakDot, streak.practicedToday && styles.streakDotOn]} />
        <Text style={[type.subheading, styles.flex]}>{streakLabel(streak)}</Text>
      </View>
      {atRiskLine ? <MascotRow pose={poseFor('streakAtRisk')} size="sm" line={atRiskLine} /> : <Text style={type.caption}>{streakHint(streak)}</Text>}
    </View>
  </View>;
}

/**
 * Abi's reaction on the lesson result screen. The moment is decided once (when the device flags
 * are known) so counting a big celebration does not change it; only unitCompleted counts toward
 * the daily cap (levelUp is paused with XP). The line is real text; the image is decorative.
 */
export function ResultMascot({ result, rewards, summary }: { result: GradeResult; rewards: RewardSummary | null; summary: PathSummaryV2 }) {
  const flags = useMascotFlags();
  const userId = useMascotUserId();
  const [chosen, setChosen] = useState<ResultMoment | null>(null);
  if (!chosen && flags.ready) setChosen(momentForResult(result, rewards, celebrationsOn(summary.today)));
  const counted = useRef(false);
  useEffect(() => {
    if (!chosen || counted.current) return;
    counted.current = true;
    if (isBigCelebration(chosen)) addCelebration(summary.today);
  }, [chosen, summary.today]);
  if (!chosen) return null;
  const line = pickLine(chosen, summary.today, userId);
  return <MascotRow pose={poseFor(chosen)} size={isBigCelebration(chosen) ? 'lg' : 'md'} line={line} animateIn />;
}

/** Score summary after a lesson, checkpoint or Kertaus. */
export function ScoreCard({ result, passScore, checkpoint, review }: { result: GradeResult; passScore: number; checkpoint: boolean; review: boolean }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const message = review
    ? result.passed ? 'Hienoa – korjatut kohdat poistuvat kertauslistalta.' : 'Väärät kohdat jäävät kertauslistalle seuraavaa kertaa varten.'
    : result.passed ? (checkpoint ? 'Välietappi läpäisty! Osa on suoritettu.' : 'Läpäisty! Oppitunti on suoritettu.')
      : `Läpäisyyn tarvitaan ${passScore} %. Kertaa sääntö ja yritä uudelleen – paras tulos jää voimaan.`;
  return <Card tone={result.passed ? 'success' : 'default'} style={{ alignItems: 'center' }}>
    <Text style={[type.overline, result.passed && { color: colors.success }]}>{review ? 'Kertauksen tulos' : result.passed ? 'Läpäisty' : 'Ei vielä läpi'}</Text>
    <Text accessibilityLabel={`Tulos ${result.score} prosenttia, ${result.correctCount} / ${result.total} oikein`} style={[type.stat, styles.score]} maxFontSizeMultiplier={maxScale.stat}>{result.score} %</Text>
    <Text style={type.label}>{result.correctCount} / {result.total} oikein</Text>
    <Text style={[type.body, { textAlign: 'center' }]}>{message}</Text>
  </Card>;
}

/**
 * What a submit unlocked: unit completed, new unit open, streak day. A short entrance (fade + rise),
 * skipped when Reduce motion is on. Renders nothing when there is nothing to report. (XP is paused.)
 */
export function RewardCard({ rewards, unlockedTitle, completedTitle, passed }: {
  rewards: RewardSummary; unlockedTitle?: string | null; completedTitle?: string | null;
  /** The streak line is only shown for an attempt that counted as a study day. */ passed: boolean;
}) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const appear = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce === null) return;
    if (reduce) { appear.setValue(1); return; }
    const animation = Animated.timing(appear, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver });
    animation.start();
    return () => animation.stop();
  }, [reduce, appear]);

  const lines: { key: string; title: string; detail: string }[] = [];
  if (completedTitle) lines.push({ key: 'unit', title: 'Osa suoritettu', detail: completedTitle });
  if (unlockedTitle) lines.push({ key: 'unlock', title: 'Uusi osa avautui', detail: unlockedTitle });
  if (passed && rewards.streak.practicedToday && rewards.streak.current > 0) lines.push({ key: 'streak', title: streakLabel(rewards.streak), detail: rewards.streak.current >= rewards.streak.longest && rewards.streak.current > 1 ? 'Pisin putkesi tähän mennessä.' : 'Tämä päivä on kirjattu putkeen.' });
  if (lines.length === 0) return null;

  return <Animated.View accessible accessibilityRole="summary" accessibilityLabel={lines.map(l => `${l.title}. ${l.detail}`).join('. ')} accessibilityLiveRegion="polite"
    style={[styles.reward, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
    {lines.map(line => <View key={line.key} style={styles.rewardLine}>
      <View style={styles.rewardMark}><Text style={styles.rewardMarkText} maxFontSizeMultiplier={1.2}>✓</Text></View>
      <View style={styles.flex}>
        <Text style={[type.label, { color: colors.onHero }]}>{line.title}</Text>
        <Text style={[type.caption, { color: colors.onHeroMuted }]}>{line.detail}</Text>
      </View>
    </View>)}
  </Animated.View>;
}

/** Gentle repeating pulse for the "you are here" node; static when Reduce motion is on. */
export function usePulse() {
  const reduce = useReduceMotion();
  const value = useState(() => new Animated.Value(0))[0];
  useEffect(() => {
    if (reduce !== false) { value.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(value, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(value, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduce, value]);
  return value;
}

const useStyles = makeStyles(({ colors, shadow, glass }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  introTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  home: { borderRadius: radii.xl, padding: space.lg, gap: space.sm, minHeight: 72 },
  homeShell: { borderRadius: radii.xl, ...shadow.raised },
  homeTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, minWidth: 0, padding: space.md, borderRadius: radii.xl, gap: space.xs, ...glass.card },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  streakDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.accentInk },
  streakDotOn: { backgroundColor: colors.accentInk },
  score: { fontSize: 48, lineHeight: 56 },
  reward: { backgroundColor: colors.hero, borderRadius: radii.xl, padding: space.lg, gap: space.md, borderWidth: 1, borderColor: colors.hero, borderTopColor: colors.heroTrack, ...shadow.raised },
  rewardLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rewardMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  // Fixed dark ink on the gold mark in both modes.
  rewardMarkText: { color: colors.black, fontSize: 13, fontWeight: '700' },
}));
