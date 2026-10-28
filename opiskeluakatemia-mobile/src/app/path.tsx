import { useCallback, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Screen, useGutter, usePullToRefresh } from '../components/Screen';
import { Button, Chip, ChipRow, LoadingState, NavCard, Notice, Pill, ProgressBar } from '../components/ui';
import { CareerCard, GoalStreak, usePulse } from '../components/PathProgress';
import { colors, layout, maxScale, radii, shadow, space, type } from '../theme';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { choices } from '../lib/catalogue';
import { loadPath, PATH_PREVIEW, type PreviewScenario } from '../lib/path-v2';
import type { LessonProgressV2, PathStateV2, PublicLessonV2, PublicUnitV2, UnitProgressV2 } from '../lib/path-v2-types';
import { lessonState, nextStepLabel, resourceRoute, skillLabel, windingOffset, type NodeState } from '../lib/path-v2-model';

const SCENARIOS: PreviewScenario[] = ['fresh', 'midway', 'complete'];
const NODE = 64;
const LABEL_WIDTH = 200;

function LockGlyph({ color = colors.muted }: { color?: string }) {
  return <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.lock}>
    <View style={[styles.lockShackle, { borderColor: color }]} />
    <View style={[styles.lockBody, { backgroundColor: color }]} />
  </View>;
}

function nodeCaption(lesson: PublicLessonV2, progress: LessonProgressV2 | undefined, state: NodeState) {
  if (state === 'completed') return `Valmis · paras ${progress?.bestScore ?? 0} %`;
  if (state === 'in_progress') return progress?.attempts ? `Kesken · viimeksi ${progress.lastScore ?? 0} %` : 'Kesken · luonnos tallessa';
  if (state === 'locked') return lesson.kind === 'checkpoint' ? 'Avautuu, kun oppitunnit on tehty' : 'Lukittu';
  return `${lesson.estimatedMinutes} min · ${lesson.maxXp} XP`;
}

function LessonNode({ lesson, progress, isNext, offset }: { lesson: PublicLessonV2; progress?: LessonProgressV2; isNext: boolean; offset: number }) {
  const state = lessonState(progress);
  const pulse = usePulse();
  const checkpoint = lesson.kind === 'checkpoint';
  const locked = state === 'locked';
  const done = state === 'completed';
  const perfect = done && progress?.bestScore === 100;
  const statusText = { locked: 'lukittu', available: 'avoinna', in_progress: 'kesken', completed: 'suoritettu' }[state];
  const label = `${checkpoint ? 'Välietappi' : `Oppitunti ${lesson.order}`}: ${lesson.title}. ${statusText}. ${nodeCaption(lesson, progress, state)}${isNext ? '. Seuraavana vuorossa' : ''}`;
  const ring = isNext && !locked ? <Animated.View pointerEvents="none" style={[checkpoint ? styles.ringCheckpoint : styles.ring, {
    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] }),
    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }],
  }]} /> : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: locked }}
    accessibilityHint={locked ? undefined : done ? 'Avaa oppitunnin uudelleen' : 'Avaa oppitunnin'} disabled={locked}
    onPress={() => router.push({ pathname: '/path-lesson', params: { lessonId: lesson.id } })}
    style={({ pressed }) => [styles.node, { transform: [{ translateX: offset }] }, pressed && { opacity: 0.75 }]}>
    {isNext && !locked && <View style={styles.youAreHere}><Text style={styles.youAreHereText} maxFontSizeMultiplier={1.3}>{state === 'in_progress' ? 'JATKA' : 'ALOITA'}</Text></View>}
    <View style={styles.badgeWrap}>
      {ring}
      <View style={[checkpoint ? styles.checkpoint : styles.circle,
        done ? styles.nodeDone : locked ? styles.nodeLocked : styles.nodeOpen,
        isNext && !locked && styles.nodeNext]}>
        <View style={checkpoint ? styles.unrotate : undefined}>
          {locked ? <LockGlyph />
            : done ? <Text style={[styles.nodeGlyph, { color: perfect ? colors.accent : colors.white }]} maxFontSizeMultiplier={1.2}>{perfect ? '★' : '✓'}</Text>
              : <Text style={[styles.nodeGlyph, { color: colors.ink }]} maxFontSizeMultiplier={1.2}>{checkpoint ? '⚑' : lesson.order}</Text>}
        </View>
      </View>
      {state === 'in_progress' && <View style={styles.progressDot} />}
    </View>
    <View style={styles.nodeCopy}>
      {checkpoint && <Text style={[type.overline, { textAlign: 'center' }]}>Välietappi</Text>}
      <Text style={[type.label, styles.centerText, locked && { color: colors.muted }]} numberOfLines={3}>{lesson.title}</Text>
      <Text style={[type.caption, styles.centerText]} numberOfLines={2}>{nodeCaption(lesson, progress, state)}</Text>
    </View>
  </Pressable>;
}

