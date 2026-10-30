import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Screen } from '../components/Screen';
import { ExerciseAudio } from '../components/ExerciseAudio';
import { Button, Card, EmptyState, Field, LoadingState, Notice, ProgressBar } from '../components/ui';
import { layout, makeStyles, radii, space, useTheme } from '../theme';
import { completeTask } from '../lib/course';
import { choices } from '../lib/catalogue';
import { allAnswered, usesAiGrading, type Answers, type Exercise, type Result } from '../lib/exercise-model';
import { loadExercise, submitExercise } from '../lib/exercises';
import { ensureAiConsent } from '../lib/ai-consent';

const categoryLabel = { grammar: 'Kielioppi ja sanasto', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen' } as const;

export default function ExerciseScreen() {
  const { id, difficulty, taskId } = useLocalSearchParams<{ id: string; difficulty?: string; taskId?: string }>();
  const choice = choices.find(c => c.id === id);
  const { colors, type } = useTheme();
  const styles = useStyles();
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
    inFlight.current = true;
    if (usesAiGrading(exercise) && !await ensureAiConsent()) { inFlight.current = false; setError('Vastauksia ei lähetetty. Avoimet vastaukset vaativat tekoälyarvioinnin hyväksymisen.'); return; }
    setSaving(true); setLocked(true); setError('');
    try {
      const saved = await submitExercise(exercise, answers, attemptId.current);
      if (mounted.current) setResult(saved);
      if (taskId) { try { await completeTask(taskId, saved.totalScore, saved.maxScore); } catch { if (mounted.current) setTaskError('Tulos tallennettiin, mutta päivän tehtävän kuittaus epäonnistui.'); } }
    } catch (e) {
      if (mounted.current) setError((e instanceof Error ? e.message : 'Tallennus epäonnistui.') + ' Vastaukset ovat tallessa tässä näkymässä. Voit yrittää tallennusta uudelleen.');
    } finally { inFlight.current = false; if (mounted.current) setSaving(false); }
  }
  if (!choice) return <Screen><EmptyState title="Tehtävää ei löytynyt." message="Valitse harjoitus uudelleen harjoitusvalikosta." actionTitle="Takaisin" onAction={() => router.back()} /></Screen>;
  if (loading) return <Screen><LoadingState label="Valmistellaan harjoitusta…" /><Button title="Peruuta" secondary onPress={() => router.back()} /></Screen>;
  if (!exercise) return <Screen><Notice tone="error" title="Tehtävää ei voitu ladata" message={error} actionTitle="Yritä uudelleen" onAction={() => { setLoading(true); setError(''); setReload(n => n + 1); }} /><Button title="Takaisin" variant="ghost" onPress={() => router.back()} /></Screen>;
  const answered = exercise.questions.filter(q => answers[q.id] !== undefined && String(answers[q.id]).trim()).length;
  return <Screen>
    <View style={{ gap: space.xs }}>
      <Text style={type.overline}>{result ? 'Tallennettu verkkopalveluun' : categoryLabel[exercise.category]}</Text>
      <Text accessibilityRole="header" style={type.title}>{exercise.title}</Text>
      {!!exercise.instructions && <Text style={type.body}>{exercise.instructions}</Text>}
    </View>
    {result && <Card tone="success">
      <Text style={[type.overline, { color: colors.success }]}>Tulos</Text>
      <Text style={type.stat} accessibilityLabel={`Tulos ${result.totalScore} / ${result.maxScore} pistettä`}>{result.totalScore} / {result.maxScore}</Text>
      <ProgressBar tone="success" value={result.maxScore ? (result.totalScore / result.maxScore) * 100 : 0} label="Tulos prosentteina" />
      <Text style={type.body}>Tulos näkyy myös verkkopalvelun harjoitushistoriassa samalla tilillä.</Text>
      <Button title="Katso historia" onPress={() => router.replace('/history')} />
    </Card>}
    {!!taskError && <Notice tone="error" message={taskError} actionTitle="Yritä kuittausta uudelleen" onAction={() => { if (result && taskId) void completeTask(taskId, result.totalScore, result.maxScore).then(() => setTaskError('')).catch(() => setTaskError('Kuittaus epäonnistui. Yritä uudelleen.')); }} />}
    {!!exercise.audioUrl && <ExerciseAudio url={exercise.audioUrl} splitTime={exercise.splitTime} />}
    {exercise.passages.map((text, index) => <Card key={index}><Text selectable style={[type.body, { color: colors.ink }]}>{text}</Text></Card>)}
    {exercise.questions.map((q, index) => {
      const feedback = result?.evaluations?.find(e => e.questionId === q.id);
      return <Card key={q.id}>
        <Text style={type.overline}>Kysymys {index + 1} / {exercise.questions.length}</Text>
        <Text selectable style={type.subheading}>{q.prompt}</Text>
        {!!q.hint && <Text style={type.caption}>{q.hint}</Text>}
        {q.options ? <View accessibilityRole="radiogroup" style={{ gap: space.xs }}>{q.options.map((option, optionIndex) => {
          const selected = answers[q.id] === optionIndex;
          // After grading, highlight the right answer and mark a wrong selection.
          const correctIndex = q.correctIndex ?? result?.correctIndexes?.[q.id];
          const graded = !!result && correctIndex !== undefined;
          const correct = graded && optionIndex === correctIndex;
          const wrong = graded && selected && !correct;
          const letter = String.fromCharCode(65 + optionIndex);
          return <Pressable accessibilityRole="radio" accessibilityLabel={`${letter}. ${option}${correct ? ', oikea vastaus' : wrong ? ', väärä vastaus' : ''}`} accessibilityState={{ checked: selected, disabled: locked }} disabled={locked} key={optionIndex}
            onPress={() => setAnswers(previous => ({ ...previous, [q.id]: optionIndex }))}
            style={({ pressed }) => [styles.choice, selected && styles.choiceOn, correct && styles.choiceCorrect, wrong && styles.choiceWrong, pressed && !selected && { backgroundColor: colors.surfacePressed }]}>
            <View style={[styles.letter, selected && !graded && styles.letterOn, correct && { backgroundColor: colors.success, borderColor: colors.success }, wrong && { backgroundColor: colors.danger, borderColor: colors.danger }]}>
              <Text style={[styles.letterText, ((selected && !graded) || correct || wrong) && { color: colors.onPrimary }]} maxFontSizeMultiplier={1.3}>{correct ? '✓' : wrong ? '✕' : letter}</Text>
            </View>
            <Text style={[type.body, styles.choiceText, (selected || correct) && { color: colors.ink, fontWeight: '600' }]}>{option}</Text>
          </Pressable>;
        })}</View> : <Field accessibilityLabel={`Vastaus kysymykseen ${index + 1}`} style={{ minHeight: 64 }} multiline autoCorrect={false} autoCapitalize="none" editable={!locked}
          value={String(answers[q.id] ?? '')} placeholder="Kirjoita vastauksesi" maxLength={q.maxCharacters}
          onChangeText={text => setAnswers(previous => ({ ...previous, [q.id]: text }))}
          hint={q.maxCharacters ? `${String(answers[q.id] ?? '').length} / ${q.maxCharacters} merkkiä` : undefined} />}
        {feedback && <View style={[styles.feedback, feedback.score > 0 ? styles.feedbackGood : styles.feedbackBad]}>
          <Text style={[type.label, { color: feedback.score > 0 ? colors.success : colors.danger }]}>{feedback.score > 0 ? '✓' : '✕'} {feedback.score} p.</Text>
          {!!feedback.feedback && <Text selectable style={[type.body, { fontSize: 15, lineHeight: 21 }]}>{feedback.feedback}</Text>}
        </View>}
      </Card>;
    })}
    {!!error && <Notice tone="error" message={error} />}
    {!result && <View style={{ gap: space.sm }}>
      <View style={{ gap: space.xs }}>
        <Text style={type.caption}>{answered} / {exercise.questions.length} vastattu</Text>
        <ProgressBar value={exercise.questions.length ? (answered / exercise.questions.length) * 100 : 0} label="Vastatut kysymykset" />
      </View>
      <Button title={saving ? 'Arvioidaan ja tallennetaan…' : locked ? 'Yritä tallennusta uudelleen' : 'Palauta ja tallenna'} loading={saving} disabled={!allAnswered(exercise, answers)} onPress={() => void submit()} />
    </View>}
    {!!(result?.transcript || (result && exercise.transcript)) && <Card><Text accessibilityRole="header" style={type.subheading}>Kuuntelun teksti</Text><Text selectable style={type.body}>{result?.transcript || exercise.transcript}</Text></Card>}
    {result && <Button title="Takaisin harjoituksiin" secondary onPress={() => router.back()} />}
  </Screen>;
}

