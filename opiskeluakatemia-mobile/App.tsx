import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { config, isConfigured } from './src/lib/config';
import { checkCourseAccess, courseRequest } from './src/lib/api';
import { loadHistory, type Attempt } from './src/lib/exercises';
import { router, useFocusEffect } from 'expo-router';
import { useSession } from './src/providers/SessionProvider';
import { colors, shadow } from './src/theme';
import { LegalLinks } from './src/components/LegalLinks';

type Access = 'loading' | 'active' | 'inactive' | 'error';

export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled) && { opacity: 0.55 }]}>
    <Text style={[styles.buttonText, secondary && { color: colors.ink }]}>{title}</Text>
  </Pressable>;
}

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
  return <View style={styles.bars}>
    {values.map((value, index) => <View key={index} style={[styles.bar, {
      height: Math.max(6, (Math.min(100, Math.max(0, value)) / 100) * 52),
      backgroundColor: index === values.length - 1 ? colors.ink : '#DCDCE1',
    }]} />)}
  </View>;
}

function TabIcon({ kind, active }: { kind: 'home' | 'practice' | 'history'; active?: boolean }) {
  const color = active ? colors.ink : '#B4B4BA';
  if (kind === 'practice') {
    return <View style={styles.pulse}>{[7, 14, 9].map(height => <View key={height} style={{ width: 3, height, borderRadius: 2, backgroundColor: color }} />)}</View>;
  }
  if (kind === 'history') {
    return <View style={styles.gridIcon}>{[0, 1, 2, 3].map(item => <View key={item} style={[styles.gridDot, { backgroundColor: color }]} />)}</View>;
  }
  return <View style={styles.homeIcon}>
    <View style={[styles.homeRoof, { borderColor: color }]} />
    <View style={[styles.homeBase, { borderColor: color }]} />
  </View>;
}

function TabBar() {
  const items = [
    { label: 'Koti', kind: 'home' as const, active: true, onPress: () => {} },
    { label: 'Harjoitukset', kind: 'practice' as const, onPress: () => router.push('/exercises') },
    { label: 'Historia', kind: 'history' as const, onPress: () => router.push('/history') },
  ];
  return <View style={styles.tabBar}>
    {items.map(item => <Pressable key={item.label} accessibilityRole="button" accessibilityState={{ selected: !!item.active }} onPress={item.onPress} style={styles.tab}>
      <View style={[styles.tabInner, item.active && styles.tabInnerOn]}>
        <TabIcon kind={item.kind} active={item.active} />
        <Text style={[styles.tabLabel, item.active && styles.tabLabelOn]}>{item.label}</Text>
      </View>
    </Pressable>)}
  </View>;
}

