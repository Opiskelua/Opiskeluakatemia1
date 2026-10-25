import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config, isConfigured } from './config';

// Only the public anon key belongs in the app. Privileged keys stay on the server.
export const supabase = isConfigured ? createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { storage: AsyncStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
