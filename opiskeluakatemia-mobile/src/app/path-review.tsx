import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Text, View, type ScrollViewInstance } from 'react-native';
import { router, Stack, usePreventRemove } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, EmptyState, LoadingState, NavCard, Notice, PageHeader } from '../components/ui';
import { ItemStepper, WrongList } from '../components/PathItems';
import { RewardCard, ScoreCard } from '../components/PathProgress';
import { space, useTheme } from '../theme';
import { RequestError } from '../lib/api';
import { loadReview, submitReview } from '../lib/path-v2';
import type { AnswerValue, Answers, ReviewSessionV2, ReviewSubmitResponseV2 } from '../lib/path-v2-types';
import { answeredCount, answersForSubmit, pathFailure, sanitizeDraft } from '../lib/path-v2-model';

function FlashcardsCard({ due }: { due: number | null }) {
  if (due === null) return <NavCard kicker="Muistikortit" title="Kertaa sanastoa" description="Erääntyneiden korttien määrää ei saatu juuri nyt." onPress={() => router.push('/flashcards')} />;
  return <NavCard kicker="Muistikortit" title={due > 0 ? `${due} korttia erääntynyt` : 'Ei erääntyneitä kortteja'}
    description={due > 0 ? 'Kertaa kurssin sanasto, kun virheet on käyty läpi.' : 'Voit silti selata pakkoja ja lisätä uusia kortteja.'} onPress={() => router.push('/flashcards')} />;
}

export default function PathReviewScreen() {
  const { type } = useTheme();
  const [session, setSession] = useState<ReviewSessionV2 | null>(null);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState<Answers>({});
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [outcome, setOutcome] = useState<{ response: ReviewSubmitResponseV2; answers: Answers; session: ReviewSessionV2 } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  /** Fetch a session; answers to items that are still served are kept. */
  const fetchSession = useCallback(async () => {
    setLoadError('');
    try {
      const next = await loadReview();
      if (!mounted.current) return;
      setSession(next);
      setAnswers(previous => sanitizeDraft(next.items, previous));
      setIndex(0);
    } catch (e) { if (mounted.current) setLoadError(e instanceof Error ? e.message : 'Kertausta ei voitu ladata.'); }
  }, []);
  useEffect(() => {
    let cancelled = false;
    loadReview().then(next => { if (!cancelled) setSession(next); })
      .catch(e => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Kertausta ei voitu ladata.'); });
    return () => { cancelled = true; };
  }, []);

  const items = session?.items ?? [];
  const answered = answeredCount(items, answers);

  const setAnswer = useCallback((id: string, value: AnswerValue) => { setAnswers(previous => ({ ...previous, [id]: value })); setInfo(''); }, []);

  async function submit() {
    if (!session || inFlight.current || !answered) return;
    inFlight.current = true; setBusy(true); setError(''); setInfo('');
    const sent = answersForSubmit(items, answers);
    try {
      const response = await submitReview(sent, session.revision);
      if (!mounted.current) return;
      setOutcome({ response, answers: sent, session });
      scroll.current?.scrollTo({ y: 0, animated: false });
    } catch (e) {
      if (!mounted.current) return;
      if (pathFailure(e instanceof RequestError ? e.status : undefined) === 'conflict') {
        // Stale revision, or an item was already fixed on another device: start from a fresh list.
        await fetchSession();
        if (mounted.current) setInfo('Kertauslista päivittyi toisella laitteella. Vastauksesi jäljellä oleviin kohtiin säilyivät – tarkista ja lähetä uudelleen.');
      } else {
        setError(`${e instanceof Error ? e.message : 'Lähetys epäonnistui.'} Vastauksesi ovat tallessa tässä näkymässä.`);
      }
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }

  usePreventRemove(!leaving && !outcome && (busy || answered > 0), ({ repeat }) => {
    if (busy) { Alert.alert('Lähetetään', 'Odota hetki, että tarkistus valmistuu.'); return; }
    Alert.alert('Lopetetaanko kertaus?', 'Kertauksen vastauksia ei tallenneta ennen tarkistusta.', [
      { text: 'Jatka kertausta', style: 'cancel' },
      { text: 'Lopeta', style: 'destructive', onPress: () => { setLeaving(true); repeat(); } },
    ]);
  });

  if (outcome) {
    const { result, rewards, summary } = outcome.response;
    return <Screen scrollRef={scroll}>
      <Stack.Screen options={{ title: 'Kertauksen tulos' }} />
      <ScoreCard result={result} passScore={0} checkpoint={false} review />
      <RewardCard rewards={rewards} levelTitle={summary.level.title} passed={result.passed} />
      <WrongList items={outcome.session.items} answers={outcome.answers} result={result} />
      <View style={{ gap: space.sm }}>
        {summary.review.pendingItems > 0 && <Button title={`Uusi kertaus (${summary.review.pendingItems} jäljellä)`} onPress={() => { setOutcome(null); setAnswers({}); setSession(null); void fetchSession(); }} />}
        <FlashcardsCard due={summary.review.dueFlashcards} />
        <Button title="Takaisin polulle" variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>;
  }

  return <Screen scrollRef={scroll}>
    <PageHeader kicker="Polku" title="Kertaus" intro="Omat virheesi viimeisimmistä oppitunneista. Oikea vastaus poistaa kohdan listalta ja antaa XP:tä kerran." />
    {!session && !loadError && <LoadingState label="Kootaan kertausta…" />}
    {!!loadError && <Notice tone="error" title="Kertausta ei voitu ladata" message={loadError} actionTitle="Yritä uudelleen" onAction={() => void fetchSession()} />}
    {session && !items.length && <>
      <EmptyState title="Ei kerrattavaa juuri nyt" message="Kun oppitunnilla menee jotain väärin, kohta tulee tänne kerrattavaksi." actionTitle="Takaisin polulle" onAction={() => router.back()} />
      <FlashcardsCard due={session.dueFlashcards} />
    </>}
    {session && items.length > 0 && <>
      <Text style={type.caption}>{session.pendingTotal > items.length ? `Tässä istunnossa ${items.length} / ${session.pendingTotal} kerrattavasta kohdasta.` : `${items.length} kerrattavaa kohtaa.`} Voit lähettää myös osan vastauksista.</Text>
      {!!info && <Notice message={info} />}
      <ItemStepper items={items} answers={answers} onAnswer={setAnswer} index={index} onIndex={setIndex} disabled={busy}
        contextFor={item => 'lessonTitle' in item ? String(item.lessonTitle) : undefined}
        finish={<Button title={busy ? 'Tarkistetaan…' : `Tarkista ${answered} / ${items.length}`} loading={busy} disabled={busy || !answered} onPress={() => void submit()} />} />
      {!!error && <Notice tone="error" message={error} />}
      <FlashcardsCard due={session.dueFlashcards} />
    </>}
  </Screen>;
}
