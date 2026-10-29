import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { disabledOpacity, makeStyles, maxScale, radii, space, useTheme } from '../theme';
import { Card, Chevron, ProgressBar } from './ui';
import { useReduceMotion } from '../hooks/useReduceMotion';
import type { DailyGoalInfo, GradeResult, LevelInfo, PathStateV2, RewardSummary, StreakInfo } from '../lib/path-v2-types';
import { dailyGoalFraction, dailyGoalLabel, dayCount, formatXp, levelRemainingLabel, levelSpanLabel, nextStepLabel, percent, streakHint, streakLabel } from '../lib/path-v2-model';

const nativeDriver = Platform.OS !== 'web';

/** Dark "career" card: level number, rank title and XP toward the next rank. */
export function CareerCard({ level, compact = false }: { level: LevelInfo; compact?: boolean }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const next = level.nextLevelTitle ? `Seuraava: ${level.nextLevelTitle}` : 'Korkein arvo saavutettu';
  return <View style={[styles.career, compact && styles.careerCompact]}>
    <View style={styles.careerTop}>
      <View accessible accessibilityLabel={`Taso ${level.level}`} style={styles.levelBadge}>
        <Text style={styles.levelSmall} maxFontSizeMultiplier={1.2}>TASO</Text>
        <Text style={styles.levelNumber} maxFontSizeMultiplier={1.2}>{level.level}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[type.overline, { color: colors.accent }]}>Urapolku</Text>
        <Text accessibilityRole="header" style={[type.heading, { color: colors.onHero }]} maxFontSizeMultiplier={maxScale.title}>{level.title}</Text>
        <Text style={[type.caption, { color: colors.onHeroMuted }]}>{formatXp(level.xp)} yhteensä</Text>
      </View>
    </View>
    <ProgressBar dark value={percent(level.progress)} label={`Eteneminen seuraavalle tasolle: ${levelRemainingLabel(level)}`} />
    <View style={styles.careerFoot}>
      <Text style={[type.caption, styles.flex, { color: colors.onHeroMuted }]} numberOfLines={2}>{next}</Text>
      <Text style={[type.caption, { color: colors.onHero, fontWeight: '600' }]}>{levelSpanLabel(level)}</Text>
    </View>
  </View>;
}

/** Home screen entry to Polku: level, streak, today's goal and the next lesson. */
export function PathHomeCard({ state, error, disabled, onPress }: { state: PathStateV2 | null; error: boolean; disabled: boolean; onPress: () => void }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const next = state ? nextStepLabel(state) : null;
  const kicker = state ? `Polku · Taso ${state.level.level} · ${state.level.title}` : 'Polku';
  const title = next ? (state?.nextLessonId ? `Seuraavaksi: ${next.title}` : next.title) : error ? 'Avaa oppimispolku' : 'Ladataan polkua…';
  const detail = state ? `${streakLabel(state.streak)} · Tänään ${dailyGoalLabel(state.dailyGoal)}` : error ? 'Tilannetta ei saatu juuri nyt. Avaa polku yrittääksesi uudelleen.' : 'Oppitunnit, välietapit ja kertaus.';
  return <Pressable accessibilityRole="button" accessibilityLabel={`${kicker}. ${title}. ${detail}`} accessibilityHint="Avaa oppimispolun" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.home, pressed && { opacity: 0.85 }, disabled && { opacity: disabledOpacity }]}>
    <View style={styles.homeTop}>
      <View style={styles.flex}>
        <Text style={[type.overline, { color: colors.accent }]} numberOfLines={2}>{kicker}</Text>
        <Text style={[type.subheading, { color: colors.onHero }]}>{title}</Text>
        <Text style={[type.caption, { color: colors.onHeroMuted }]}>{detail}</Text>
      </View>
      <Chevron light />
    </View>
    {state && <ProgressBar dark value={percent(dailyGoalFraction(state.dailyGoal))} label="Päivän XP-tavoite" />}
  </Pressable>;
}