function CourseHome({ session }: { session: Session }) {
  const [access, setAccess] = useState<Access>('loading');
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const historyRequest = useRef(0);
  const [recent, setRecent] = useState<Attempt[] | null>(null);
  const request = useRef(0);
  const name = accountName(session);
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
  useFocusEffect(useCallback(() => {
    void refresh();
    void refreshHistory();
    return () => { request.current++; historyRequest.current++; };
  }, [refresh, refreshHistory]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') { void refresh(); void refreshHistory(); } });
    return () => subscription.remove();
  }, [refresh, refreshHistory]);
  const rows = recent ?? [];
  const latest = rows.slice(0, 3);
  const scores = rows.slice(0, 8).reverse().map(item => Number(item.score_percentage) || 0);
  const average = rows.length ? Math.round(rows.reduce((sum, item) => sum + Number(item.score_percentage), 0) / rows.length) : 0;
  const openPractice = () => { if (access === 'active') router.push('/exercises'); };
  return <View style={styles.home}>
    <ScrollView refreshControl={<RefreshControl refreshing={access === 'loading'} onRefresh={() => { void refresh(); void refreshHistory(); }} />} contentContainerStyle={styles.homeContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0)}</Text></View>
        <View style={styles.headerText}>
          <Text style={styles.hello}>Tervetuloa takaisin</Text>
          <Text style={styles.name} numberOfLines={1}>{name}</Text>
          <Text style={styles.email} numberOfLines={1}>{session.user.email}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Tili ja asetukset" onPress={() => router.push('/settings')} style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
          <Text style={styles.iconButtonText}>Tili</Text>
        </Pressable>
      </View>

      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

      <Pressable accessibilityRole="button" disabled={access === 'loading'} onPress={() => access === 'active' ? router.push('/exercises') : void refresh()} style={({ pressed }) => [styles.banner, pressed && access !== 'loading' && { opacity: 0.92 }]}>
        <View style={styles.bannerGlow} />
        <View style={styles.bannerMark}><Text style={styles.bannerMarkText}>o.</Text></View>
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerKicker}>{access === 'active' ? 'Kurssi käytössä' : access === 'inactive' ? 'Ei käyttöoikeutta' : access === 'error' ? 'Tarkistus epäonnistui' : 'Tarkistetaan kurssia'}</Text>
          <Text style={styles.bannerTitle} numberOfLines={1}>Englannin abikurssi</Text>
        </View>
        <View style={styles.chevronBtn}>{access === 'loading' ? <ActivityIndicator color={colors.ink} /> : <Text style={styles.chevronText}>›</Text>}</View>
      </Pressable>

      <Text style={styles.section}>Oma kurssi</Text>
      <View style={styles.chipRow}>{([
        ['/flashcards', 'Muistikortit'], ['/daily', 'Päivän tehtävät'], ['/theory', 'Teoria'], ['/essays', 'Kirjoitelmat'], ['/progress', 'Edistyminen'],
      ] as const).map(([path, title]) => <Pressable key={path} accessibilityRole="button" disabled={access !== 'active'} onPress={() => router.push(path)} style={[styles.chip, { minHeight: 48, opacity: access === 'active' ? 1 : 0.5 }]}><Text style={styles.chipText}>{title} ›</Text></Pressable>)}</View>
      <Text style={styles.section}>Harjoittelu</Text>
      <View style={styles.grid}>
        <Pressable accessibilityRole="button" disabled={access !== 'active'} onPress={openPractice} style={({ pressed }) => [styles.tile, access !== 'active' && { opacity: 0.55 }, pressed && access === 'active' && { opacity: 0.9 }]}>
          <View style={styles.tileTop}>
            <Text style={styles.tileTitle}>Aloita{'\n'}harjoittelu</Text>
            <Text style={styles.tileChevron}>›</Text>
          </View>
          <View style={styles.miniRow}>{['K', 'L', 'U'].map(letter => <View key={letter} style={styles.mini}><Text style={styles.miniText}>{letter}</Text></View>)}</View>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/history')} style={({ pressed }) => [styles.tile, pressed && { opacity: 0.9 }]}>
          <View style={styles.tileTop}>
            <Text style={styles.tileLabel}>Suoritukset</Text>
            <Text style={styles.tileChevron}>›</Text>
          </View>
          <Text style={styles.tileNumber}>{recent ? rows.length : '—'}</Text>
          <Text style={styles.muted}>{rows.length ? `${average} % keskiarvo` : 'Ei vielä tuloksia'}</Text>
          {scores.length > 0 && <Bars values={scores} />}
        </Pressable>
      </View>

      <View style={styles.feature}>
        <View style={styles.featureTop}>
          <View style={styles.featureCopy}>
            <Text style={styles.kicker}>Pitkä englanti</Text>
            <Text style={styles.featureTitle}>{access === 'active' ? 'Yo-englanti,\noma tahti.' : 'Kurssioikeutta\nei löytynyt.'}</Text>
          </View>
          <View style={styles.ringWrap}><View style={styles.ring} /></View>
        </View>
        <Text style={styles.body}>{access === 'active'
          ? 'Kielioppi, luetunymmärtäminen ja kuuntelu. Tulokset tallentuvat samalle tilille kuin verkossa.'
          : access === 'inactive'
            ? 'Tälle tilille ei löytynyt aktiivista kurssioikeutta. Jos kurssioikeutesi on toisella sähköpostiosoitteella, kirjaudu sillä.'
            : 'Kurssioikeus tarkistetaan verkkopalvelusta.'}</Text>
        <Pressable accessibilityRole="button" disabled={access === 'loading'} onPress={() => access === 'active' ? router.push('/exercises') : void refresh()} style={({ pressed }) => [styles.pill, (pressed || access === 'loading') && { opacity: 0.6 }]}>
          <Text style={styles.pillText}>{access === 'active' ? 'Aloita nyt' : access === 'loading' ? 'Tarkistetaan…' : 'Tarkista kurssi'}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHead}>
        <View>
          <Text style={styles.section}>Viimeisimmät</Text>
          <Text style={styles.muted}>{recent ? `${rows.length} suoritusta` : 'Haetaan historiaa'}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Avaa harjoitushistoria" onPress={() => router.push('/history')} style={styles.sectionLink}>
          <Text style={styles.tileChevron}>›</Text>
        </Pressable>
      </View>
      {!!historyError && <><Text accessibilityRole="alert" style={styles.error}>{historyError}</Text><Button title="Päivitä suoritukset" secondary onPress={() => void refreshHistory()} /></>}
      {!recent && !historyError && <Text style={styles.muted}>Hetki, haetaan suorituksia.</Text>}
      {recent && !latest.length && <Text style={styles.body}>Ei vielä suorituksia. Palauta ensimmäinen harjoitus, niin tulos näkyy täällä ja verkkopalvelussa.</Text>}
      {latest.map(item => <Pressable key={`${item.category}-${item.id}`} accessibilityRole="button" onPress={() => router.push('/history')} style={({ pressed }) => [styles.activity, pressed && { opacity: 0.9 }]}>
        <View style={styles.activityIcon}><Text style={styles.activityIconText}>{item.category === 'grammar' ? 'K' : item.category === 'reading' ? 'L' : 'U'}</Text></View>
        <View style={styles.activityCopy}>
          <Text style={styles.activityTitle} numberOfLines={1}>{item.exercise_title || item.exercise_id}</Text>
          <Text style={styles.muted} numberOfLines={1}>{item.category === 'grammar' ? 'Kielioppi' : item.category === 'reading' ? 'Luetunymmärtäminen' : 'Kuuntelu'} · {new Date(item.submitted_at).toLocaleDateString('fi-FI', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
        </View>
        <Text style={styles.activityScore}>{Math.round(Number(item.score_percentage))} %</Text>
      </Pressable>)}
    </ScrollView>
    <View style={styles.tabWrap}><TabBar /></View>
  </View>;
}

function Wordmark() {
  return <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>o.</Text></View><Text style={styles.brandText}>opiskeluakatemia</Text></View>;
}

function Login() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  async function login() {
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setMessage('Kirjautuminen epäonnistui. Tarkista sähköposti ja salasana sekä verkkoyhteys.'); }
    } catch { setMessage('Yhteys ei onnistunut. Yritä uudelleen.'); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!email.trim()) { setMessage('Kirjoita ensin sähköpostiosoitteesi.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${config.siteUrl}/reset-password` });
      if (error) throw error;
      setMessage('Jos osoitteella on tili, saat sähköpostiin linkin salasanan vaihtamiseen verkkopalvelussa.');
    } catch { setMessage('Salasanan palautus ei onnistunut. Yritä myöhemmin uudelleen.'); }
    finally { setBusy(false); }
  }
  return <>
    <Wordmark />
    <Text style={styles.kicker}>Englannin abikurssi</Text>
    <Text style={styles.display}>Oma tahti.{'\n'}Selkeä suunta.</Text>
    <Text style={styles.body}>Kirjaudu Opiskeluakatemian tunnuksillasi. Kurssioikeutesi kulkee mukanasi.</Text>
    <View style={styles.card}>
      <Text style={styles.heading}>Kirjaudu sisään</Text>
      <Text style={styles.label}>Sähköposti</Text>
      <TextInput accessibilityLabel="Sähköposti" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="sinä@esimerkki.fi" placeholderTextColor="#A1A1A6" editable={!busy} />
      <Text style={styles.label}>Salasana</Text>
      <TextInput accessibilityLabel="Salasana" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" placeholder="Salasanasi" placeholderTextColor="#A1A1A6" editable={!busy} onSubmitEditing={() => { if (!busy && email.trim() && password) void login(); }} />
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      <Button title={busy ? 'Hetkinen…' : 'Kirjaudu sisään'} disabled={busy || !email.trim() || !password} onPress={() => void login()} />
      <Button title="Unohditko salasanasi?" secondary disabled={busy} onPress={() => void resetPassword()} />
    </View>
    <Text style={styles.footer}>Kirjaudu sähköpostilla ja salasanalla. Käyttämällä sovellusta hyväksyt käyttöehdot.</Text>
    <LegalLinks />
  </>;
}

