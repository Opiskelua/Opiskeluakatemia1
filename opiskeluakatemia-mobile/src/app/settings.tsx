import { useState } from 'react';
import { Alert, Platform, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, Card, Field, Notice, OptionGroup, PageHeader, SectionTitle } from '../components/ui';
import { useSession } from '../providers/SessionProvider';
import { supabase } from '../lib/supabase';
import { deleteAccount, RequestError } from '../lib/api';
import { supportEmail } from '../lib/config';
import { LegalLinks, openExternal } from '../components/LegalLinks';
import { useTheme, type ThemePreference } from '../theme';

const CONFIRM_WORD = 'POISTA';

const appearanceOptions: { value: ThemePreference; label: string; icon: string }[] = [
  { value: 'system', label: 'Järjestelmä', icon: '◐' },
  { value: 'light', label: 'Vaalea', icon: '☀\uFE0E' },
  { value: 'dark', label: 'Tumma', icon: '☾' },
];

function deletionError(cause: unknown) {
  if (cause instanceof RequestError) {
    if (cause.status === 422) return 'Salasana on väärin. Tiliä ei poistettu.';
    if (cause.status === 409) return `Tilin poistoa ei voitu tehdä automaattisesti, koska tilillä on voimassa oleva tilaus. Ota yhteyttä: ${supportEmail}.`;
    if (cause.status === 429) return 'Liian monta yritystä. Odota hetki ja yritä uudelleen.';
    if (cause.status === 401) return 'Istunto on vanhentunut. Kirjaudu uudelleen ja yritä sitten uudelleen.';
    if (cause.status === 400) return 'Vahvistus puuttuu. Tiliä ei poistettu.';
    if (cause.status === 403) return 'Kirjaudu uudelleen ennen tilin poistamista. Tiliä ei poistettu.';
    if (cause.status >= 500) return `Tilin poisto ei juuri nyt onnistunut. Yritä myöhemmin uudelleen tai ota yhteyttä: ${supportEmail}.`;
  }
  return cause instanceof Error ? `${cause.message} Tiliä ei poistettu.` : 'Tilin poisto epäonnistui. Tiliä ei poistettu.';
}

export default function Settings() {
  const { session } = useSession();
  const { colors, type, preference, setPreference } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const ready = !!password && confirmation.trim().toUpperCase() === CONFIRM_WORD;

  async function signOut() {
    setBusy(true); setError('');
    try {
      const result = await supabase!.auth.signOut({ scope: 'local' });
      if (result.error) throw result.error;
    } catch { setError('Uloskirjautuminen epäonnistui. Yritä uudelleen.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setError('');
    try {
      await deleteAccount(password);
      setPassword('');
      // The server has removed the account; clearing the local session returns to the sign-in screen.
      await supabase!.auth.signOut({ scope: 'local' }).catch(() => undefined);
      Alert.alert('Tili poistettu', 'Tilisi ja siihen liittyvät tiedot on poistettu pysyvästi.');
    } catch (cause) {
      setError(deletionError(cause));
      setBusy(false);
    }
  }

  function confirmRemove() {
    if (!ready || busy) return;
    const message = 'Tiliäsi ja sen tietoja ei voi palauttaa. Haluatko varmasti poistaa tilin pysyvästi?';
    if (Platform.OS === 'web') { if (globalThis.confirm?.(message)) void remove(); return; }
    Alert.alert('Poistetaanko tili pysyvästi?', message, [
      { text: 'Peruuta', style: 'cancel' },
      { text: 'Poista tili', style: 'destructive', onPress: () => void remove() },
    ]);
  }

  return <Screen>
    <PageHeader title="Asetukset" />
    <Card>
      <Text style={type.overline}>Kirjautuneena</Text>
      <Text selectable style={type.bodyStrong}>{session?.user.email ?? '—'}</Text>
      <Button title={busy && !deleting ? 'Hetkinen…' : 'Kirjaudu ulos'} secondary disabled={busy} onPress={() => void signOut()} />
    </Card>

    <SectionTitle title="Ulkoasu" detail="Järjestelmä seuraa puhelimen asetusta." />
    <OptionGroup accessibilityLabel="Ulkoasu" options={appearanceOptions} value={preference} onChange={setPreference} />

    <Card>
      <Text accessibilityRole="header" style={type.subheading}>Tietosuoja ja ehdot</Text>
      <Text style={type.body}>Lue, miten käsittelemme tietojasi ja millä ehdoilla palvelua käytetään.</Text>
      <LegalLinks />
      <Button title="Ota yhteyttä" accessibilityLabel={`Ota yhteyttä sähköpostilla: ${supportEmail}`} variant="ghost" accessibilityRole="link" accessibilityHint="Avaa sähköpostisovelluksen" onPress={() => openExternal(`mailto:${supportEmail}`)} />
      <Text selectable style={[type.caption, { textAlign: 'center' }]}>{supportEmail}</Text>
    </Card>

    {!!error && <Notice tone="error" message={error} />}

    <Card tone="danger">
      <Text accessibilityRole="header" style={[type.subheading, { color: colors.danger }]}>Poista tili</Text>
      <Text style={type.body}>Tilin poistaminen poistaa pysyvästi kirjautumistietosi sekä harjoitushistoriasi, kirjoitelmasi, muistikorttisi ja edistymistietosi. Poisto koskee sekä sovellusta että verkkopalvelua, ja tiliin liitetty kurssioikeus poistuu samalla. Poistoa ei voi perua.</Text>
      {!deleting ? <Button title="Poista tili…" secondary disabled={busy} onPress={() => { setDeleting(true); setError(''); }} /> : <>
        <Field label="Salasana" accessibilityLabel="Salasana tilin poiston vahvistamiseen" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" textContentType="password" placeholder="Nykyinen salasanasi" editable={!busy} />
        <Field label={`Kirjoita ${CONFIRM_WORD} vahvistaaksesi`} value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} placeholder={CONFIRM_WORD} editable={!busy} />
        <Button title={busy ? 'Poistetaan…' : 'Poista tili pysyvästi'} variant="destructive" loading={busy} disabled={!ready} onPress={confirmRemove} />
        <Button title="Peruuta" secondary disabled={busy} onPress={() => { setDeleting(false); setPassword(''); setConfirmation(''); setError(''); }} />
      </>}
    </Card>
  </Screen>;
}
