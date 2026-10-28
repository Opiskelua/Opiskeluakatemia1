import { Alert, Linking, View } from 'react-native';
import { Button, styles } from '../../App';
import { legalLinks } from '../lib/config';

export function openExternal(url: string) {
  void Linking.openURL(url).catch(() => Alert.alert('Linkin avaus epäonnistui', url));
}

export function LegalLinks() {
  return <View style={styles.chipRow}>
    <Button title="Tietosuojakäytäntö" secondary onPress={() => openExternal(legalLinks.privacy)} />
    <Button title="Käyttöehdot" secondary onPress={() => openExternal(legalLinks.terms)} />
  </View>;
}
