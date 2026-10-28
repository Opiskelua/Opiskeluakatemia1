import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { config, isConfigured } from './config';
import { sessionStorage } from './session-storage';

// Only the public anon key belongs in the app. Privileged keys stay on the server.
// The session (access + refresh token) is kept in the Keychain / Keystore, not plain AsyncStorage.
export const supabase = isConfigured ? createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { storage: sessionStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
