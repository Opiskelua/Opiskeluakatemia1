import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, usePreventRemove } from 'expo-router';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Bullet, Button, Card, EmptyState, Field, ListRow, LoadingState, Notice, PageHeader, ProgressBar, SectionTitle } from '../components/ui';
import { colors, maxScale, radii, space, type } from '../theme';
import { useSyncedResource } from '../hooks/useSyncedResource';
import { completeTask, loadContent, type Topic } from '../lib/course';
import { essayCounts, loadDrafts, loadEssays, loadEvaluation, type Essay, type Evaluation } from '../lib/essays';
import { apiRequest, checkCourseAccess } from '../lib/api';
import { ensureAiConsent } from '../lib/ai-consent';
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
    if (submit && !await ensureAiConsent()) { setNotice('Arviointia ei lähetetty. Luonnoksesi säilyy tässä näkymässä.'); return; }
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
  const refreshContent = content.refresh; const refreshList = list.refresh;
  const pull = usePullToRefresh(useCallback(() => Promise.all([refreshContent(), refreshList()]), [refreshContent, refreshList]));
  const enough = counts.charCount >= 700;
  return <Screen {...(topic ? {} : pull)}>
    <PageHeader kicker="Kirjoittaminen" title="Löydä oma äänesi." intro="Verkkokurssin aiheet, luonnokset ja arvioinnit samalla tilillä." />
    {!!error && <Notice tone="error" message={error} />}
    {!!taskError && <Notice tone="error" message={taskError} actionTitle={busy ? 'Kuitataan…' : 'Yritä kuittausta uudelleen'} actionDisabled={busy} onAction={() => void retryTaskCompletion()} />}
    {!!notice && <Notice tone="success" message={notice} />}
    {topic && <Card>
      <Text accessibilityRole="header" style={type.heading}>{topic.title}</Text>
      {!!topic.description && <Text style={type.body}>{topic.description}</Text>}
      <Field accessibilityLabel="Kirjoitelma" multiline style={styles.editor} placeholder="Write your essay here…" value={text} editable={!busy && !submitted} onChangeText={setText} autoCapitalize="sentences" />
      <View style={{ gap: space.xxs }}>
        <Text style={[type.caption, enough && { color: colors.success }]}>{counts.charCount} merkkiä · {counts.wordCount} sanaa · arviointiin vähintään 700 merkkiä</Text>
        <ProgressBar tone={enough ? 'success' : 'ink'} value={(counts.charCount / 700) * 100} label="Merkkimäärä suhteessa arvioinnin vähimmäismäärään" />
      </View>
      {dirty && !busy && <Text style={type.caption}>Tallentamattomia muutoksia</Text>}
      {!evaluation && <Button title={busy ? 'Odota hetki…' : submitted ? 'Yritä arviointia uudelleen' : 'Palauta arvioitavaksi'} disabled={busy || !enough} onPress={() => void save(true)} />}
      {!submitted && <Button title={busy ? 'Tallennetaan…' : 'Tallenna luonnos'} secondary disabled={busy || !text.trim()} onPress={() => void save(false)} />}
    </Card>}
    {evaluation && <Card>
      <Text style={type.overline}>Arviointi</Text>
      <Text accessibilityRole="header" style={type.heading}>{evaluation.essay.topicTitle}</Text>
      <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat}>{evaluation.evaluation.mappedScore} / 99</Text>
      <ProgressBar value={(evaluation.evaluation.mappedScore / 99) * 100} label="Pisteet" />
      <Text style={type.body}>{evaluation.evaluation.scoreLevelDescription}</Text>
      {Object.entries(evaluation.evaluation.categoryFeedback ?? {}).map(([key, value]) => <Text key={key} selectable style={type.body}>{typeof value === 'string' ? value : JSON.stringify(value)}</Text>)}
      <Text accessibilityRole="header" style={[type.subheading, styles.subhead, { color: colors.success }]}>Vahvuudet</Text>
      {evaluation.evaluation.strengths?.map((s, i) => <Bullet key={i}>{s}</Bullet>)}
      <Text accessibilityRole="header" style={[type.subheading, styles.subhead]}>Kehitettävää</Text>
      {evaluation.evaluation.weaknesses?.map((s, i) => <Bullet key={i}>{s}</Bullet>)}
      <Text accessibilityRole="header" style={[type.subheading, styles.subhead]}>Oma tekstisi</Text>
      <View style={styles.essayText}><Text selectable style={type.body}>{evaluation.essay.content}</Text></View>
    </Card>}
    {topic || evaluation ? <Button title="Valitse uusi aihe" secondary disabled={busy || dirty} onPress={() => { setTopic(null); setEvaluation(null); setText(''); setSavedText(''); setEssayId(undefined); setSubmitted(false); setNotice(''); setTaskError(''); }} /> : <>
      <SectionTitle title="Valitse aihe" />
      {!!content.error && <Notice tone="error" message={content.error} actionTitle="Päivitä aiheet" actionDisabled={content.loading} onAction={() => void content.refresh()} />}
      {content.loading && !content.data && <LoadingState label="Haetaan aiheita…" />}
      {content.data && !content.data.topics.length && <EmptyState title="Ei aiheita" message="Aiheita ei juuri nyt löytynyt. Päivitä myöhemmin uudelleen." />}
      {content.data?.topics.map(t => <Card key={t.id}>
        <Text style={type.subheading}>{t.title}</Text>
        <Text style={type.body}>{t.description}</Text>
        <Button title="Kirjoita tästä" disabled={busy} onPress={() => { setTopic(t); setText(''); setSavedText(''); setEssayId(undefined); setSubmitted(false); }} />
      </Card>)}
    </>}
    <SectionTitle title="Omat kirjoitelmat" detail={list.data?.hasMore ? 'Näytetään 100 viimeisintä kirjoitelmaa.' : undefined}
      action={{ label: list.loading ? 'Päivitetään…' : 'Päivitä', accessibilityLabel: 'Päivitä kirjoitelmat', onPress: () => { if (!list.loading) void list.refresh(); } }} />
    {!!list.error && <Notice tone="error" message={list.error} actionTitle="Yritä uudelleen" actionDisabled={list.loading} onAction={() => void list.refresh()} />}
    {list.loading && !list.data && <LoadingState label="Haetaan kirjoitelmia…" />}
    {!list.loading && list.data?.essays.length === 0 && <EmptyState title="Ei vielä kirjoitelmia" message="Aloita valitsemalla aihe." />}
    {list.data?.essays.map(e => <ListRow key={e.id} badge={e.isDraft ? 'L' : 'A'} title={e.topicTitle}
      subtitle={`${e.isDraft ? 'Luonnos' : e.evaluation ? `${e.evaluation.mappedScore} / 99 pistettä` : 'Arviointi ei ole valmis'} · ${new Date(e.updatedAt).toLocaleDateString('fi-FI')}`}
      accessibilityLabel={`${e.topicTitle}. ${e.isDraft ? 'Jatka luonnosta' : 'Avaa arviointi'}`}
      onPress={busy || dirty ? undefined : () => void open(e)} />)}
  </Screen>;
}

const styles = StyleSheet.create({
  editor: { minHeight: 280 },
  subhead: { marginTop: space.xs },
  essayText: { padding: space.sm, borderRadius: radii.md, backgroundColor: colors.surfaceMuted },
});
