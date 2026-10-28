import { useCallback, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
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
  return <Screen refreshing={loading} onRefresh={() => { setRevealedCardId(null); void refresh(); }}>
    <Button title="Kaikki pakat" secondary disabled={busy} onPress={back} />
    <Text style={styles.title}>{deck.title}</Text><Text style={styles.body}>{due.length} kerrattavaa · {data?.cards.length ?? 0} korttia</Text>
    {!!(error || saveError) && <><Text style={styles.error}>{error || saveError}</Text><Button title="Päivitä kortit" onPress={() => { setSaveError(''); setRevealedCardId(null); void refresh(); }} /></>}
    {loading && !data && <Text style={styles.body}>Haetaan kortteja…</Text>}
    {card && <View style={[styles.card, { minHeight: 260, justifyContent: 'center' }]}><Text style={styles.kicker}>{flipped ? 'Vastaus' : 'Muistatko tämän?'}</Text><Text selectable style={[styles.title, { textAlign: 'center' }]}>{flipped ? card.back : card.front}</Text>
      {!flipped ? <Button title="Näytä vastaus" onPress={() => setRevealedCardId(card.id)} /> : <><Button title="Kertaa uudelleen" secondary disabled={busy || loading || !!error || !!saveError} onPress={() => void review(1)} /><Button title="Muistin vaivoin" secondary disabled={busy || loading || !!error || !!saveError} onPress={() => void review(3)} /><Button title={busy ? 'Tallennetaan…' : 'Osasin hyvin'} disabled={busy || loading || !!error || !!saveError} onPress={() => void review(5)} /></>}
    </View>}
    {data && !card && <View style={styles.card}><Text style={styles.heading}>Kertaus valmis.</Text><Text style={styles.body}>Seuraava kertaus määräytyy osaamisesi mukaan. Edistyminen näkyy myös verkkopalvelussa.</Text></View>}
    <View style={styles.card}><Text style={styles.heading}>Lisää oma kortti</Text><TextInput accessibilityLabel="Kortin etupuoli" placeholder="Englanniksi" maxLength={500} style={styles.input} value={front} editable={!busy} onChangeText={setFront} /><TextInput accessibilityLabel="Kortin vastaus" placeholder="Suomeksi" maxLength={500} style={styles.input} value={answer} editable={!busy} onChangeText={setAnswer} /><Button title="Tallenna kortti" disabled={busy || !front.trim() || !answer.trim()} onPress={() => {
      setBusy(true); setSaveError(''); void updateFlashcards({ action: 'add-card', deckId: deck.id, front, back: answer, requestId }).then(async () => { setFront(''); setAnswer(''); setRequestId(randomUUID()); await refresh(); }).catch(() => setSaveError('Korttia ei voitu tallentaa. Yritä uudelleen.')).finally(() => setBusy(false));
    }} /></View>
  </Screen>;
}
export default function Flashcards() {
  const { data, loading, error, refresh } = useSyncedResource(loadDecks);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [busy, setBusy] = useState(false); const [saveError, setSaveError] = useState('');
  const [title, setTitle] = useState(''); const [requestId, setRequestId] = useState(randomUUID);
  async function install(body: unknown) { setBusy(true); setSaveError(''); try { await updateFlashcards(body); setTitle(''); setRequestId(randomUUID()); await refresh(); } catch { setSaveError('Pakan tallennus epäonnistui. Yritä uudelleen.'); } finally { setBusy(false); } }
  if (deck) return <Review key={deck.id} deck={deck} back={() => { setDeck(null); void refresh(); }} />;
  return <Screen refreshing={loading} onRefresh={() => void refresh()}>
    <Text style={styles.kicker}>Sanasto</Text><Text style={styles.title}>Muista enemmän.</Text><Text style={styles.body}>Pakat ja kertausvälit tallentuvat tilillesi ja kulkevat mukana verkkokurssille.</Text>
    {!!(error || saveError) && <><Text style={styles.error}>{error || saveError}</Text><Button title="Päivitä pakat" onPress={() => { setSaveError(''); void refresh(); }} /></>}
    {loading && !data && <Text style={styles.body}>Haetaan pakkoja…</Text>}
    {data?.decks.map(d => <View key={d.id} style={styles.card}><Text style={styles.heading}>{d.title}</Text><Button title="Kertaa" onPress={() => setDeck(d)} /></View>)}
    <View style={styles.card}><Text style={styles.heading}>Oma pakka</Text><TextInput accessibilityLabel="Pakan nimi" placeholder="Pakan nimi" maxLength={200} style={styles.input} value={title} editable={!busy} onChangeText={setTitle} /><Button title="Luo pakka" disabled={busy || !title.trim()} onPress={() => void install({ action: 'create', title, requestId })} /></View>
    <Text style={styles.heading}>Kurssin sanastot</Text>
    {data?.catalogue.map(d => <View key={d.id} style={styles.card}><Text style={styles.heading}>{d.title}</Text><Text style={styles.body}>{d.description} · {d.cardCount} korttia</Text><Button title={data.decks.some(x => x.source_text === `abikurssi:${d.id}`) ? 'Täydennä kurssin kortit' : 'Lisää omiin pakkoihin'} secondary disabled={busy} onPress={() => void install({ action: 'install', templateId: d.id })} /></View>)}
  </Screen>;
}
