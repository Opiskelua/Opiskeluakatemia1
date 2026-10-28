import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { createChunkedSecureStorage, type KeyValueStorage } from './chunked-storage';

const keychain = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
// The browser preview has no keychain; it keeps the existing AsyncStorage (localStorage) behaviour.
export const sessionStorage: KeyValueStorage = Platform.OS === 'web' ? AsyncStorage : createChunkedSecureStorage({
  getItemAsync: key => SecureStore.getItemAsync(key, keychain),
  setItemAsync: (key, value) => SecureStore.setItemAsync(key, value, keychain),
  deleteItemAsync: key => SecureStore.deleteItemAsync(key, keychain),
}, AsyncStorage);
