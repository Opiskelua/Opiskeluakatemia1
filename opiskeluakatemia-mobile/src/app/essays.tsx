import { useEffect, useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { completeTask, loadContent, type Topic } from '../lib/course';
import { essayCounts, loadDrafts, loadEssays, loadEvaluation, type Essay, type Evaluation } from '../lib/essays';
import { apiRequest, checkCourseAccess } from '../lib/api';
export default function Essays() {
  const { taskId } = useLocalSearchParams<{ taskId?: string }>();
  const content = useSyncedResource(loadContent);
  const list = useSyncedResource(loadEssays);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [essayId, setEssayId] = useState<string>();
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [taskError, setTaskError] = useState('');
  const [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const dirty = text !== savedText;
  usePreventRemove(dirty || busy, ({ repeat }) => {
    if (busy) { Alert.alert('Tallennetaan', 'Odota tallennuksen valmistumista.'); return; }
    Alert.alert('Tallentamattomia muutoksia', 'Tallenna luonnos, jotta voit jatkaa myös verkkopalvelussa.', [{ text: 'Jatka kirjoittamista', style: 'cancel' }, { text: 'Poistu', style: 'destructive', onPress: repeat }]);
  });
  const counts = essayCounts(text);
  async function retryTaskCompletion() {
    if (!taskId || !evaluation || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    try {
      await completeTask(taskId, evaluation.evaluation.mappedScore, 99);
      if (mounted.current) { setTaskError(''); setNotice('Päivän tehtävä merkitty tehdyksi.'); }
    } catch {
      if (mounted.current) setTaskError('Päivän tehtävän kuittaus epäonnistui. Arviointi on tallessa. Yritä uudelleen.');
    } finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function open(essay: Essay) {
    if (dirty || inFlight.current) { setError('Tallenna muutokset ennen toisen kirjoitelman avaamista.'); return; }
    setBusy(true); inFlight.current = true; setError(''); setTaskError(''); setNotice('');
    try {
      if (essay.isDraft) {
        const draft = (await loadDrafts()).drafts.find(d => d.id === essay.id);
        if (!draft) throw new Error('Luonnosta ei enää löytynyt. Päivitä lista.');
        setTopic({ id: draft.topic_id, title: draft.topic_title, description: content.data?.topics.find(t => t.id === draft.topic_id)?.description ?? '' });
        setText(draft.content); setSavedText(draft.content); setEssayId(draft.id); setSubmitted(false); setEvaluation(null);
      } else {
        const value = await loadEvaluation(essay.id);
        setEvaluation(value); setTopic(null); setText(''); setSavedText(''); setEssayId(essay.id); setSubmitted(true);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Kirjoitelmaa ei voitu avata.'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  async function save(submit: boolean) {
    if (!topic || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    let id = essayId;
    try {
      if (!await checkCourseAccess()) throw new Error('Tarvitset aktiivisen kurssioikeuden.');
      const body = { topicId: topic.id, topicTitle: topic.title, content: text, ...counts };
      // Persist the ID before grading, so retrying never creates another essay.
      if (!submitted) {
        const saved = await apiRequest('/api/essays/draft', { method: 'POST', body: { ...body, essayId: id } }) as { essayId: string };
        id = saved.essayId; setEssayId(id); setSavedText(text); setNotice('Luonnos tallennettu. Voit jatkaa samalla tilillä myös verkossa.');
      }
      if (submit) {
        setSubmitted(true);
        await apiRequest('/api/essays/submit', { method: 'POST', body: { ...body, essayId: id }, timeout: 180000 });
        const value = await loadEvaluation(id!); setEvaluation(value); setNotice('Arviointi tallennettu.');
        if (taskId) {
          try { await completeTask(taskId, value.evaluation.mappedScore, 99); }
          catch { setTaskError('Arviointi tallentui, mutta päivän tehtävän kuittaus epäonnistui.'); }
        }
      }
      void list.refresh();
    } catch (e) { setError((e instanceof Error ? e.message : 'Tallennus epäonnistui.') + ' Tekstisi säilyy tässä näkymässä.'); }
    finally { inFlight.current = false; if (mounted.current) setBusy(false); }
  }
  return <Screen>
    <Text style={styles.kicker}>Kirjoittaminen</Text><Text style={styles.title}>Löydä oma äänesi.</Text>
    <Text style={styles.body}>Verkkokurssin aiheet, luonnokset ja arvioinnit samalla tilillä.</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!!taskError && <><Text accessibilityRole="alert" style={styles.error}>{taskError}</Text><Button title={busy ? 'Kuitataan…' : 'Yritä kuittausta uudelleen'} disabled={busy} onPress={() => void retryTaskCompletion()} /></>}
    {!!notice && <Text accessibilityRole="status" style={styles.body}>{notice}</Text>}
    {topic && <View style={styles.card}>
      <Text style={styles.heading}>{topic.title}</Text><Text style={styles.body}>{topic.description}</Text>
      <TextInput accessibilityLabel="Kirjoitelma" multiline textAlignVertical="top" style={[styles.input, { minHeight: 280 }]} placeholder="Write your essay here…" value={text} editable={!busy && !submitted} onChangeText={setText} />
      <Text style={styles.footer}>{counts.charCount} merkkiä · {counts.wordCount} sanaa · arviointiin vähintään 700 merkkiä</Text>
      {!submitted && <Button title={busy ? 'Tallennetaan…' : 'Tallenna luonnos'} disabled={busy || !text.trim()} onPress={() => void save(false)} />}
      {!evaluation && <Button title={busy ? 'Odota hetki…' : submitted ? 'Yritä arviointia uudelleen' : 'Palauta arvioitavaksi'} disabled={busy || counts.charCount < 700} onPress={() => void save(true)} />}
    </View>}
    {evaluation && <View style={styles.card}><Text style={styles.heading}>{evaluation.essay.topicTitle}</Text><Text style={styles.score}>{evaluation.evaluation.mappedScore} / 99</Text><Text style={styles.body}>{evaluation.evaluation.scoreLevelDescription}</Text>
      {Object.entries(evaluation.evaluation.categoryFeedback ?? {}).map(([key, value]) => <Text key={key} selectable style={styles.body}>{typeof value === 'string' ? value : JSON.stringify(value)}</Text>)}
      <Text style={styles.heading}>Vahvuudet</Text>{evaluation.evaluation.strengths?.map((s, i) => <Text key={i} style={styles.body}>• {s}</Text>)}
      <Text style={styles.heading}>Kehitettävää</Text>{evaluation.evaluation.weaknesses?.map((s, i) => <Text key={i} style={styles.body}>• {s}</Text>)}
      <Text selectable style={styles.body}>{evaluation.essay.content}</Text>
    </View>}
    {topic || evaluation ? <Button title="Valitse uusi aihe" secondary disabled={busy || dirty} onPress={() => { setTopic(null); setEvaluation(null); setText(''); setSavedText(''); setEssayId(undefined); setSubmitted(false); setNotice(''); setTaskError(''); }} /> : <>
      <Text style={styles.heading}>Valitse aihe</Text>
      {!!content.error && <><Text style={styles.error}>{content.error}</Text><Button title="Päivitä aiheet" onPress={() => void content.refresh()} /></>}
      {content.loading && !content.data && <Text style={styles.body}>Haetaan aiheita…</Text>}
      {content.data?.topics.map(t => <View key={t.id} style={styles.card}><Text style={styles.heading}>{t.title}</Text><Text style={styles.body}>{t.description}</Text><Button title="Kirjoita tästä" disabled={busy} onPress={() => { setTopic(t); setText(''); setSavedText(''); setEssayId(undefined); setSubmitted(false); }} /></View>)}
    </>}
    <Text style={styles.heading}>Omat kirjoitelmat</Text>
    {!!list.error && <Text style={styles.error}>{list.error}</Text>}
    {!list.loading && list.data?.essays.length === 0 && <Text style={styles.body}>Ei vielä kirjoitelmia. Aloita valitsemalla aihe.</Text>}
    {list.data?.essays.map(e => <View key={e.id} style={styles.card}><Text style={styles.heading}>{e.topicTitle}</Text><Text style={styles.muted}>{e.isDraft ? 'Luonnos' : e.evaluation ? `${e.evaluation.mappedScore} / 99 pistettä` : 'Arviointi ei ole valmis'} · {new Date(e.updatedAt).toLocaleDateString('fi-FI')}</Text><Button title={e.isDraft ? 'Jatka luonnosta' : 'Avaa arviointi'} secondary disabled={busy || dirty} onPress={() => void open(e)} /></View>)}
    {list.data?.hasMore && <Text style={styles.footer}>Näytetään 100 viimeisintä kirjoitelmaa.</Text>}
    <Button title={list.loading ? 'Päivitetään…' : 'Päivitä kirjoitelmat'} secondary disabled={list.loading} onPress={() => void list.refresh()} />
  </Screen>;
}
