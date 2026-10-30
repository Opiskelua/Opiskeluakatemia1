import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Device-local mascot flags (spec: mascot.introDismissed, mascot.greetedOn, daily big-celebration
// count). Kept in AsyncStorage like the theme setting; a shared in-memory copy keeps the home card
// and the Polku screens in sync without re-reading storage.

export interface MascotFlags {
  introDismissed: boolean;
  /** Helsinki date (YYYY-MM-DD) of the last daily greeting. */
  greetedOn: string | null;
  /** Big celebrations (unitCompleted / levelUp) shown on `date`. */
  celebrations: { date: string; count: number };
}

const KEYS = { introDismissed: 'mascot.introDismissed', greetedOn: 'mascot.greetedOn', celebrations: 'mascot.bigCelebrations' } as const;

let flags: MascotFlags = { introDismissed: false, greetedOn: null, celebrations: { date: '', count: 0 } };
let loaded = false;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach(listener => listener());

function parseCelebrations(raw: string | null): MascotFlags['celebrations'] {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (value && typeof value.date === 'string' && Number.isInteger(value.count)) return { date: value.date, count: Math.max(0, value.count) };
  } catch { /* Corrupt value: start over. */ }
  return { date: '', count: 0 };
}

function load() {
  loading ??= AsyncStorage.multiGet(Object.values(KEYS)).then(entries => {
    const read = Object.fromEntries(entries);
    flags = {
      introDismissed: read[KEYS.introDismissed] === '1' || flags.introDismissed,
      greetedOn: flags.greetedOn ?? read[KEYS.greetedOn] ?? null,
      celebrations: flags.celebrations.date ? flags.celebrations : parseCelebrations(read[KEYS.celebrations] ?? null),
    };
  }).catch(() => undefined).finally(() => { loaded = true; emit(); });
  return loading;
}

function update(next: Partial<MascotFlags>) {
  flags = { ...flags, ...next };
  emit();
  const writes: [string, string][] = [];
  if (next.introDismissed !== undefined) writes.push([KEYS.introDismissed, next.introDismissed ? '1' : '0']);
  if (next.greetedOn) writes.push([KEYS.greetedOn, next.greetedOn]);
  if (next.celebrations) writes.push([KEYS.celebrations, JSON.stringify(next.celebrations)]);
  if (writes.length) AsyncStorage.multiSet(writes).catch(() => undefined);
}

export const dismissIntro = () => update({ introDismissed: true });
export const markGreeted = (date: string) => { if (flags.greetedOn !== date) update({ greetedOn: date }); };
export const celebrationsOn = (date: string) => (flags.celebrations.date === date ? flags.celebrations.count : 0);
export const addCelebration = (date: string) => update({ celebrations: { date, count: celebrationsOn(date) + 1 } });

/** Current flags; `ready` is false until storage has been read once. */
export function useMascotFlags() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick(n => n + 1);
    listeners.add(listener);
    if (!loaded) void load();
    return () => { listeners.delete(listener); };
  }, []);
  return { ready: loaded, ...flags };
}
