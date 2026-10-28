import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

// Ignore responses from a previous screen/account and refresh on return from the website.
export function useSyncedResource<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++sequence.current;
    setLoading(true); setError('');
    try { const value = await load(); if (sequence.current === current) setData(value); }
    catch (e) { if (sequence.current === current) setError(e instanceof Error ? e.message : 'Tietoja ei voitu hakea.'); }
    finally { if (sequence.current === current) setLoading(false); }
  }, [load]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const listener = AppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { sequence.current++; listener.remove(); };
  }, [refresh]));
  useEffect(() => () => { sequence.current++; }, []);
  return { data, error, loading, refresh };
}
