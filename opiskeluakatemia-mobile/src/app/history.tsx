import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { loadHistory, type Attempt } from '../lib/exercises';
const labels = { grammar: 'Kielioppi', reading: 'Luetunymmärtäminen', listening: 'Kuuntelu' };
export default function History() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current; setLoading(true); setError('');
    try { const rows = await loadHistory(); if (current === sequence.current) { setAttempts(rows); setUpdated(new Date().toLocaleTimeString('fi-FI')); } }
    catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : 'Historian haku epäonnistui.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => listener.remove(); }, [refresh]);
  const average = attempts.length ? attempts.reduce((sum, a) => sum + Number(a.score_percentage), 0) / attempts.length : 0;
  return <Screen refreshing={loading} onRefresh={() => void refresh()}>
    <Text style={styles.title}>Oma edistyminen.</Text>
    <Text style={styles.body}>Saman tilin verkossa ja puhelimessa tallennetut harjoitukset. Näytetään enintään 100 viimeisintä suoritusta kustakin osa-alueesta.</Text>
    {!!updated && <Text style={styles.footer}>Päivitetty {updated}</Text>}
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Button title={loading ? 'Päivitetään…' : 'Päivitä historia'} secondary disabled={loading} onPress={() => void refresh()} />
    <View style={styles.note}><Text style={styles.heading}>{attempts.length} suoritusta · {Math.round(average)} % keskiarvo</Text></View>
    {!loading && !error && !attempts.length && <Text style={styles.body}>Ei vielä suorituksia. Palauta ensimmäinen harjoitus, niin tulos näkyy täällä ja verkkopalvelussa.</Text>}
    {attempts.map(a => <View key={`${a.category}-${a.id}`} style={styles.card}>
      <Text style={styles.eyebrow}>{labels[a.category]}</Text><Text style={styles.heading}>{a.exercise_title || a.exercise_id}</Text>
      <Text style={styles.title}>{a.total_score} / {a.max_score}</Text>
      <Text style={styles.body}>{Math.round(Number(a.score_percentage))} % · {new Date(a.submitted_at).toLocaleString('fi-FI')}</Text>
    </View>)}
  </Screen>;
}