/** Two side-by-side tiles: today's XP goal and the study streak. Stacks at large text sizes. */
export function GoalStreak({ goal, streak, stacked = false }: { goal: DailyGoalInfo; streak: StreakInfo; stacked?: boolean }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  return <View style={[styles.tiles, stacked && { flexDirection: 'column' }]}>
    <View accessible accessibilityLabel={`Päivän tavoite: ${goal.earnedXp} / ${goal.targetXp} XP${goal.reached ? ', saavutettu' : ''}`} style={styles.tile}>
      <Text style={type.overline}>Päivän tavoite</Text>
      <Text style={[type.subheading, goal.reached && { color: colors.success }]}>{goal.reached ? '✓ ' : ''}{dailyGoalLabel(goal)}</Text>
      <ProgressBar tone={goal.reached ? 'success' : 'accent'} value={percent(dailyGoalFraction(goal))} label="Päivän tavoite" />
    </View>
    <View accessible accessibilityLabel={`Opiskeluputki: ${streakLabel(streak)}. Pisin ${dayCount(streak.longest)}. ${streakHint(streak)}`} style={styles.tile}>
      <Text style={type.overline}>Putki</Text>
      <View style={styles.streakRow}>
        <View style={[styles.streakDot, streak.practicedToday && styles.streakDotOn]} />
        <Text style={[type.subheading, styles.flex]}>{streakLabel(streak)}</Text>
      </View>
      <Text style={type.caption}>{streakHint(streak)}</Text>
    </View>
  </View>;
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
 * Rewards after a submit. A short entrance (fade + rise) and an XP count-up, skipped entirely
 * when the system's Reduce motion setting is on.
 */
export function RewardCard({ rewards, levelTitle, unlockedTitle, completedTitle, passed }: {
  rewards: RewardSummary; levelTitle: string; unlockedTitle?: string | null; completedTitle?: string | null;
  /** The streak line is only shown for an attempt that counted as a study day. */ passed: boolean;
}) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  const reduce = useReduceMotion();
  const appear = useState(() => new Animated.Value(0))[0];
  const counter = useState(() => new Animated.Value(0))[0];
  const [shownXp, setShownXp] = useState(0);
  useEffect(() => {
    if (reduce === null) return;
    if (reduce) { appear.setValue(1); return; }
    const id = counter.addListener(({ value }) => setShownXp(Math.round(value)));
    const animation = Animated.sequence([
      Animated.timing(appear, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.timing(counter, { toValue: rewards.xpGained, duration: Math.min(900, 200 + rewards.xpGained * 20), easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]);
    animation.start(() => setShownXp(rewards.xpGained));
    return () => { animation.stop(); counter.removeListener(id); };
  }, [reduce, rewards.xpGained, appear, counter]);

  const lines: { key: string; title: string; detail: string }[] = [];
  if (rewards.leveledUp) lines.push({ key: 'level', title: `Ylennys: taso ${rewards.levelAfter}`, detail: `Uusi arvosi on ${levelTitle}.` });
  if (completedTitle) lines.push({ key: 'unit', title: 'Osa suoritettu', detail: completedTitle });
  if (unlockedTitle) lines.push({ key: 'unlock', title: 'Uusi osa avautui', detail: unlockedTitle });
  if (rewards.dailyGoalReached) lines.push({ key: 'goal', title: 'Päivän tavoite saavutettu', detail: 'Tämän päivän XP-tavoite on täynnä.' });
  if (passed && rewards.streak.practicedToday && rewards.streak.current > 0) lines.push({ key: 'streak', title: streakLabel(rewards.streak), detail: rewards.streak.current >= rewards.streak.longest && rewards.streak.current > 1 ? 'Pisin putkesi tähän mennessä.' : 'Tämä päivä on kirjattu putkeen.' });

  const summary = [rewards.xpGained > 0 ? `Ansaitsit ${rewards.xpGained} XP` : 'Ei uutta XP:tä tästä suorituksesta', ...lines.map(l => `${l.title}. ${l.detail}`)].join('. ');
  return <Animated.View accessible accessibilityRole="summary" accessibilityLabel={summary} accessibilityLiveRegion="polite"
    style={[styles.reward, { opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
    <View style={styles.rewardTop}>
      <Text style={[type.overline, { color: colors.accent }]}>Palkinnot</Text>
      <Text style={styles.rewardXp} maxFontSizeMultiplier={maxScale.stat}>{rewards.xpGained > 0 ? `+${reduce ? rewards.xpGained : shownXp} XP` : '+0 XP'}</Text>
      <Text style={[type.caption, { color: colors.onHeroMuted }]}>
        {rewards.xpGained > 0 ? `${formatXp(rewards.xpAfter)} yhteensä` : passed ? 'XP:tä saa ensimmäisestä läpäisystä. Uusinta voi silti nostaa parasta tulosta.' : 'XP:tä saa, kun läpäiset ensimmäistä kertaa.'}
      </Text>
    </View>
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

const useStyles = makeStyles(({ colors, shadow, scheme }) => StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  career: { backgroundColor: colors.hero, borderRadius: radii.xl, padding: space.lg, gap: space.md, ...shadow.raised },
  careerCompact: { padding: space.md, gap: space.sm, borderRadius: radii.xl },
  careerTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  levelBadge: { width: 64, height: 64, borderRadius: radii.lg, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  levelSmall: { color: colors.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  levelNumber: { color: colors.onHero, fontSize: 28, lineHeight: 32, fontWeight: '700' },
  careerFoot: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  home: { backgroundColor: colors.hero, borderRadius: radii.xl, padding: space.lg, gap: space.sm, minHeight: 72, ...shadow.card },
  homeTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tiles: { flexDirection: 'row', gap: space.sm },
  tile: { flex: 1, minWidth: 0, padding: space.md, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: scheme === 'dark' ? 0 : StyleSheet.hairlineWidth, borderColor: colors.line, gap: space.xs, ...shadow.card },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  streakDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.accentInk },
  streakDotOn: { backgroundColor: colors.accentInk },
  score: { fontSize: 48, lineHeight: 56 },
  reward: { backgroundColor: colors.hero, borderRadius: radii.xl, padding: space.lg, gap: space.md, ...shadow.raised },
  rewardTop: { gap: 2 },
  rewardXp: { color: colors.onHero, fontSize: 40, lineHeight: 46, fontWeight: '700', letterSpacing: -1 },
  rewardLine: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm },
  rewardMark: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  // Fixed dark ink on the gold mark in both modes.
  rewardMarkText: { color: colors.black, fontSize: 13, fontWeight: '700' },
}));
