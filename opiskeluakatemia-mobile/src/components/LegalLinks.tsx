import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './ui';
import { config, legalLinks } from '../lib/config';
import { PRODUCTION_ORIGIN } from '../lib/api-origin';
import { safeExternalUrl } from '../lib/external-links';
import { space, useTheme } from '../theme';

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

/** `compact`: small text links (sign-in screen); default: full-width secondary buttons (settings). */
export function LegalLinks({ compact = false }: { compact?: boolean }) {
  const { type } = useTheme();
  if (compact) {
    const link = (title: string, url: string) => <Pressable key={title} onPress={() => openExternal(url)} hitSlop={10} accessibilityRole="link" accessibilityHint="Avautuu selaimessa" style={styles.textLink}>
      <Text style={[type.caption, styles.underline]}>{title}</Text>
    </Pressable>;
    return <View style={styles.compactRow}>
      {link('Tietosuojakäytäntö', legalLinks.privacy)}
      <Text style={type.caption} accessible={false}>·</Text>
      {link('Käyttöehdot', legalLinks.terms)}
    </View>;
  }
  return <View style={styles.row}>
    <Button title="Tietosuojakäytäntö" secondary style={styles.item} accessibilityRole="link" accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.privacy)} />
    <Button title="Käyttöehdot" secondary style={styles.item} accessibilityRole="link" accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.terms)} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { flexGrow: 1, flexBasis: 170 },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  textLink: { minHeight: 32, justifyContent: 'center' },
  underline: { textDecorationLine: 'underline' },
});
