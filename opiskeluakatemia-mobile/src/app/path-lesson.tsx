import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { router, Stack, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, EmptyState, LoadingState, Notice, Pill } from '../components/ui';
import { GuidePanel, ItemStepper, WrongList } from '../components/PathItems';
import { RewardCard, ScoreCard } from '../components/PathProgress';
import { space, type } from '../theme';
import { RequestError } from '../lib/api';
import { loadPath, saveLesson } from '../lib/path-v2';
import type { AnswerValue, Answers, LessonMutationResponseV2, PathStateV2 } from '../lib/path-v2-types';
import { allAnswered, answersForSubmit, findLesson, firstUnanswered, lessonState, mergeSummary, pathFailure, sanitizeDraft } from '../lib/path-v2-model';

const LESSON_ID = /^[a-z0-9-]{1,80}$/;

export default function PathLessonScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId?: string }>();
  const id = typeof lessonId === 'string' && LESSON_ID.test(lessonId) ? lessonId : null;
  // Remount per lesson so "next lesson" starts from a clean state.
  return id ? <LessonPlayer key={id} lessonId={id} /> : <Screen><EmptyState title="Oppituntia ei löytynyt." message="Valitse oppitunti polulta." actionTitle="Takaisin polulle" onAction={() => router.back()} /></Screen>;
}

type Busy = 'save' | 'submit' | null;