// Options sit inside a card: in dark mode the card is `surface`, so options take the muted tone to stand out.
// The letter disc text uses onPrimary, which reads on primary, success and danger fills in both modes.
const useStyles = makeStyles(({ colors, scheme }) => StyleSheet.create({
  choice: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: layout.minTouch + 8, paddingVertical: space.sm, paddingHorizontal: space.sm, borderRadius: radii.lg, borderWidth: 1, borderColor: scheme === 'dark' ? colors.lineStrong : colors.line, backgroundColor: scheme === 'dark' ? colors.surfaceMuted : colors.surface },
  choiceOn: { borderColor: colors.ink, borderWidth: 1.5, backgroundColor: scheme === 'dark' ? colors.surfacePressed : colors.surfaceMuted },
  choiceCorrect: { borderColor: colors.success, borderWidth: 1.5, backgroundColor: colors.successSurface },
  choiceWrong: { borderColor: colors.danger, borderWidth: 1.5, backgroundColor: colors.dangerSurface },
  choiceText: { flex: 1, minWidth: 0 },
  letter: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.control, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  letterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  letterText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  feedback: { gap: space.xxs, padding: space.sm, borderRadius: radii.lg, borderWidth: 1 },
  feedbackGood: { backgroundColor: colors.successSurface, borderColor: colors.successLine },
  feedbackBad: { backgroundColor: colors.dangerSurface, borderColor: colors.dangerLine },
}));
