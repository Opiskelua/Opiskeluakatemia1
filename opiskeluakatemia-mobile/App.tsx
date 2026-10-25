import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/lib/supabase';
import { config, isConfigured } from './src/lib/config';
import { checkCourseAccess, courseRequest } from './src/lib/api';
import { router, useFocusEffect } from 'expo-router';
import { useSession } from './src/providers/SessionProvider';

type Access = 'loading' | 'active' | 'inactive' | 'error';
export function Button({ title, onPress, disabled = false, secondary = false }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.button, secondary && styles.secondary, (pressed || disabled) && { opacity: 0.55 }]}>
    <Text style={[styles.buttonText, secondary && { color: '#192C27' }]}>{title}</Text>
  </Pressable>;
}

function CourseHome({ session }: { session: Session }) {
  const [access, setAccess] = useState<Access>('loading');
  const [error, setError] = useState('');
  const [signingOut, setSigningOut] = useState(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setAccess('loading'); setError('');
    try {
      // Match the website: attach purchases made with this account's email before checking access.
      await courseRequest('link-purchases', 'POST');
      const active = await checkCourseAccess();
      if (current === request.current) setAccess(active ? 'active' : 'inactive');
    } catch {
      if (current === request.current) { setAccess('error'); setError('Yhteys ei onnistunut. Tarkista verkkoyhteys ja yritä uudelleen.'); }
    }
  }, []);
  useFocusEffect(useCallback(() => { void refresh(); return () => { request.current++; }; }, [refresh]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => subscription.remove();
  }, [refresh]);
  async function signOut() {
    setSigningOut(true);
    try {
      const result = await supabase!.auth.signOut();
      if (result.error) throw result.error;
    } catch { setError('Uloskirjautuminen epäonnistui. Yritä uudelleen.'); }
    finally { setSigningOut(false); }
  }
  return <>
    <Text style={styles.eyebrow}>OMA OPISKELU</Text>
    <Text style={styles.title}>Tervetuloa{ '\n' }takaisin.</Text>
    <Text style={styles.body}>Sama tili. Sama kurssi. Mukana arjessa.</Text>
    <View style={styles.card}>
      <Text style={styles.eyebrow}>PITKÄ ENGLANTI</Text>
      <Text style={styles.heading}>Englannin abikurssi</Text>
      {access === 'loading' ? <View style={styles.row}><ActivityIndicator color="#245F49" /><Text style={styles.body}>Tarkistetaan kurssioikeutta…</Text></View>
        : <Text style={[styles.badge, access === 'active' && { color: '#245F49' }]}>{access === 'active' ? '● Kurssioikeus aktiivinen' : access === 'inactive' ? 'Ei aktiivista kurssioikeutta' : 'Yhteyden tarkistus epäonnistui'}</Text>}
      <Text style={styles.body}>{access === 'active'
        ? 'Harjoittele kielioppia, luetunymmärtämistä ja kuuntelua. Tallennetut tulokset näkyvät myös verkkopalvelussa.'
        : access === 'inactive' ? 'Tälle tilille ei löytynyt aktiivista kurssia. Jos sinulla on jo kurssi, tarkista että käytät samaa sähköpostiosoitetta kuin verkkopalvelussa.'
        : 'Kurssioikeus tarkistetaan verkkopalvelusta.'}</Text>
      {access === 'active' && <Button title="Aloita harjoittelu →" onPress={() => router.push('/exercises')} />}
      <Button title="Harjoitushistoria" secondary onPress={() => router.push('/history')} />
      <Button title="Tarkista kurssioikeus" secondary disabled={access === 'loading'} onPress={() => void refresh()} />
    </View>
    <View style={styles.note}><Text style={styles.heading}>Sama edistyminen kaikkialla.</Text><Text style={styles.body}>Valmiit harjoitukset tallentuvat samalle tilille kuin verkkopalvelussa. Historia päivittyy, kun avaat sen tai vedät näkymää alaspäin.</Text></View>
    <Text style={styles.label}>KIRJAUTUNEENA</Text><Text style={styles.body}>{session.user.email}</Text>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    <Button title={signingOut ? 'Kirjaudutaan ulos…' : 'Kirjaudu ulos'} secondary disabled={signingOut} onPress={() => void signOut()} />
  </>;
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
      const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${config.apiUrl}/reset-password` });
      if (error) throw error;
      setMessage('Jos osoitteella on tili, saat sähköpostiin linkin salasanan vaihtamiseen verkkopalvelussa.');
    } catch { setMessage('Salasanan palautus ei onnistunut. Yritä myöhemmin uudelleen.'); }
    finally { setBusy(false); }
  }
  return <>
    <Text style={styles.eyebrow}>ENGLANNIN ABIKURSSI</Text>
    <Text style={styles.title}>Oma tahti.{ '\n' }Selkeä suunta.</Text>
    <Text style={styles.body}>Kirjaudu Opiskeluakatemian tunnuksillasi. Kurssioikeutesi kulkee mukanasi.</Text>
    <View style={styles.card}>
      <Text style={styles.heading}>Kirjaudu sisään</Text>
      <Text style={styles.label}>Sähköposti</Text>
      <TextInput accessibilityLabel="Sähköposti" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" placeholder="sinä@esimerkki.fi" placeholderTextColor="#78817D" editable={!busy} />
      <Text style={styles.label}>Salasana</Text>
      <TextInput accessibilityLabel="Salasana" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" placeholder="Salasanasi" placeholderTextColor="#78817D" editable={!busy} onSubmitEditing={() => { if (!busy && email.trim() && password) void login(); }} />
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
      <Button title={busy ? 'Hetkinen…' : 'Kirjaudu sisään →'} disabled={busy || !email.trim() || !password} onPress={() => void login()} />
      <Button title="Unohditko salasanasi?" secondary disabled={busy} onPress={() => void resetPassword()} />
    </View>
    <Text style={styles.footer}>Ensimmäinen mobiiliversio tukee olemassa olevia sähköposti- ja salasanatilejä. Google-kirjautuminen lisätään myöhemmin.</Text>
  </>;
}

export default function App() {
  const { session, loading } = useSession();
  return <SafeAreaProvider><SafeAreaView style={styles.safe}><StatusBar style="dark" />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}><View style={styles.mark}><Text style={styles.markText}>o.</Text></View><Text style={styles.brandText}>opiskeluakatemia</Text></View>
        {!isConfigured ? <View style={styles.card}><Text style={styles.heading}>Yhteys odottaa määritystä</Text><Text style={styles.body}>Lisää projektin .env.local-tiedostoon README-ohjeen mukaiset julkiset yhteysasetukset ja käynnistä sovellus uudelleen.</Text></View>
          : loading ? <ActivityIndicator accessibilityLabel="Ladataan tiliä" color="#245F49" size="large" />
          : session ? <CourseHome key={session.user.id} session={session} /> : <Login />}
        <Text style={styles.footer}>OPISKELUAKATEMIA · MOBIILI</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView></SafeAreaProvider>;
}
export const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3ED' },
  content: { padding: 24, paddingBottom: 40, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center', flexGrow: 1 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26, marginTop: 8 },
  mark: { width: 36, height: 36, backgroundColor: '#245F49', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#FFF', fontSize: 26, fontWeight: '700', lineHeight: 30 },
  brandText: { fontSize: 19, fontWeight: '700', color: '#192C27', letterSpacing: -0.6 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#587165', fontWeight: '700' },
  title: { fontSize: 45, lineHeight: 49, letterSpacing: -1.8, fontWeight: '700', color: '#192C27' },
  body: { fontSize: 16, lineHeight: 25, color: '#58655F' },
  card: { padding: 24, borderRadius: 24, backgroundColor: '#FFF', gap: 16, borderColor: '#E2E6DD', borderWidth: 1, marginTop: 6 },
  heading: { fontSize: 22, lineHeight: 28, fontWeight: '600', color: '#192C27', letterSpacing: -0.5 },
  label: { fontSize: 13, fontWeight: '600', color: '#43564C' },
  input: { borderWidth: 1, borderColor: '#D7DED5', backgroundColor: '#FAFBF8', borderRadius: 12, padding: 15, fontSize: 16, color: '#192C27', minHeight: 52 },
  button: { minHeight: 52, borderRadius: 14, backgroundColor: '#245F49', padding: 15, alignItems: 'center', justifyContent: 'center' },
  secondary: { backgroundColor: '#EDF1E9' },
  buttonText: { fontSize: 15, color: '#FFF', fontWeight: '600', textAlign: 'center' },
  error: { color: '#A13D32', fontSize: 14, lineHeight: 22 },
  message: { color: '#43564C', fontSize: 14, lineHeight: 22 },
  footer: { fontSize: 12, color: '#738076', lineHeight: 19, marginTop: 8 },
  note: { gap: 10, padding: 20, backgroundColor: '#E9EDDE', borderRadius: 18 },
  badge: { fontSize: 14, color: '#795D30', fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
});