/** Stepping-stone dots between two nodes, drawn along the winding line. */
function Trail({ from, to, done }: { from: number; to: number; done: boolean }) {
  return <View style={styles.trail} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    {[0.25, 0.5, 0.75].map(t => <View key={t} style={[styles.trailDot, done && styles.trailDotDone, { transform: [{ translateX: from + (to - from) * t }] }]} />)}
  </View>;
}

function UnitHeader({ unit, progress }: { unit: PublicUnitV2; progress?: UnitProgressV2 }) {
  const status = progress?.status ?? 'locked';
  const pill = status === 'completed' ? <Pill label="Suoritettu" tone="success" /> : status === 'available' ? <Pill label="Auki" tone="dark" /> : <Pill label="Lukittu" />;
  return <View style={styles.unitHeader}>
    <View style={styles.unitTop}>
      <Text style={[type.overline, styles.flex]}>Osa {unit.order} · {skillLabel[unit.skill]}</Text>
      {pill}
    </View>
    <Text accessibilityRole="header" style={type.heading} maxFontSizeMultiplier={maxScale.title}>{unit.title}</Text>
    <Text style={type.caption}>{unit.subtitle}</Text>
    {progress && <View style={{ gap: space.xs, marginTop: space.xxs }}>
      <View style={styles.unitTop}>
        <Text style={[type.label, styles.flex]}>Hallinta {progress.mastery} % · {progress.masteryLabel}</Text>
        <Text style={type.caption}>{progress.lessonsCompleted}/{progress.lessonsTotal} oppituntia{progress.checkpointPassed ? ' · ✓ välietappi' : ''}</Text>
      </View>
      <ProgressBar value={progress.mastery} tone={progress.mastery >= 80 ? 'success' : 'ink'} label={`Osan ${unit.order} hallinta: ${progress.mastery} prosenttia, ${progress.masteryLabel}`} />
    </View>}
    {status === 'locked' && <Text style={type.caption}>Avautuu, kun edellisen osan välietappi on läpäisty.</Text>}
  </View>;
}

function ComingSoonUnit({ unit }: { unit: PublicUnitV2 }) {
  return <View style={[styles.unit, styles.soon]}>
    <View accessible accessibilityLabel={`Osa ${unit.order}: ${unit.title}. Tulossa. ${unit.subtitle}. Suunnitellut oppitunnit: ${unit.plannedLessons.join(', ')}.`} style={{ gap: space.xs }}>
      <View style={styles.unitTop}>
        <Text style={[type.overline, styles.flex]}>Osa {unit.order} · {skillLabel[unit.skill]}</Text>
        <Pill label="Tulossa" tone="accent" />
      </View>
      <View style={styles.soonTitle}><LockGlyph color={colors.placeholder} /><Text style={[type.subheading, styles.flex]}>{unit.title}</Text></View>
      <Text style={type.caption}>{unit.subtitle}</Text>
      {unit.plannedLessons.map(title => <View key={title} style={styles.planned}><View style={styles.plannedDot} /><Text style={[type.caption, styles.flex]}>{title}</Text></View>)}
    </View>
    {unit.resources.length > 0 && <View style={{ gap: space.xs }}>
      <Text style={type.label}>Harjoittele jo nyt</Text>
      <ChipRow>{unit.resources.map(resource => <Chip key={`${resource.kind}-${resource.id}-${resource.label}`} label={resource.label} onPress={() => router.push(resourceRoute(resource, choices))} />)}</ChipRow>
    </View>}
  </View>;
}

