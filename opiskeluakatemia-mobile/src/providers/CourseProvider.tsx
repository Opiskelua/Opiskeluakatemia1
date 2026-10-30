import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSession } from './SessionProvider';
import {
  COURSE_STORAGE_KEY, COURSES, DEFAULT_COURSE, mergeOwnership, parseStoredCourse, resolveCourse, UNKNOWN_OWNERSHIP,
  type Course, type CourseId, type CourseOwnership,
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

function remember(value: CourseId | null) {
  // A failed write only means the next launch starts from the first owned course.
  try {
    (value ? AsyncStorage.setItem(COURSE_STORAGE_KEY, value) : AsyncStorage.removeItem(COURSE_STORAGE_KEY)).catch(() => undefined);
  } catch { /* Storage unavailable. */ }
}

/**
 * Holds the selected course. It starts from the course remembered on this device (key
 * 'oa.course.v1') and falls back to the first owned course once access is known, so a stored
 * Swedish choice never shows a locked screen to someone without Swedish access. Signing out (or
 * another account) forgets both the choice and the access results.
 */
export function CourseProvider({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const userId = session?.user.id ?? null;
  const [preferred, setPreferred] = useState<CourseId | null>(null);
  const [owned, setOwned] = useState<CourseOwnership>(UNKNOWN_OWNERSHIP);
  const stored = useRef<CourseId | null>(null);
  const currentUser = useRef(userId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const value = parseStoredCourse(await AsyncStorage.getItem(COURSE_STORAGE_KEY));
        // A choice made (or remembered) while storage was being read wins.
        if (cancelled || !value || stored.current !== null) return;
        stored.current = value;
        setPreferred(current => current ?? value);
      } catch { /* Nothing remembered: the first owned course is used. */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Sign-out or another account: the remembered course and access belong to the previous one.
  useEffect(() => {
    const previous = currentUser.current;
    currentUser.current = userId;
    if (previous === null || previous === userId) return;
    setPreferred(null);
    setOwned(UNKNOWN_OWNERSHIP);
    stored.current = null;
    remember(null);
  }, [userId]);

  const course = resolveCourse(preferred, owned);

  // Remember the course in use once access confirms it, so the next launch opens it directly
  // (a Swedish-only owner does not start from English every time).
  useEffect(() => {
    if (!userId || owned[course] !== true || stored.current === course) return;
    stored.current = course;
    remember(course);
  }, [userId, course, owned]);

  const choose = useCallback((next: CourseId) => {
    setPreferred(next);
    stored.current = next;
    remember(next);
  }, []);

  const reportAccess = useCallback((user: string, results: Partial<Record<CourseId, boolean>>) => {
    if (user !== currentUser.current) return;
    setOwned(previous => mergeOwnership(previous, results));
  }, []);

  const value = useMemo(() => ({ course, info: COURSES[course], owned, choose, reportAccess }), [course, owned, choose, reportAccess]);
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>;
}

const fallback: CourseContextValue = { course: DEFAULT_COURSE, info: COURSES[DEFAULT_COURSE], owned: UNKNOWN_OWNERSHIP, choose: () => undefined, reportAccess: () => undefined };

/** The selected course; English outside the provider (the root error boundary). */
export const useCourse = () => useContext(CourseContext) ?? fallback;
