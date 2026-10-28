import { useCallback, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Stack, useFocusEffect } from 'expo-router';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Button, Card, EmptyState, Field, LoadingState, NavCard, Notice, PageHeader, SectionTitle } from '../components/ui';
import { maxScale, space, type } from '../theme';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { loadCards, loadDecks, updateFlashcards, type Deck } from '../lib/flashcards';
function Review({ deck, back }: { deck: Deck; back: () => void }) {
  const load = useCallback(async () => ({ ...await loadCards(deck.id), loadedAt: Date.now() }), [deck.id]);
  const { data, loading, error, refresh } = useSyncedResource(load);
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [front, setFront] = useState(''); const [answer, setAnswer] = useState('');
  const [requestId, setRequestId] = useState(randomUUID);
  const due = data?.cards.filter(c => !c.next_review_at || Date.parse(c.next_review_at) <= data.loadedAt) ?? [];
  const card = due[0];
  const flipped = !!card && revealedCardId === card.id;
  async function review(quality: number) {
    if (!card || busy || loading || error || saveError) return;
    setBusy(true); setSaveError('');
    try { await updateFlashcards({ action: 'review', cardId: card.id, quality, lastReviewedAt: card.last_reviewed_at }); setRevealedCardId(null); await refresh(); }
    catch { setSaveError('Tallennus ei onnistunut tai korttia on kerrattu toisella laitteella. Päivitä kortit ennen uutta yritystä.'); }
    finally { setBusy(false); }
  }
  // Android hardware back returns to the deck list instead of leaving Muistikortit.
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (!busy) back(); return true; });
    return () => sub.remove();
  }, [back, busy]));
  const pull = usePullToRefresh(useCallback(() => { setRevealedCardId(null); return refresh(); }, [refresh]));
  const blocked = busy || loading || !!error || !!saveError;
  return <Screen {...pull}>
    <Stack.Screen options={{ title: 'Kertaus' }} />
    <Button title="‹ Kaikki pakat" variant="ghost" style={styles.backLink} disabled={busy} accessibilityLabel="Takaisin kaikkiin pakkoihin" onPress={back} />
    <PageHeader title={deck.title} intro={data ? `${due.length} kerrattavaa · ${data.cards.length} korttia` : undefined} />
    {!!(error || saveError) && <Notice tone="error" message={error || saveError} actionTitle="Päivitä kortit" actionDisabled={loading} onAction={() => { setSaveError(''); setRevealedCardId(null); void refresh(); }} />}
    {loading && !data && <LoadingState label="Haetaan kortteja…" />}
    {card && <Card style={styles.flashcard}>
      <Text style={[type.overline, styles.center]}>{flipped ? 'Vastaus' : 'Muistatko tämän?'}</Text>
      <Text selectable accessibilityLiveRegion="polite" style={[type.title, styles.center]} maxFontSizeMultiplier={maxScale.title}>{flipped ? card.back : card.front}</Text>
      {flipped && <Text style={[type.caption, styles.center]}>{card.front}</Text>}
      <View style={styles.actions}>
        {!flipped ? <Button title="Näytä vastaus" onPress={() => setRevealedCardId(card.id)} /> : <>
          <Text style={[type.label, styles.center]}>Kuinka hyvin muistit?</Text>
          <Button title={busy ? 'Tallennetaan…' : 'Osasin hyvin'} loading={busy} disabled={blocked} onPress={() => void review(5)} />
          <Button title="Muistin vaivoin" secondary disabled={blocked} onPress={() => void review(3)} />
          <Button title="Kertaa uudelleen" secondary disabled={blocked} onPress={() => void review(1)} />
        </>}
      </View>
    </Card>}
    {data && !card && <EmptyState title="Kertaus valmis." message="Seuraava kertaus määräytyy osaamisesi mukaan. Edistyminen näkyy myös verkkopalvelussa." />}
    <SectionTitle title="Lisää oma kortti" />
    <Card>
      <Field label="Etupuoli" accessibilityLabel="Kortin etupuoli" placeholder="Englanniksi" maxLength={500} value={front} editable={!busy} onChangeText={setFront} autoCapitalize="none" returnKeyType="next" />
      <Field label="Vastaus" accessibilityLabel="Kortin vastaus" placeholder="Suomeksi" maxLength={500} value={answer} editable={!busy} onChangeText={setAnswer} />
      <Button title="Tallenna kortti" disabled={busy || !front.trim() || !answer.trim()} onPress={() => {
        setBusy(true); setSaveError(''); void updateFlashcards({ action: 'add-card', deckId: deck.id, front, back: answer, requestId }).then(async () => { setFront(''); setAnswer(''); setRequestId(randomUUID()); await refresh(); }).catch(() => setSaveError('Korttia ei voitu tallentaa. Yritä uudelleen.')).finally(() => setBusy(false));
      }} />
    </Card>
  </Screen>;
}
export default function Flashcards() {
  const { data, loading, error, refresh } = useSyncedResource(loadDecks);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [busy, setBusy] = useState(false); const [saveError, setSaveError] = useState('');
  const [title, setTitle] = useState(''); const [requestId, setRequestId] = useState(randomUUID);
  async function install(body: unknown) { setBusy(true); setSaveError(''); try { await updateFlashcards(body); setTitle(''); setRequestId(randomUUID()); await refresh(); } catch { setSaveError('Pakan tallennus epäonnistui. Yritä uudelleen.'); } finally { setBusy(false); } }
  const pull = usePullToRefresh(refresh);
  const closeDeck = useCallback(() => { setDeck(null); void refresh(); }, [refresh]);
  if (deck) return <Review key={deck.id} deck={deck} back={closeDeck} />;
  return <Screen {...pull}>
    <Stack.Screen options={{ title: 'Muistikortit' }} />
    <PageHeader kicker="Sanasto" title="Muista enemmän." intro="Pakat ja kertausvälit tallentuvat tilillesi ja kulkevat mukana verkkokurssille." />
    {!!(error || saveError) && <Notice tone="error" message={error || saveError} actionTitle="Päivitä pakat" actionDisabled={loading} onAction={() => { setSaveError(''); void refresh(); }} />}
    {loading && !data && <LoadingState label="Haetaan pakkoja…" />}
    {data && <SectionTitle title="Omat pakat" detail={data.decks.length ? `${data.decks.length} pakkaa` : undefined} />}
    {data && !data.decks.length && <EmptyState title="Ei vielä pakkoja" message="Lisää kurssin sanasto alta tai luo oma pakka." />}
    {data?.decks.map(d => <NavCard key={d.id} title={d.title} description="Kertaa erääntyneet kortit" accessibilityHint="Avaa pakan kertauksen" onPress={() => setDeck(d)} />)}
    <Card>
      <Text accessibilityRole="header" style={type.subheading}>Luo oma pakka</Text>
      <Field label="Pakan nimi" placeholder="Esim. Phrasal verbs" maxLength={200} value={title} editable={!busy} onChangeText={setTitle} />
      <Button title="Luo pakka" loading={busy && !!title.trim()} disabled={busy || !title.trim()} onPress={() => void install({ action: 'create', title, requestId })} />
    </Card>
    {data && <SectionTitle title="Kurssin sanastot" />}
    {data?.catalogue.map(d => <Card key={d.id}>
      <Text style={type.subheading}>{d.title}</Text>
      <Text style={type.caption}>{d.description} · {d.cardCount} korttia</Text>
      <Button title={data.decks.some(x => x.source_text === `abikurssi:${d.id}`) ? 'Täydennä kurssin kortit' : 'Lisää omiin pakkoihin'} secondary disabled={busy} onPress={() => void install({ action: 'install', templateId: d.id })} />
    </Card>)}
  </Screen>;
}

const styles = StyleSheet.create({
  backLink: { alignSelf: 'flex-start', paddingHorizontal: 0, marginBottom: -space.xs },
  flashcard: { minHeight: 280, justifyContent: 'center', gap: space.md, paddingVertical: space.xl },
  center: { textAlign: 'center' },
  actions: { gap: space.xs, marginTop: space.xs },
});