function UnitSection({ unit, state, amplitude }: { unit: PublicUnitV2; state: PathStateV2; amplitude: number }) {
  const progress = state.units.find(entry => entry.unitId === unit.id);
  if (unit.comingSoon) return <ComingSoonUnit unit={unit} />;
  // A locked unit is a compact preview: the full trail appears once it opens.
  if (progress?.status === 'locked' || !progress) return <View style={[styles.unit, styles.unitLocked]}>
    <UnitHeader unit={unit} progress={progress} />
    <View accessible accessibilityLabel={`Oppitunnit: ${unit.lessons.map(l => l.title).join(', ')}`} style={{ gap: space.xxs }}>
      {unit.lessons.map(lesson => <View key={lesson.id} style={styles.planned}>
        <LockGlyph color={colors.placeholder} />
        <Text style={[type.caption, styles.flex]}>{lesson.kind === 'checkpoint' ? 'Välietappi' : lesson.title}</Text>
      </View>)}
    </View>
  </View>;
  return <View style={styles.unit}>
    <UnitHeader unit={unit} progress={progress} />
    <View style={styles.trailWrap}>
      {unit.lessons.map((lesson, index) => {
        const offset = windingOffset(index) * amplitude;
        const previous = index > 0 ? windingOffset(index - 1) * amplitude : offset;
        return <View key={lesson.id} style={{ alignItems: 'center', width: '100%' }}>
          {index > 0 && <Trail from={previous} to={offset} done={lessonState(state.progress[unit.lessons[index - 1].id]) === 'completed'} />}
          <LessonNode lesson={lesson} progress={state.progress[lesson.id]} isNext={state.nextLessonId === lesson.id} offset={offset} />
        </View>;
      })}
    </View>
  </View>;
}

