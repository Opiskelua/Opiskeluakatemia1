import { useState } from 'react';
import { Alert, Platform, Text, TextInput, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Button, styles } from '../../App';
import { useSession } from '../providers/SessionProvider';
import { supabase } from '../lib/supabase';
import { deleteAccount, RequestError } from '../lib/api';
import { supportEmail } from '../lib/config';
import { LegalLinks, openExternal } from '../components/LegalLinks';
import { colors } from '../theme';

const CONFIRM_WORD = 'POISTA';

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
    <Text style={styles.kicker}>Tili</Text>
    <Text style={styles.title}>Asetukset</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Kirjautuneena</Text>
      <Text style={styles.body}>{session?.user.email ?? '—'}</Text>
      <Button title={busy && !deleting ? 'Hetkinen…' : 'Kirjaudu ulos'} secondary disabled={busy} onPress={() => void signOut()} />
    </View>

    <View style={styles.card}>
      <Text style={styles.heading}>Tietosuoja ja ehdot</Text>
      <Text style={styles.body}>Lue, miten käsittelemme tietojasi ja millä ehdoilla palvelua käytetään.</Text>
      <LegalLinks />
      <Button title={`Ota yhteyttä: ${supportEmail}`} secondary onPress={() => openExternal(`mailto:${supportEmail}`)} />
    </View>

    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}

    <View style={[styles.card, { borderWidth: 1, borderColor: colors.danger }]}>
      <Text style={styles.heading}>Poista tili</Text>
      <Text style={styles.body}>Tilin poistaminen poistaa pysyvästi kirjautumistietosi sekä harjoitushistoriasi, kirjoitelmasi, muistikorttisi ja edistymistietosi. Poisto koskee sekä sovellusta että verkkopalvelua, ja tiliin liitetty kurssioikeus poistuu samalla. Poistoa ei voi perua.</Text>
      {!deleting ? <Button title="Poista tili…" secondary disabled={busy} onPress={() => { setDeleting(true); setError(''); }} /> : <>
        <Text style={styles.label}>Salasana</Text>
        <TextInput accessibilityLabel="Salasana tilin poiston vahvistamiseen" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" placeholder="Nykyinen salasanasi" placeholderTextColor="#A1A1A6" editable={!busy} />
        <Text style={styles.label}>Kirjoita {CONFIRM_WORD} vahvistaaksesi</Text>
        <TextInput accessibilityLabel={`Kirjoita ${CONFIRM_WORD} vahvistaaksesi`} style={styles.input} value={confirmation} onChangeText={setConfirmation} autoCapitalize="characters" autoCorrect={false} placeholder={CONFIRM_WORD} placeholderTextColor="#A1A1A6" editable={!busy} />
        <Button title={busy ? 'Poistetaan…' : 'Poista tili pysyvästi'} disabled={!ready || busy} onPress={confirmRemove} />
        <Button title="Peruuta" secondary disabled={busy} onPress={() => { setDeleting(false); setPassword(''); setConfirmation(''); setError(''); }} />
      </>}
    </View>
  </Screen>;
}
