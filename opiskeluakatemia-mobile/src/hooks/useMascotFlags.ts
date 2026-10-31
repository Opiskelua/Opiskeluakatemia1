import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COURSE_IDS, type CourseId } from '../lib/courses';
import { introDismissedKey } from '../lib/mascot';

// Device-local mascot flags (spec: mascot.introDismissed, mascot.greetedOn, daily big-celebration
// count). Kept in AsyncStorage like the theme setting; a shared in-memory copy keeps the home card
// and the Polku screens in sync without re-reading storage. The intro flag is per course (each
// course has its own first lesson); the greeting and the celebration cap are per device.

export interface MascotFlags {
  introDismissed: Record<CourseId, boolean>;
  /** Helsinki date (YYYY-MM-DD) of the last daily greeting. */
  greetedOn: string | null;
  /** Big celebrations (unitCompleted / levelUp) shown on `date`. */
  celebrations: { date: string; count: number };
}

const KEYS = { greetedOn: 'mascot.greetedOn', celebrations: 'mascot.bigCelebrations' } as const;

let flags: MascotFlags = { introDismissed: { en: false, sv: false }, greetedOn: null, celebrations: { date: '', count: 0 } };
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
  loading ??= AsyncStorage.multiGet([...COURSE_IDS.map(introDismissedKey), ...Object.values(KEYS)]).then(entries => {
    const read = Object.fromEntries(entries);
    const introDismissed = { ...flags.introDismissed };
    for (const id of COURSE_IDS) introDismissed[id] = read[introDismissedKey(id)] === '1' || flags.introDismissed[id];
    flags = {
      introDismissed,
      greetedOn: flags.greetedOn ?? read[KEYS.greetedOn] ?? null,
      celebrations: flags.celebrations.date ? flags.celebrations : parseCelebrations(read[KEYS.celebrations] ?? null),
    };
  }).catch(() => undefined).finally(() => { loaded = true; emit(); });
  return loading;
}

function update(next: Partial<MascotFlags>, writes: [string, string][]) {
  flags = { ...flags, ...next };
  emit();
  AsyncStorage.multiSet(writes).catch(() => undefined);
}

export const dismissIntro = (course: CourseId) => update({ introDismissed: { ...flags.introDismissed, [course]: true } }, [[introDismissedKey(course), '1']]);
export const markGreeted = (date: string) => { if (flags.greetedOn !== date) update({ greetedOn: date }, [[KEYS.greetedOn, date]]); };
export const celebrationsOn = (date: string) => (flags.celebrations.date === date ? flags.celebrations.count : 0);
export const addCelebration = (date: string) => {
  const celebrations = { date, count: celebrationsOn(date) + 1 };
  update({ celebrations }, [[KEYS.celebrations, JSON.stringify(celebrations)]]);
};

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
