import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { config, isConfigured } from './src/lib/config';
import { checkCourseAccess, courseRequest } from './src/lib/api';
import { loadHistory, type Attempt } from './src/lib/exercises';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSession } from './src/providers/SessionProvider';
import { disabledOpacity, layout, makeStyles, maxScale, radii, space, useTheme } from './src/theme';
import { LegalLinks } from './src/components/LegalLinks';
import { Ambient, useGutter } from './src/components/Screen';
import { Glass } from './src/components/Glass';
import { Button, Card, Chevron, Field, ListRow, LoadingState, NavCard, Notice, SectionTitle } from './src/components/ui';
import { PathHomeCard } from './src/components/PathProgress';
import { loadPath } from './src/lib/path-v2';
import type { PathStateV2 } from './src/lib/path-v2-types';

type Access = 'loading' | 'active' | 'inactive' | 'error';

const categoryLabel = { grammar: 'Kielioppi', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen' } as const;
const categoryBadge = { grammar: 'K', reading: 'L', listening: 'U' } as const;

function accountName(session: Session) {
  const meta = session.user.user_metadata ?? {};
  const raw = typeof meta.full_name === 'string' && meta.full_name.trim()
    ? meta.full_name.trim()
    : typeof meta.name === 'string' && meta.name.trim()
      ? meta.name.trim()
      : session.user.email?.split('@')[0] ?? 'Opiskelija';
  return raw.charAt(0).toLocaleUpperCase('fi-FI') + raw.slice(1);
}

function Bars({ values }: { values: number[] }) {
  const { colors } = useTheme();
  const styles = useStyles();
  return <View style={styles.bars} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
    {values.map((value, index) => <View key={index} style={[styles.bar, {
      height: Math.max(4, (Math.min(100, Math.max(0, value)) / 100) * 40),
      backgroundColor: index === values.length - 1 ? colors.ink : colors.lineStrong,
    }]} />)}
  </View>;
}

function AreaTile({ badge, title, description, onPress, disabled }: { badge: string; title: string; description: string; onPress: () => void; disabled: boolean }) {
  const { colors, type } = useTheme();
  const styles = useStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${description}`} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.surfacePressed }, disabled && { opacity: disabledOpacity }]}>
    <View style={styles.tileBadge}><Text style={styles.tileBadgeText} maxFontSizeMultiplier={1.3}>{badge}</Text></View>
    <Text style={type.subheading}>{title}</Text>
    <Text style={type.caption}>{description}</Text>
  </Pressable>;
}

function CourseHome({ session }: { session: Session }) {
  const [access, setAccess] = useState<Access>('loading');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const historyRequest = useRef(0);
  const [recent, setRecent] = useState<Attempt[] | null>(null);
  const [pulling, setPulling] = useState(false);
  const [path, setPath] = useState<PathStateV2 | null>(null);
  const [pathError, setPathError] = useState(false);
  const pathRequest = useRef(0);
  const request = useRef(0);
  const { colors, type } = useTheme();
  const styles = useStyles();
  const name = accountName(session);
  const gutter = useGutter();
  const insets = useSafeAreaInsets();
  const { fontScale, width } = useWindowDimensions();
  const singleColumn = fontScale > 1.35 || width < 340;
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setAccess('loading'); setError('');
    try {
      // A linking problem must not prevent an already active course from opening.
      // The server still performs the authoritative access check below.
      try { await courseRequest('link-purchases', 'POST'); } catch { /* Access is checked next. */ }
      const active = await checkCourseAccess();
      if (current === request.current) setAccess(active ? 'active' : 'inactive');
    } catch (cause) {
      if (current === request.current) {
        setAccess('error');
        setError(cause instanceof Error ? cause.message : 'Yhteys ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.');
      }
    }
  }, []);
  const refreshHistory = useCallback(async () => {
    const current = ++historyRequest.current;
    try { const rows = await loadHistory(); if (current === historyRequest.current) { setRecent(rows); setHistoryError(''); } }
    catch { if (current === historyRequest.current) setHistoryError('Suorituksia ei voitu päivittää. Yritä uudelleen.'); }
  }, []);
  const refreshPath = useCallback(async () => {
    const current = ++pathRequest.current;
    try { const value = await loadPath(); if (current === pathRequest.current) { setPath(value); setPathError(false); } }
    catch { if (current === pathRequest.current) setPathError(true); }
  }, []);
  useFocusEffect(useCallback(() => {
    void refresh();
    void refreshHistory();
    void refreshPath();
    return () => { request.current++; historyRequest.current++; pathRequest.current++; };
  }, [refresh, refreshHistory, refreshPath]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { void refresh(); void refreshHistory(); void refreshPath(); } });
    return () => subscription.remove();
  }, [refresh, refreshHistory, refreshPath]);
  const rows = recent ?? [];
  const latest = rows.slice(0, 3);
  const last = rows[0];
  const scores = rows.slice(0, 8).reverse().map(item => Number(item.score_percentage) || 0);
  const average = rows.length ? Math.round(rows.reduce((sum, item) => sum + Number(item.score_percentage), 0) / rows.length) : 0;
  const active = access === 'active';
  const go = (path: Href) => () => router.push(path);
  return <ScrollView
    refreshControl={<RefreshControl refreshing={pulling} tintColor={colors.ink} colors={[colors.ink]} onRefresh={() => { setPulling(true); void Promise.all([refresh(), refreshHistory(), refreshPath()]).finally(() => setPulling(false)); }} />}
    contentContainerStyle={[styles.homeContent, { paddingHorizontal: gutter, paddingBottom: space.xxxl + insets.bottom }]}>
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={type.caption}>Tervetuloa takaisin</Text>
        <Text accessibilityRole="header" style={type.title} maxFontSizeMultiplier={maxScale.title} numberOfLines={2}>Hei, {name}</Text>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Tili ja asetukset" accessibilityHint="Kirjaudu ulos, lue ehdot tai poista tili" onPress={go('/settings')} hitSlop={6} style={styles.avatarShell}>
        {({ pressed }) => <Glass interactive style={styles.avatar} scrim={pressed ? colors.surfacePressed : undefined} fallbackColor={pressed ? colors.surfacePressed : colors.cardGlass}>
          <Text style={styles.avatarText} maxFontSizeMultiplier={1.2}>{name.charAt(0)}</Text>
        </Glass>}
      </Pressable>
    </View>

    <View accessible accessibilityLabel={`Englannin abikurssi. ${access === 'active' ? 'Kurssi käytössä' : access === 'inactive' ? 'Ei käyttöoikeutta' : access === 'error' ? 'Tarkistus epäonnistui' : 'Tarkistetaan kurssia'}`} style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: active ? colors.success : access === 'loading' ? colors.placeholder : colors.danger }]} />
      <Text style={[type.caption, styles.flex]} numberOfLines={2}>Englannin abikurssi · {active ? 'Kurssi käytössä' : access === 'inactive' ? 'Ei käyttöoikeutta' : access === 'error' ? 'Tarkistus epäonnistui' : 'Tarkistetaan kurssia…'}</Text>
    </View>

    {access === 'error' && <Notice tone="error" title="Kurssioikeutta ei voitu tarkistaa" message={error} actionTitle="Yritä uudelleen" onAction={() => void refresh()} />}
    {access === 'inactive' && <Notice title="Kurssioikeutta ei löytynyt" message="Tälle tilille ei löytynyt aktiivista kurssioikeutta. Jos kurssioikeutesi on toisella sähköpostiosoitteella, kirjaudu sillä." actionTitle="Tarkista uudelleen" onAction={() => void refresh()} />}

    <SectionTitle title="Tänään" />
    <PathHomeCard state={active ? path : null} error={pathError} disabled={!active} onPress={go('/path')}
      onStart={path?.nextLessonId ? () => router.push({ pathname: '/path-lesson', params: { lessonId: path.nextLessonId! } }) : go('/path')} />
    <NavCard kicker="Päivän suunnitelma" title="Päivän tehtävät" description="Sinulle valitut tehtävät taitoprofiilisi perusteella." disabled={!active} onPress={go('/daily')} />
    <NavCard kicker={last ? 'Jatka siitä mihin jäit' : 'Aloita tästä'} title={last ? (last.exercise_title || last.exercise_id) : 'Aloita harjoittelu'}
      description={last ? `Viimeksi ${categoryLabel[last.category].toLocaleLowerCase('fi-FI')} · ${Math.round(Number(last.score_percentage))} %` : 'Kielioppi, luetun- ja kuullunymmärtäminen.'}
      disabled={!active} onPress={go('/exercises')} accessibilityHint="Avaa harjoitusvalikon" />

    <SectionTitle title="Harjoittele" />
    <View style={[styles.grid, singleColumn && styles.gridSingle]}>
      <AreaTile badge="H" title="Harjoitukset" description="Kielioppi, luetun ja kuullun ymmärrys" disabled={!active} onPress={go('/exercises')} />
      <AreaTile badge="T" title="Teoria" description="Säännöt, esimerkit ja yo-vinkit" disabled={!active} onPress={go('/theory')} />
      <AreaTile badge="E" title="Kirjoitelmat" description="Aiheet, luonnokset ja arvioinnit" disabled={!active} onPress={go('/essays')} />
      <AreaTile badge="M" title="Muistikortit" description="Sanaston kertaus omaan tahtiin" disabled={!active} onPress={go('/flashcards')} />
    </View>

    <SectionTitle title="Edistyminen" />
    <Pressable accessibilityRole="button" accessibilityLabel={recent ? `Suoritukset: ${rows.length}. ${rows.length ? `Keskiarvo ${average} prosenttia.` : 'Ei vielä tuloksia.'} Avaa harjoitushistoria.` : 'Haetaan suorituksia. Avaa harjoitushistoria.'}
      onPress={go('/history')} style={({ pressed }) => [styles.statsCard, pressed && { backgroundColor: colors.surfacePressed }]}>
      <View style={styles.flex}>
        <Text style={type.overline}>Suoritukset</Text>
        <Text style={type.stat} maxFontSizeMultiplier={maxScale.stat}>{recent ? rows.length : '—'}</Text>
        <Text style={type.caption}>{rows.length ? `${average} % keskiarvo` : recent ? 'Ei vielä tuloksia' : 'Haetaan…'}</Text>
      </View>
      {scores.length > 0 && <Bars values={scores} />}
      <Chevron />
    </Pressable>
    <NavCard title="Arvosana-arvio ja taitoprofiili" description="Vahvuudet ja seuraavaksi harjoiteltavat taidot" disabled={!active} onPress={go('/progress')} />

    <SectionTitle title="Viimeisimmät" detail={recent ? `${rows.length} suoritusta` : undefined} action={{ label: 'Kaikki', accessibilityLabel: 'Avaa koko harjoitushistoria', onPress: go('/history') }} />
    {!!historyError && <Notice tone="error" message={historyError} actionTitle="Päivitä suoritukset" onAction={() => void refreshHistory()} />}
    {!recent && !historyError && <LoadingState label="Haetaan suorituksia…" />}
    {recent && !latest.length && <Card tone="muted"><Text style={type.body}>Ei vielä suorituksia. Palauta ensimmäinen harjoitus, niin tulos näkyy täällä ja verkkopalvelussa.</Text></Card>}
    {latest.map(item => <ListRow key={`${item.category}-${item.id}`} badge={categoryBadge[item.category]} title={item.exercise_title || item.exercise_id}
      subtitle={`${categoryLabel[item.category]} · ${new Date(item.submitted_at).toLocaleDateString('fi-FI', { weekday: 'short', day: 'numeric', month: 'numeric' })}`}
      trailing={`${Math.round(Number(item.score_percentage))} %`} onPress={go('/history')} />)}
  </ScrollView>;
}

function Wordmark() {
  const styles = useStyles();
  return <View style={styles.brand} accessible accessibilityRole="header" accessibilityLabel="Opiskeluakatemia">
    <View style={styles.mark}><Text style={styles.markText} maxFontSizeMultiplier={1.2}>o.</Text></View>
    <Text style={styles.brandText}>opiskeluakatemia</Text>
  </View>;
}

function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'info'>('error');
  const { type } = useTheme();
  const styles = useStyles();
  const show = (text: string, tone: 'error' | 'info' = 'error') => { setMessage(text); setMessageTone(tone); };
  async function login() {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { show('Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana sekä verkkoyhteys.'); }
    } catch { show('Yhteys ei onnistunut. Yritä uudelleen.'); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!email.trim()) { show('Kirjoita ensin sähköpostiosoitteesi.', 'info'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${config.siteUrl}/reset-password` });
      if (error) throw error;
      show('Jos osoitteella on tili, saat sähköpostiin linkin salasanan vaihtamiseen verkkopalvelussa.', 'info');
    } catch { show('Salasanan palautus ei onnistunut. Yritä myöhemmin uudelleen.'); }
    finally { setBusy(false); }
  }
  return <>
    <Wordmark />
    <View style={styles.hero}>
      <Text style={type.overline}>Englannin abikurssi</Text>
      <Text accessibilityRole="header" style={type.display} maxFontSizeMultiplier={maxScale.display}>Oma tahti.{'\n'}Selkeä suunta.</Text>
      <Text style={type.body}>Kirjaudu Opiskeluakatemian tunnuksillasi. Kurssioikeutesi kulkee mukanasi.</Text>
    </View>
    <Card style={styles.loginCard}>
      <Text style={type.heading}>Kirjaudu sisään</Text>
      <Field label="Sähköposti" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress" placeholder="sinä@esimerkki.fi" editable={!busy} returnKeyType="next" />
      <Field label="Salasana" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" placeholder="Salasanasi" editable={!busy} returnKeyType="go" onSubmitEditing={() => { if (!busy && email.trim() && password) void login(); }} />
      {!!message && <Notice tone={messageTone} message={message} />}
      <Button title={busy ? 'Hetkinen…' : 'Kirjaudu sisään'} loading={busy} disabled={!email.trim() || !password} onPress={() => void login()} />
      <Button title="Unohditko salasanasi?" variant="ghost" disabled={busy} onPress={() => void resetPassword()} />
    </Card>
    <Text style={type.caption}>Kirjaudu sähköpostilla ja salasanalla. Käyttämällä sovellusta hyväksyt käyttöehdot.</Text>
    <LegalLinks />
  </>;
}

