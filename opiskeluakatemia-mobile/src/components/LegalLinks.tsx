import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button } from './ui';
import { config, legalLinks } from '../lib/config';
import { PRODUCTION_ORIGIN } from '../lib/api-origin';
import { safeExternalUrl } from '../lib/external-links';
import { space } from '../theme';

const allowedOrigins = [...new Set([PRODUCTION_ORIGIN, config.siteUrl].filter(origin => origin.startsWith('https://')))];

/** Opens an allow-listed website page or support e-mail; any other URL is refused. */
export function openExternal(raw: string) {
  const url = safeExternalUrl(raw, allowedOrigins);
  if (!url) {
    Alert.alert('Linkkiä ei voitu avata', 'Sovellus avaa vain Opiskeluakatemian omia sivuja.');
    return;
  }
  void Linking.openURL(url).catch(() => Alert.alert('Linkin avaus epäonnistui', url.startsWith('mailto:') ? `Lähetä viesti osoitteeseen ${url.slice(7).split('?')[0]}.` : url));
}

export function LegalLinks() {
  return <View style={styles.row}>
    <Button title="Tietosuojakäytäntö" secondary style={styles.item} accessibilityRole="link" accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.privacy)} />
    <Button title="Käyttöehdot" secondary style={styles.item} accessibilityRole="link" accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.terms)} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { flexGrow: 1, flexBasis: 170 },
});
