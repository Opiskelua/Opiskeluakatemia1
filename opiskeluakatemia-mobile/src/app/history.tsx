import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Text } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ListScreen, usePullToRefresh } from '../components/Screen';
import { Card, EmptyState, ListRow, LoadingState, Notice, PageHeader, ProgressBar } from '../components/ui';
import { maxScale, useTheme } from '../theme';
import { loadHistory, type Attempt } from '../lib/exercises';
import { averagePercentage, historyRow, type HistoryRow } from '../lib/history-rows';
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
    try { const rows = await loadHistory(); if (current === sequence.current) { setAttempts(rows); setLoaded(true); setUpdated(new Date().toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })); } }
    catch (e) { if (current === sequence.current) setError(e instanceof Error ? e.message : 'Historian haku epäonnistui.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { sequence.current++; }; }, [refresh]));
  useEffect(() => { const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); }); return () => listener.remove(); }, [refresh]);
  // Up to 300 rows: format dates once per load, not on every render.
  const rows = useMemo(() => attempts.map(a => historyRow(a)), [attempts]);
  const average = useMemo(() => averagePercentage(attempts), [attempts]);
  const pull = usePullToRefresh(refresh);
  const renderItem = useCallback(({ item }: { item: HistoryRow }) => <ListRow badge={item.badge} title={item.title} subtitle={item.subtitle} trailing={item.trailing} accessibilityLabel={item.label} />, []);
  const header = <>
    <PageHeader kicker="Edistyminen" title="Harjoitushistoria" intro="Saman tilin verkossa ja puhelimessa tallennetut harjoitukset. Näytetään enintään 100 viimeisintä suoritusta kustakin osa-alueesta." />
    {!!error && <Notice tone="error" title="Historiaa ei voitu päivittää" message={error} actionTitle="Yritä uudelleen" actionDisabled={loading} onAction={() => void refresh()} />}
    {!loaded && loading && <LoadingState label="Haetaan suorituksia…" />}
    {loaded && <Card>
      <Text style={type.overline}>Yhteenveto</Text>
      <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat} accessibilityLabel={`${attempts.length} suoritusta`}>{attempts.length}</Text>
      <Text style={type.body}>{attempts.length ? `${Math.round(average)} % keskiarvo` : 'Ei vielä suorituksia'}</Text>
      {attempts.length > 0 && <ProgressBar value={average} label="Keskiarvo" />}
      {!!updated && <Text style={type.caption}>Päivitetty klo {updated} · vedä alas päivittääksesi</Text>}
    </Card>}
  </>;
  const empty = loaded && !error
    ? <EmptyState title="Ei vielä suorituksia" message="Palauta ensimmäinen harjoitus, niin tulos näkyy täällä ja verkkopalvelussa." actionTitle="Valitse harjoitus" onAction={() => router.push('/exercises')} />
    : undefined;
  return <ListScreen data={rows} renderItem={renderItem} keyExtractor={row => row.key} header={header} empty={empty} {...pull} />;
}
