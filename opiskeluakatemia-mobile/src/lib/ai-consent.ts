import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';

const KEY = 'oa.aiGradingConsent.v1';
const TITLE = 'Tekoälyarviointi';
const MESSAGE = 'Kirjoitelmat ja avoimet vastaukset arvioidaan tekoälyllä. Arviointia varten tekstisi lähetetään Opiskeluakatemian palvelimen kautta Googlen Gemini-palveluun. Älä kirjoita vastauksiin henkilötietoja. Lisätietoja tietosuojakäytännössä.';

/**
 * App Store guideline 5.1.2(i): ask before personal content is sent to a third-party AI service.
 * The answer is remembered on this device; declining keeps the text unsent.
 */
export async function ensureAiConsent(): Promise<boolean> {
  try { if (await AsyncStorage.getItem(KEY) === 'yes') return true; } catch { /* Ask again below. */ }
  const accepted = Platform.OS === 'web'
    ? Boolean(globalThis.confirm?.(`${TITLE}\n\n${MESSAGE}`))
    : await new Promise<boolean>(resolve => Alert.alert(TITLE, MESSAGE, [
      { text: 'Peruuta', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Hyväksyn', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) }));
  if (accepted) await AsyncStorage.setItem(KEY, 'yes').catch(() => undefined);
  return accepted;
}