function LessonPlayer({ lessonId }: { lessonId: string }) {
  const [state, setState] = useState<PathStateV2 | null>(null);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<{ message: string; action?: 'reload' | 'back' } | null>(null);
  const [info, setInfo] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [outcome, setOutcome] = useState<{ response: LessonMutationResponseV2; answers: Answers } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [reload, setReload] = useState(0);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  useEffect(() => {
    const controller = { cancelled: false };
    loadPath().then(value => {
      if (controller.cancelled) return;
      setState(value);
      const entry = findLesson(value.content.units, lessonId);
      if (entry) {
        const draft = sanitizeDraft(entry.lesson.items, value.progress[lessonId]?.draft);
        setAnswers(draft); setIndex(firstUnanswered(entry.lesson.items, draft));
        if (Object.keys(draft).length) setInfo('Jatketaan tallennetusta luonnoksesta.');
      }
    }).catch(e => { if (!controller.cancelled) setLoadError(e instanceof Error ? e.message : 'Oppitunnin lataus epäonnistui.'); });
    return () => { controller.cancelled = true; };
  }, [lessonId, reload]);

  const entry = state ? findLesson(state.content.units, lessonId) : null;
  const progress = state?.progress[lessonId];
  const items = entry?.lesson.items ?? [];

  const setAnswer = useCallback((itemId: string, value: AnswerValue) => {
    setAnswers(previous => ({ ...previous, [itemId]: value }));
    setDirty(true); setInfo('');
  }, []);

  /** Save or submit. A stale revision (409) reloads the path and retries once with the local answers. */
  async function mutate(action: 'save' | 'submit', current: PathStateV2): Promise<boolean> {
    if (inFlight.current || !entry) return false;
    inFlight.current = true; setBusy(action); setError(null); setInfo('');
    const body = action === 'submit' ? answersForSubmit(entry.lesson.items, answers) : sanitizeDraft(entry.lesson.items, answers);
    let revision = current.progress[lessonId]?.revision ?? 0;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          const response = await saveLesson(action, lessonId, body, revision);
          if (!mounted.current) return true;
          setState(previous => previous ? mergeSummary(previous, response.summary) : previous);
          setDirty(false);
          if (action === 'submit') { setOutcome({ response, answers }); scroll.current?.scrollTo({ y: 0, animated: false }); }
          else setInfo('Luonnos tallennettu. Voit jatkaa myöhemmin tällä tai toisella laitteella.');
          return true;
        } catch (e) {
          const failure = pathFailure(e instanceof RequestError ? e.status : undefined);
          if (failure === 'conflict' && attempt === 0) {
            // Another tab or device saved this lesson: take its new revision and keep our answers.
            const fresh = await loadPath();
            if (!mounted.current) return false;
            setState(fresh);
            revision = fresh.progress[lessonId]?.revision ?? 0;
            continue;
          }
          throw e;
        }
      }
    } catch (e) {
      if (!mounted.current) return false;
      const failure = pathFailure(e instanceof RequestError ? e.status : undefined);
      if (failure === 'locked') {
        // 403 is either a locked lesson or missing course access; a reload tells which.
        try {
          const fresh = await loadPath();
          if (mounted.current) { setState(fresh); setBlocked(true); setError({ message: 'Tämä oppitunti on lukittu. Suorita ensin edelliset oppitunnit polulla.', action: 'back' }); }
        } catch (reloadError) { if (mounted.current) setError({ message: reloadError instanceof Error ? reloadError.message : 'Kurssioikeus puuttuu.', action: 'back' }); }
      } else if (failure === 'conflict') {
        setError({ message: 'Oppituntia muokattiin samaan aikaan toisella laitteella. Vastauksesi ovat tallessa tässä näkymässä – yritä uudelleen.' });
      } else if (failure === 'invalid') {
        setError({ message: 'Vastauksia ei voitu käsitellä, koska oppitunnin sisältö on voinut päivittyä. Lataa oppitunti uudelleen; vastauksesi säilyvät.', action: 'reload' });
      } else {
        setError({ message: `${e instanceof Error ? e.message : 'Tallennus epäonnistui.'} Vastauksesi ovat tallessa tässä näkymässä.` });
      }
      return false;
    } finally { inFlight.current = false; if (mounted.current) setBusy(null); }
  }

  /** Reload content after a 400 and keep the local answers that still fit it. */
  async function reloadKeepingAnswers() {
    setError(null);
    try {
      const fresh = await loadPath();
      if (!mounted.current) return;
      setState(fresh);
      const found = findLesson(fresh.content.units, lessonId);
      if (found) setAnswers(previous => sanitizeDraft(found.lesson.items, previous));
    } catch (e) { if (mounted.current) setError({ message: e instanceof Error ? e.message : 'Lataus epäonnistui.', action: 'reload' }); }
  }

  usePreventRemove(!leaving && !outcome && (busy !== null || dirty), ({ repeat }) => {
    if (busy) { Alert.alert('Tallennetaan', 'Odota hetki, että tallennus valmistuu.'); return; }
    const leave = () => { setLeaving(true); repeat(); };
    Alert.alert('Poistutaanko oppitunnilta?', 'Kaikkia vastauksia ei ole tallennettu.', [
      { text: 'Jatka oppituntia', style: 'cancel' },
      ...(state && !blocked ? [{ text: 'Tallenna ja poistu', onPress: () => { void mutate('save', state).then(ok => { if (ok) leave(); }); } }] : []),
      { text: 'Poistu tallentamatta', style: 'destructive' as const, onPress: leave },
    ]);
  });

  if (!state) return <Screen>
    {loadError ? <><Notice tone="error" title="Oppituntia ei voitu ladata" message={loadError} actionTitle="Yritä uudelleen" onAction={() => { setLoadError(''); setReload(n => n + 1); }} />
      <Button title="Takaisin" variant="ghost" onPress={() => router.back()} /></>
      : <LoadingState label="Ladataan oppituntia…" />}
  </Screen>;
  if (!entry) return <Screen><EmptyState title="Oppituntia ei löytynyt." message="Oppitunti on voinut poistua polulta. Valitse uusi oppitunti." actionTitle="Takaisin polulle" onAction={() => router.back()} /></Screen>;

  const { unit, lesson } = entry;
  const checkpoint = lesson.kind === 'checkpoint';
  const locked = lessonState(progress) === 'locked';
  const disabled = busy !== null || blocked;
  const title = checkpoint ? 'Välietappi' : `Oppitunti ${lesson.order}`;

  if (outcome) {
    const { result, rewards, summary } = outcome.response;
    const unitTitle = (unitId: string | null) => unitId ? state.content.units.find(u => u.id === unitId)?.title ?? null : null;
    const next = summary.nextLessonId && summary.nextLessonId !== lessonId ? findLesson(state.content.units, summary.nextLessonId) : null;
    return <Screen scrollRef={scroll}>
      <Stack.Screen options={{ title: 'Tulos' }} />
      <View style={{ gap: space.xxs }}>
        <Text style={type.overline}>{unit.title} · {title}</Text>
        <Text accessibilityRole="header" style={type.title}>{lesson.title}</Text>
      </View>
      {result && <ScoreCard result={result} passScore={state.rules.passScore} checkpoint={checkpoint} review={false} />}
      {rewards && <RewardCard rewards={rewards} levelTitle={summary.level.title} unlockedTitle={unitTitle(rewards.unitUnlocked)} completedTitle={unitTitle(rewards.unitCompleted)} passed={!!result?.passed} />}
      {result && <WrongList items={lesson.items} answers={outcome.answers} result={result} />}
      <View style={{ gap: space.sm }}>
        {result?.passed && next && <Button title={`Seuraavaksi: ${next.lesson.title}`} onPress={() => router.replace({ pathname: '/path-lesson', params: { lessonId: next.lesson.id } })} />}
        {!result?.passed && <Button title="Yritä uudelleen" onPress={() => { setOutcome(null); setAnswers({}); setIndex(0); setDirty(false); }} />}
        {summary.review.pendingItems > 0 && <Button title={`Kertaa virheet (${summary.review.pendingItems})`} secondary onPress={() => router.replace('/path-review')} />}
        {result?.passed && <Button title="Tee uudelleen" secondary onPress={() => { setOutcome(null); setAnswers({}); setIndex(0); setDirty(false); }} />}
        <Button title="Takaisin polulle" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>;
  }

  return <Screen scrollRef={scroll}>
    <Stack.Screen options={{ title }} />
    <View style={{ gap: space.xs }}>
      <Text style={type.overline}>Osa {unit.order} · {unit.title}</Text>
      <Text accessibilityRole="header" style={type.title}>{lesson.title}</Text>
      <Text style={type.body}>{lesson.subtitle}</Text>
      <View style={styles.meta}>
        <Pill label={`${lesson.items.length} kohtaa · n. ${lesson.estimatedMinutes} min`} />
        <Pill label={progress?.status === 'completed' ? `Suoritettu · paras ${progress.bestScore ?? 0} %` : `Jopa ${lesson.maxXp} XP`} tone={progress?.status === 'completed' ? 'success' : 'accent'} />
      </View>
    </View>
    {checkpoint && <Notice title="Välietappi" message={`Läpäise vähintään ${state.rules.passScore} %, niin seuraava osa avautuu. Jos et läpäise, näet mitkä kohdat menivät väärin, mutta et oikeita vastauksia.`} />}
    {locked && <Notice tone="error" title="Oppitunti on lukittu" message="Suorita ensin polun edelliset oppitunnit." actionTitle="Takaisin polulle" onAction={() => router.back()} />}
    {!!info && <Notice tone="success" message={info} />}
    {!!lesson.guide && <GuidePanel guide={lesson.guide} initiallyOpen={!progress?.attempts && !Object.keys(answers).length} />}
    {!locked && <ItemStepper items={items} answers={answers} onAnswer={setAnswer} index={index} onIndex={setIndex} disabled={disabled}
      finish={<Button title={busy === 'submit' ? 'Tarkistetaan…' : 'Tarkista vastaukset'} loading={busy === 'submit'} disabled={disabled || !allAnswered(items, answers)} onPress={() => void mutate('submit', state)} />} />}
    {!!error && <Notice tone="error" message={error.message}
      actionTitle={error.action === 'back' ? 'Takaisin polulle' : error.action === 'reload' ? 'Lataa uudelleen' : undefined}
      onAction={error.action === 'back' ? () => router.back() : error.action === 'reload' ? () => void reloadKeepingAnswers() : undefined} />}
    {!locked && <Button title={busy === 'save' ? 'Tallennetaan…' : 'Tallenna keskeneräisenä'} variant="ghost" loading={busy === 'save'} disabled={disabled || !dirty} onPress={() => void mutate('save', state)}
      accessibilityHint="Tallentaa vastaukset, jotta voit jatkaa myöhemmin" />}
  </Screen>;
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs, marginTop: space.xxs },
});
