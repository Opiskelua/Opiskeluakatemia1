import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen, usePullToRefresh } from '../components/Screen';
import { Card, EmptyState, ListRow, LoadingState, Notice, PageHeader, ProgressBar } from '../components/ui';
import { maxScale, useTheme } from '../theme';
import { loadHistory, type Attempt } from '../lib/exercises';
const labels = { grammar: 'Kielioppi', reading: 'Luetunymmärtäminen', listening: 'Kuuntelu' };
export default function History() {
  const { type } = useTheme();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current; setLoading(true); setError('');
    try { const rows = await loadHistory(); if (current === sequence.current) { setAttempts(rows); setLoaded(true); setUpdated(new Date().toLocaleTimeString('fi-FI')); } }
    catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : 'Historian haku epäonnistui.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => listener.remove(); }, [refresh]);
  const average = attempts.length ? attempts.reduce((sum, a) => sum + Number(a.score_percentage), 0) / attempts.length : 0;
  const badge = { grammar: 'K', reading: 'L', listening: 'U' } as const;
  const pull = usePullToRefresh(refresh);
  return <Screen {...pull}>
    <PageHeader kicker="Edistyminen" title="Harjoitushistoria" intro="Saman tilin verkossa ja puhelimessa tallennetut harjoitukset. Näytetään enintään 100 viimeisintä suoritusta kustakin osa-alueesta." />
    {!!error && <Notice tone="error" title="Historiaa ei voitu päivittää" message={error} actionTitle="Yritä uudelleen" actionDisabled={loading} onAction={() => void refresh()} />}
    {!loaded && loading && <LoadingState label="Haetaan suorituksia…" />}
    {loaded && <Card>
      <Text style={type.overline}>Yhteenveto</Text>
      <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat}>{attempts.length}</Text>
      <Text style={type.body}>{attempts.length ? `${Math.round(average)} % keskiarvo` : 'Ei vielä suorituksia'}</Text>
      {attempts.length > 0 && <ProgressBar value={average} label="Keskiarvo" />}
      {!!updated && <Text style={type.caption}>Päivitetty {updated} · vedä alas päivittääksesi</Text>}
    </Card>}
    {loaded && !error && !attempts.length && <EmptyState title="Ei vielä suorituksia" message="Palauta ensimmäinen harjoitus, niin tulos näkyy täällä ja verkkopalvelussa." />}
    {attempts.map(a => <ListRow key={`${a.category}-${a.id}`} badge={badge[a.category]} title={a.exercise_title || a.exercise_id}
      subtitle={`${labels[a.category]} · ${new Date(a.submitted_at).toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
      trailing={`${a.total_score}/${a.max_score}`} accessibilityLabel={`${a.exercise_title || a.exercise_id}, ${labels[a.category]}, ${a.total_score} / ${a.max_score} pistettä`} />)}
  </Screen>;
}
