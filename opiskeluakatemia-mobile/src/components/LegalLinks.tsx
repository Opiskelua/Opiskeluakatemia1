import { Alert, Linking, StyleSheet, View } from 'react-native';
import { Button } from './ui';
import { legalLinks } from '../lib/config';
import { space } from '../theme';

export function openExternal(url: string) {
  void Linking.openURL(url).catch(() => Alert.alert('Linkin avaus epäonnistui', url));
}

export function LegalLinks() {
  return <View style={styles.row}>
    <Button title="Tietosuojakäytäntö" secondary style={styles.item} accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.privacy)} />
    <Button title="Käyttöehdot" secondary style={styles.item} accessibilityHint="Avautuu selaimessa" onPress={() => openExternal(legalLinks.terms)} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  item: { flexGrow: 1, flexBasis: 170 },
});
