import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Screen } from '../components/Screen';
import { ExerciseAudio } from '../components/ExerciseAudio';
import { Button, styles } from '../../App';
import { completeTask } from '../lib/course';
import { choices } from '../lib/catalogue';
import { allAnswered, type Answers, type Exercise, type Result } from '../lib/exercise-model';
import { loadExercise, submitExercise } from '../lib/exercises';

export default function ExerciseScreen() {
  const { id, difficulty, taskId } = useLocalSearchParams<{ id: string; difficulty?: string; taskId?: string }>();
  const choice = choices.find(c => c.id === id);
  const [taskError, setTaskError] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const [reload, setReload] = useState(0);
  const attemptId = useRef(randomUUID());
  const inFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    if (!choice) return;
    loadExercise(choice, difficulty === 'beginner' || difficulty === 'advanced' ? difficulty : 'intermediate', controller.signal)
      .then(value => { if (!controller.signal.aborted) setExercise(value); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Tehtävän lataus epäonnistui.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [choice, difficulty, reload]);
  usePreventRemove(!leaving && !result && (saving || Object.keys(answers).length > 0), ({ repeat }) => {
    if (saving) { Alert.alert('Tallennetaan', 'Odota, että palautus valmistuu.'); return; }
    Alert.alert('Poistutaanko tehtävästä?', 'Keskeneräisiä vastauksia ei ole tallennettu.', [
      { text: 'Jatka tehtävää', style: 'cancel' },
      { text: 'Poistu', style: 'destructive', onPress: () => { setLeaving(true); repeat(); } },
    ]);
  });
  async function submit() {
    if (!exercise || inFlight.current || result) return;
    inFlight.current = true; setSaving(true); setLocked(true); setError('');
    try {
      const saved = await submitExercise(exercise, answers, attemptId.current);
      if (mounted.current) setResult(saved);
      if (taskId) { try { await completeTask(taskId, saved.totalScore, saved.maxScore); } catch { if (mounted.current) setTaskError('Tulos tallennettiin, mutta päivän tehtävän kuittaus epäonnistui.'); } }
    } catch (e) {
      if (mounted.current) setError((e instanceof Error ? e.message : 'Tallennus epäonnistui.') + ' Vastaukset ovat tallessa tässä näkymässä. Voit yrittää tallennusta uudelleen.');
    } finally { inFlight.current = false; if (mounted.current) setSaving(false); }
  }
  if (!choice) return <Screen><Text style={styles.error}>Tehtävää ei löytynyt.</Text></Screen>;
  if (loading) return <Screen><ActivityIndicator color="#111111" /><Text style={styles.body}>Valmistellaan harjoitusta…</Text><Button title="Peruuta" secondary onPress={() => router.back()} /></Screen>;
  if (!exercise) return <Screen><Text style={styles.error}>{error}</Text><Button title="Yritä uudelleen" onPress={() => { setLoading(true); setError(''); setReload(n => n + 1); }} /></Screen>;
  return <Screen>
    <Text style={styles.kicker}>{result ? 'Tallennettu verkkopalveluun' : 'Harjoitus'}</Text>
    <Text style={styles.heading}>{exercise.title}</Text>
    {!!exercise.instructions && <Text style={styles.body}>{exercise.instructions}</Text>}
    {result && <View style={styles.card}><Text style={styles.kicker}>Tulos</Text><Text style={styles.score}>{result.totalScore} / {result.maxScore}</Text><Text style={styles.body}>Tulos näkyy myös verkkopalvelun harjoitushistoriassa samalla tilillä.</Text><Button title="Katso historia" onPress={() => router.replace('/history')} /></View>}
    {!!taskError && <><Text style={styles.error}>{taskError}</Text><Button title="Yritä kuittausta uudelleen" onPress={() => { if (result && taskId) void completeTask(taskId, result.totalScore, result.maxScore).then(() => setTaskError('')).catch(() => setTaskError('Kuittaus epäonnistui. Yritä uudelleen.')); }} /></>}
    {!!exercise.audioUrl && <ExerciseAudio url={exercise.audioUrl} splitTime={exercise.splitTime} />}
    {exercise.passages.map((text, index) => <View style={styles.card} key={index}><Text selectable style={styles.body}>{text}</Text></View>)}
    {exercise.questions.map((q, index) => {
      const feedback = result?.evaluations?.find(e => e.questionId === q.id);
      return <View key={q.id} style={styles.card}>
        <Text style={styles.kicker}>Kysymys {index + 1} / {exercise.questions.length}</Text>
        <Text selectable style={styles.heading}>{q.prompt}</Text>
        {!!q.hint && <Text style={styles.body}>{q.hint}</Text>}
        {q.options ? q.options.map((option, optionIndex) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: answers[q.id] === optionIndex, disabled: locked }} disabled={locked} key={optionIndex}
          onPress={() => setAnswers(previous => ({ ...previous, [q.id]: optionIndex }))}
          style={[styles.choice, answers[q.id] === optionIndex && styles.choiceOn]}>
          <Text style={[styles.body, answers[q.id] === optionIndex && { color: '#111111', fontWeight: '600' }]}>{String.fromCharCode(65 + optionIndex)}. {option}</Text>
        </Pressable>) : <><TextInput accessibilityLabel={`Vastaus kysymykseen ${index + 1}`} style={[styles.input, { minHeight: 64 }]} multiline autoCorrect={false} autoCapitalize="none" editable={!locked}
          value={String(answers[q.id] ?? '')} placeholder="Kirjoita vastauksesi" placeholderTextColor="#A1A1A6" maxLength={q.maxCharacters}
          onChangeText={text => setAnswers(previous => ({ ...previous, [q.id]: text }))} />
          {!!q.maxCharacters && <Text style={styles.footer}>{String(answers[q.id] ?? '').length} / {q.maxCharacters} merkkiä</Text>}</>}
        {feedback && <View style={styles.note}><Text style={styles.label}>{feedback.score} p.</Text><Text selectable style={styles.body}>{feedback.feedback}</Text></View>}
      </View>;
    })}
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {!result && <><Text style={styles.body}>{exercise.questions.filter(q => answers[q.id] !== undefined && String(answers[q.id]).trim()).length} / {exercise.questions.length} vastattu</Text>
      <Button title={saving ? 'Arvioidaan ja tallennetaan…' : locked ? 'Yritä tallennusta uudelleen' : 'Palauta ja tallenna'} disabled={saving || !allAnswered(exercise, answers)} onPress={() => void submit()} /></>}
    {result && !!exercise.transcript && <View style={styles.card}><Text style={styles.heading}>Kuuntelun teksti</Text><Text selectable style={styles.body}>{exercise.transcript}</Text></View>}
    {result && <Button title="Takaisin harjoituksiin" secondary onPress={() => router.back()} />}
  </Screen>;
}
