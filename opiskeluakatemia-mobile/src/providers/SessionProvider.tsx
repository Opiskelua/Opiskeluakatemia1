import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { isConfigured } from '../lib/config';
import { clearPathCache } from '../lib/path-v2';

const Context = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isConfigured);
  useEffect(() => {
    if (!supabase) return;
    let mounted = true; let changed = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, value) => {
      changed = true;
      // The cached Polku belongs to the previous account.
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') clearPathCache();
      if (mounted) { setSession(value); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !changed) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (mounted) setLoading(false); });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') supabase!.auth.startAutoRefresh(); else supabase!.auth.stopAutoRefresh();
    });
    return () => { mounted = false; subscription.unsubscribe(); listener.remove(); supabase!.auth.stopAutoRefresh(); };
  }, []);
  return <Context.Provider value={{ session, loading }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