export default function PathScreen() {
  const { previewScenario } = useLocalSearchParams<{ previewScenario?: string }>();
  // Dev preview only: reset the in-memory preview user once, on the first load.
  const pendingScenario = useRef<PreviewScenario | undefined>(PATH_PREVIEW && SCENARIOS.includes(previewScenario as PreviewScenario) ? previewScenario as PreviewScenario : undefined);
  const load = useCallback(() => { const scenario = pendingScenario.current; pendingScenario.current = undefined; return loadPath(scenario); }, []);
  const { data, loading, error, refresh } = useSyncedResource(load);
  const pull = usePullToRefresh(refresh);
  const { width, fontScale } = useWindowDimensions();
  const gutter = useGutter();
  const largeText = fontScale > 1.35;
  const content = Math.min(width, layout.maxWidth) - gutter * 2 - space.md * 2;
  // The path straightens at large text sizes so labels keep their full width.
  const amplitude = largeText ? 0 : Math.max(0, Math.min(72, (content - LABEL_WIDTH) / 2));
  const next = data ? nextStepLabel(data) : null;
  return <Screen {...pull}>
    {PATH_PREVIEW && <View style={{ gap: space.xs }}>
      <Notice title="Esikatselutila (vain kehitys)" message="Tiedot tulevat verkkosivun esikatselu-API:sta ilman kirjautumista." />
      <ChipRow>{SCENARIOS.map(scenario => <Chip key={scenario} label={scenario} onPress={() => { pendingScenario.current = scenario; void refresh(); }} />)}</ChipRow>
    </View>}
    {loading && !data && <LoadingState label="Ladataan polkua…" />}
    {!!error && <Notice tone="error" title="Polkua ei voitu päivittää" message={error} actionTitle="Yritä uudelleen" actionDisabled={loading} onAction={() => void refresh()} />}
    {data && <>
      <CareerCard level={data.level} />
      <GoalStreak goal={data.dailyGoal} streak={data.streak} stacked={largeText || width < 340} />
      {next && <View style={styles.nextCard}>
        <Text style={type.overline}>{data.nextLessonId ? 'Seuraavaksi' : 'Tilanne'}</Text>
        <Text style={type.subheading}>{next.title}</Text>
        <Text style={type.caption}>{next.detail}</Text>
        {data.nextLessonId ? <Button title={data.progress[data.nextLessonId]?.status === 'in_progress' ? 'Jatka oppituntia' : 'Aloita oppitunti'}
          onPress={() => router.push({ pathname: '/path-lesson', params: { lessonId: data.nextLessonId! } })} />
          : data.review.pendingItems > 0 ? <Button title="Aloita kertaus" onPress={() => router.push('/path-review')} />
            : <Button title="Avaa muistikortit" secondary onPress={() => router.push('/flashcards')} />}
      </View>}
      {(data.review.pendingItems > 0 || (data.review.dueFlashcards ?? 0) > 0) && <NavCard kicker="Kertaus" title={data.review.pendingItems > 0 ? `${data.review.pendingItems} kerrattavaa kohtaa` : 'Ei kerrattavia virheitä'}
        description={[data.review.pendingItems > 0 ? `Istunnossa ${data.review.sessionSize} kohtaa omista virheistäsi` : null, data.review.dueFlashcards ? `${data.review.dueFlashcards} muistikorttia erääntynyt` : null].filter(Boolean).join(' · ')}
        onPress={() => router.push('/path-review')} />}
      {data.content.units.map(unit => <UnitSection key={unit.id} unit={unit} state={data} amplitude={amplitude} />)}
    </>}
  </Screen>;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  centerText: { textAlign: 'center' },
  nextCard: { padding: space.lg, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink, gap: space.xs, ...shadow.card },
  unit: { marginTop: space.md, padding: space.md, borderRadius: radii.xl, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line, gap: space.md, ...shadow.card },
  unitLocked: { backgroundColor: colors.surfaceMuted, shadowOpacity: 0, elevation: 0 },
  unitHeader: { gap: space.xxs },
  unitTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  soon: { backgroundColor: colors.surfaceMuted, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.lineStrong, shadowOpacity: 0, elevation: 0 },
  soonTitle: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  planned: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  plannedDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: colors.placeholder },
  trailWrap: { alignItems: 'center', paddingVertical: space.xs },
  trail: { height: 36, justifyContent: 'space-evenly', alignItems: 'center' },
  trailDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.lineStrong },
  trailDotDone: { backgroundColor: colors.ink },
  node: { alignItems: 'center', gap: space.xs, width: LABEL_WIDTH, minHeight: layout.minTouch, paddingVertical: space.xxs },
  badgeWrap: { width: NODE + 16, height: NODE + 16, alignItems: 'center', justifyContent: 'center' },
  circle: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderBottomWidth: 5 },
  checkpoint: { width: NODE - 6, height: NODE - 6, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, transform: [{ rotate: '45deg' }] },
  unrotate: { transform: [{ rotate: '-45deg' }] },
  nodeDone: { backgroundColor: colors.black, borderColor: colors.black },
  nodeOpen: { backgroundColor: colors.surface, borderColor: colors.ink },
  nodeLocked: { backgroundColor: colors.surfaceMuted, borderColor: colors.lineStrong },
  nodeNext: { backgroundColor: colors.accentSurface, borderColor: colors.accentInk },
  ring: { position: 'absolute', width: NODE + 14, height: NODE + 14, borderRadius: (NODE + 14) / 2, borderWidth: 3, borderColor: colors.accent },
  ringCheckpoint: { position: 'absolute', width: NODE + 10, height: NODE + 10, borderRadius: radii.lg, borderWidth: 3, borderColor: colors.accent, transform: [{ rotate: '45deg' }] },
  nodeGlyph: { fontSize: 24, lineHeight: 28, fontWeight: '700' },
  progressDot: { position: 'absolute', right: 6, top: 6, width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accentInk, borderWidth: 2, borderColor: colors.surface },
  nodeCopy: { gap: 2, alignItems: 'center', width: '100%' },
  youAreHere: { backgroundColor: colors.black, borderRadius: radii.pill, paddingHorizontal: space.sm, paddingVertical: 3 },
  youAreHereText: { color: colors.accent, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  lock: { alignItems: 'center' },
  lockShackle: { width: 12, height: 9, borderWidth: 2, borderBottomWidth: 0, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  lockBody: { width: 18, height: 13, borderRadius: 3 },
});