function ScrollShell({ children }: { children: React.ReactNode }) {
  const gutter = useGutter();
  const styles = useStyles();
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">{children}</ScrollView>
  </KeyboardAvoidingView>;
}

export default function App() {
  const { session, loading } = useSession();
  const { type, scheme } = useTheme();
  const styles = useStyles();
  return <SafeAreaProvider><SafeAreaView style={styles.safe} edges={session ? ['top', 'left', 'right'] : undefined}><StatusBar style={scheme === 'dark' ? 'light' : 'dark'} /><Ambient />
    {!isConfigured ? <ScrollShell><Wordmark /><Card><Text style={type.heading}>{__DEV__ ? 'Yhteys odottaa määritystä' : 'Palveluun ei saada yhteyttä'}</Text><Text style={type.body}>{__DEV__ ? 'Lisää projektin .env.local-tiedostoon README-ohjeen mukaiset julkiset HTTPS-yhteysasetukset ja käynnistä sovellus uudelleen.' : 'Päivitä sovellus uusimpaan versioon tai yritä myöhemmin uudelleen.'}</Text></Card></ScrollShell>
      : loading ? <View style={styles.center}><LoadingState label="Ladataan tiliä" /></View>
      : session ? <CourseHome key={session.user.id} session={session} /> : <ScrollShell><Login /></ScrollShell>}
  </SafeAreaView></SafeAreaProvider>;
}

