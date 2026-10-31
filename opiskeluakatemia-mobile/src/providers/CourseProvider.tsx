import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from './SessionProvider';
import {
  COURSE_STORAGE_KEY, COURSES, courseSelectionStep, DEFAULT_COURSE, INITIAL_SELECTION, parseStoredCourse, resolveCourse, UNKNOWN_OWNERSHIP,
  type Course, type CourseId, type CourseOwnership, type CourseSelectionAction,
} from '../lib/courses';

interface CourseContextValue {
  /** The course every course-aware screen loads (Polku, theory). */
  course: CourseId;
  info: Course;
  /** Last server-checked access per course; null until known. */
  owned: CourseOwnership;
  /** The home switcher: remember the student's choice on this device. */
  choose: (course: CourseId) => void;
  /** The home screen reports the access checks that succeeded, for the signed-in user they were made for. */
  reportAccess: (userId: string, results: Partial<Record<CourseId, boolean>>) => void;
}

const CourseContext = createContext<CourseContextValue | null>(null);

function persist(value: CourseId | null) {
  // A failed write only means the next launch starts from the first owned course.
  try {
    (value ? AsyncStorage.setItem(COURSE_STORAGE_KEY, value) : AsyncStorage.removeItem(COURSE_STORAGE_KEY)).catch(() => undefined);
  } catch { /* Storage unavailable. */ }
}

/**
 * Holds the selected course. It starts from the course remembered on this device (key
 * 'oa.course.v1') and falls back to the first owned course once access is known, so a stored
 * Swedish choice never shows a locked screen to someone without Swedish access. Signing out (or
 * another account) forgets both the choice and the access results. Every change goes through
 * courseSelectionStep (src/lib/courses.ts, unit-tested) against the latest state and user.
 */
export function CourseProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [selection, setSelection] = useState(INITIAL_SELECTION);
  const latest = useRef(INITIAL_SELECTION);
  const signedIn = useRef<string | null>(null);

  const dispatch = useCallback((action?: CourseSelectionAction) => {
    const { state, write } = courseSelectionStep(latest.current, signedIn.current, action);
    if (write !== undefined) persist(write);
    if (state === latest.current) return;
    latest.current = state;
    setSelection(state);
  }, []);

  useEffect(() => {
    signedIn.current = userId;
    dispatch();
  }, [userId, dispatch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let stored: CourseId | null = null;
      try { stored = parseStoredCourse(await AsyncStorage.getItem(COURSE_STORAGE_KEY)); } catch { /* Nothing remembered: the first owned course is used. */ }
      if (!cancelled) dispatch({ type: 'loaded', course: stored });
    })();
    return () => { cancelled = true; };
  }, [dispatch]);

  // The render between an account change and the effect above already shows the reset state
  // (the step is pure; its storage write happens in the effect).
  const current = courseSelectionStep(selection, userId).state;
  const course = resolveCourse(current.preferred, current.owned);
  const owned = current.owned;
  const choose = useCallback((next: CourseId) => dispatch({ type: 'chosen', course: next }), [dispatch]);
  const reportAccess = useCallback((user: string, results: Partial<Record<CourseId, boolean>>) => dispatch({ type: 'access', userId: user, results }), [dispatch]);

  const value = useMemo(() => ({ course, info: COURSES[course], owned, choose, reportAccess }), [course, owned, choose, reportAccess]);
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

const fallback: CourseContextValue = { course: DEFAULT_COURSE, info: COURSES[DEFAULT_COURSE], owned: UNKNOWN_OWNERSHIP, choose: () => undefined, reportAccess: () => undefined };

/** The selected course; English outside the provider (the root error boundary). */
export const useCourse = () => useContext(CourseContext) ?? fallback;
