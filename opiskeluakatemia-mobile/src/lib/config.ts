import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isAllowedOrigin, PRODUCTION_ORIGIN, resolveApiOrigin } from './api-origin';
const supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
const apiUrl = resolveApiOrigin(process.env.EXPO_PUBLIC_API_URL ?? '', Constants.expoConfig?.hostUri, __DEV__, Platform.OS);
export const config = {
  // Release builds refuse non-HTTPS endpoints so tokens never travel in plain text.
  supabaseUrl: isAllowedOrigin(supabaseUrl, __DEV__) ? supabaseUrl : '',
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  apiUrl,
  // Password reset and legal pages always use a public HTTPS website, never a LAN address.
  siteUrl: apiUrl.startsWith('https://') ? apiUrl : PRODUCTION_ORIGIN,
};
export const legalLinks = {
  privacy: `${PRODUCTION_ORIGIN}/tietosuojakaytanto`,
  terms: `${PRODUCTION_ORIGIN}/kayttoehdot`,
};
export const supportEmail = 'support@opiskeluakatemia.fi';
export const isConfigured = Boolean(config.supabaseUrl && config.supabaseKey && config.apiUrl);