const useStyles = makeStyles(({ colors, glass }) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  flex: { flex: 1, minWidth: 0 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingTop: space.lg, paddingBottom: space.xxxl, gap: space.md, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', flexGrow: 1 },
  homeContent: { paddingTop: space.md, gap: space.sm, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  headerText: { flex: 1, minWidth: 0, gap: 2 },
  avatar: { width: 48, height: 48, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  avatarShell: { borderRadius: radii.pill, flexShrink: 0 },
  avatarText: { fontSize: 19, fontWeight: '700', color: colors.ink },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 24 },
  statusDot: { width: 8, height: 8, borderRadius: radii.pill },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  gridSingle: { flexDirection: 'column', flexWrap: 'nowrap' },
  tile: { flexGrow: 1, flexBasis: '45%', minHeight: 132, padding: space.lg, borderRadius: radii.xl, gap: space.xxs, ...glass.card },
  tileBadge: { width: 36, height: 36, borderRadius: radii.pill, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  tileBadgeText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  statsCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radii.xl, ...glass.card },
  bars: { height: 40, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  bar: { width: 6, borderRadius: radii.pill },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xs },
  mark: { width: 36, height: 36, backgroundColor: colors.primary, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.onPrimary, fontSize: 18, fontWeight: '700' },
  brandText: { fontSize: 17, fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },
  hero: { gap: space.xs, marginTop: space.md, marginBottom: space.xs },
  loginCard: { gap: space.md },
}));
