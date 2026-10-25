import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveApiOrigin } from './api-origin';
export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl: resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL ?? '', Constants.expoConfig?.hostUri, __DEV__, Platform.OS),
};
export const isConfigured = Boolean(config.supabaseUrl && config.supabaseKey && config.apiUrl);