function ScrollShell({ children }: { children: React.ReactNode }) {
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  </KeyboardAvoidingView>;
}

export default function App() {
  const { session, loading } = useSession();
  return <SafeAreaProvider><SafeAreaView style={styles.safe}><StatusBar style="dark" />
    {!isConfigured ? <ScrollShell><Wordmark /><View style={styles.card}><Text style={styles.heading}>{__DEV__ ? 'Yhteys odottaa määritystä' : 'Palveluun ei saada yhteyttä'}</Text><Text style={styles.body}>{__DEV__ ? 'Lisää projektin .env.local-tiedostoon README-ohjeen mukaiset julkiset HTTPS-yhteysasetukset ja käynnistä sovellus uudelleen.' : 'Päivitä sovellus uusimpaan versioon tai yritä myöhemmin uudelleen.'}</Text></View></ScrollShell>
      : loading ? <View style={styles.center}><ActivityIndicator accessibilityLabel="Ladataan tiliä" color={colors.ink} size="large" /></View>
      : session ? <CourseHome key={session.user.id} session={session} /> : <ScrollShell><Login /></ScrollShell>}
  </SafeAreaView></SafeAreaProvider>;
}

export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.canvas },
  home: { flex: 1, width: '100%' },
  content: { padding: 22, paddingBottom: 48, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center', flexGrow: 1, boxSizing: 'border-box' },
  homeContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 128, gap: 14, width: '100%', maxWidth: 560, alignSelf: 'center', boxSizing: 'border-box' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  headerText: { flex: 1, gap: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  avatarText: { fontSize: 20, fontWeight: '700', color: colors.ink },
  hello: { fontSize: 13, color: colors.muted },
  name: { fontSize: 22, lineHeight: 26, fontWeight: '700', color: colors.ink, letterSpacing: -0.5 },
  email: { fontSize: 12, color: colors.muted },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', flexShrink: 0, ...shadow },
  iconButtonText: { fontSize: 12, fontWeight: '700', color: colors.ink },
  banner: { minHeight: 92, borderRadius: 28, backgroundColor: colors.banner, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  bannerGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#FFFFFF', opacity: 0.06, top: -80, right: 30 },
  bannerMark: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1B1B1B' },
  bannerMarkText: { color: colors.gold, fontSize: 20, fontWeight: '700' },
  bannerCopy: { flex: 1, gap: 2, minWidth: 0 },
  bannerKicker: { color: colors.gold, fontSize: 13, fontWeight: '600' },
  bannerTitle: { color: colors.white, fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  chevronBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  chevronText: { fontSize: 28, lineHeight: 30, color: colors.ink, marginTop: -2 },
  section: { fontSize: 28, lineHeight: 32, fontWeight: '700', color: colors.ink, letterSpacing: -0.8, marginTop: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  sectionLink: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', ...shadow },
  grid: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, minHeight: 176, backgroundColor: colors.card, borderRadius: 28, padding: 16, justifyContent: 'space-between', gap: 10, ...shadow },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  tileTitle: { flex: 1, fontSize: 20, lineHeight: 24, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  tileLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  tileNumber: { fontSize: 28, lineHeight: 32, fontWeight: '700', color: colors.ink, letterSpacing: -0.8 },
  tileChevron: { fontSize: 22, lineHeight: 24, color: '#C4C4C8' },
  miniRow: { flexDirection: 'row', gap: 8 },
  mini: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  miniText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  bars: { height: 44, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  bar: { width: 7, borderRadius: 4 },
  feature: { backgroundColor: colors.card, borderRadius: 28, padding: 20, gap: 14, ...shadow },
  featureTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCopy: { flex: 1, gap: 6, minWidth: 0 },
  featureTitle: { fontSize: 26, lineHeight: 30, fontWeight: '700', color: colors.ink, letterSpacing: -0.7 },
  ringWrap: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 7, borderColor: '#F0F0F2', borderTopColor: colors.ink, transform: [{ rotate: '-28deg' }] },
  activity: { minHeight: 76, borderRadius: 24, backgroundColor: colors.card, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, ...shadow },
  activityIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  activityIconText: { fontSize: 15, fontWeight: '700', color: colors.ink },
  activityCopy: { flex: 1, gap: 2, minWidth: 0 },
  activityTitle: { fontSize: 16, fontWeight: '700', color: colors.ink, letterSpacing: -0.2 },
  activityScore: { fontSize: 15, fontWeight: '700', color: colors.ink, flexShrink: 0 },
  tabWrap: { position: 'absolute', left: 20, right: 20, bottom: 10 },
  tabBar: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 32, padding: 6, ...shadow, shadowOpacity: 0.12, shadowRadius: 24, elevation: 8 },
  tab: { flex: 1 },
  tabInner: { alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 8, borderRadius: 26 },
  tabInnerOn: { backgroundColor: '#EEEEF1' },
  tabLabel: { fontSize: 11, fontWeight: '600', color: '#B4B4BA' },
  tabLabelOn: { color: colors.ink },
  pulse: { height: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  gridIcon: { width: 16, height: 16, flexDirection: 'row', flexWrap: 'wrap', gap: 2 },
  gridDot: { width: 6, height: 6, borderRadius: 1.5 },
  homeIcon: { width: 16, height: 16 },
  homeRoof: { position: 'absolute', top: 1, left: 2, width: 10, height: 10, borderLeftWidth: 1.6, borderTopWidth: 1.6, transform: [{ rotate: '45deg' }] },
  homeBase: { position: 'absolute', bottom: 0, left: 3, width: 10, height: 7, borderWidth: 1.6, borderTopWidth: 0, borderRadius: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12, marginTop: 8 },
  mark: { width: 36, height: 36, backgroundColor: colors.ink, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.white, fontSize: 18, fontWeight: '700' },
  brandText: { fontSize: 17, fontWeight: '600', color: colors.ink, letterSpacing: -0.4 },
  kicker: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  display: { fontSize: 42, lineHeight: 46, letterSpacing: -1.6, fontWeight: '700', color: colors.ink },
  title: { fontSize: 32, lineHeight: 36, letterSpacing: -1, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 22, color: '#5C5C61' },
  muted: { fontSize: 13, lineHeight: 18, color: colors.muted },
  card: { padding: 20, borderRadius: 28, backgroundColor: colors.card, gap: 14, ...shadow },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '700', color: colors.ink, letterSpacing: -0.4 },
  score: { fontSize: 40, lineHeight: 44, fontWeight: '700', color: colors.ink, letterSpacing: -1.2 },
  label: { fontSize: 13, fontWeight: '600', color: '#3A3A3E' },
  input: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#FAFAFB', borderRadius: 16, padding: 15, fontSize: 16, color: colors.ink, minHeight: 52 },
  button: { minHeight: 52, borderRadius: 999, backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  buttonText: { fontSize: 15, color: colors.white, fontWeight: '600', textAlign: 'center' },
  pill: { alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  error: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  message: { color: '#3A3A3E', fontSize: 14, lineHeight: 20 },
  footer: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 4 },
  note: { gap: 8, padding: 14, backgroundColor: colors.soft, borderRadius: 16 },
  badge: { fontSize: 14, color: '#8A6A2F', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.ink },
  chipTextOn: { color: colors.white },
  choice: { padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FAFAFB' },
  choiceOn: { borderColor: colors.ink, backgroundColor: colors.soft },
});
