import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { AppState } from 'react-native';
import { RequestError } from '../lib/api';
import { loadPath, saveLesson } from '../lib/path-v2';
import { draftKey, pathFailure, sanitizeDraft, shouldAutosaveDraft } from '../lib/path-v2-model';
import type { Answers, LessonMutationResponseV2, PathStateV2, PublicItem } from '../lib/path-v2-types';

export type AutosaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export const AUTOSAVE_DELAY_MS = 600;

/**
 * Saves the lesson draft automatically, like the website's LessonPlayer: shortly after the
 * student moves to another item (debounced) and when the app leaves the foreground. A save is
 * skipped when the draft equals the one the server already has, when `enabled` is false, or while
 * a manual save/submit runs (`busy`). A stale revision (409) reloads the path once, takes the new
 * revision and saves the local answers again, as the manual save does. Saves are serialised;
 * `settle()` resolves when the current one has finished so a manual action can run after it.
 */
export function useDraftAutosave(options: {
  lessonId: string;
  items: PublicItem[];
  answers: Answers;
  index: number;
  enabled: boolean;
  /** The draft and revision the server has for this lesson (from the loaded path state). */
  savedDraft: unknown;
  revision: number;
  busy: RefObject<boolean>;
  /** A save succeeded; `current` is true when the answers have not changed since it was sent. */
  onSaved: (response: LessonMutationResponseV2, current: boolean) => void;
  /** A 409 made the hook reload the path before retrying. */
  onReload: (fresh: PathStateV2) => void;
}) {
  const latest = useRef(options);
  const { items, savedDraft, revision, index } = options;
  const savedKey = useRef(draftKey(items, savedDraft));
  const revisionRef = useRef(revision);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mounted = useRef(true);
  const [status, setStatus] = useState<AutosaveStatus>('idle');

  // Saves run from timers and AppState events, after the render that scheduled them has committed.
  useEffect(() => { latest.current = options; });
  // Follow the server state whenever the screen loads or merges a new one.
  useEffect(() => { savedKey.current = draftKey(items, savedDraft); }, [items, savedDraft]);
  useEffect(() => { revisionRef.current = revision; }, [revision]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const attempt = useCallback(async () => {
    const { lessonId, items: currentItems, answers, enabled, busy } = latest.current;
    const key = draftKey(currentItems, answers);
    if (!shouldAutosaveDraft({ enabled, busy: !!busy.current, current: key, saved: savedKey.current })) return;
    const body = sanitizeDraft(currentItems, answers);
    if (mounted.current) setStatus('saving');
    for (let tries = 0; tries < 2; tries++) {
      try {
        const response = await saveLesson('save', lessonId, body, revisionRef.current);
        savedKey.current = key;
        revisionRef.current = response.revision;
        if (!mounted.current) return;
        latest.current.onSaved(response, draftKey(latest.current.items, latest.current.answers) === key);
        setStatus('saved');
        return;
      } catch (error) {
        const failure = error instanceof RequestError ? pathFailure(error.status, error.code) : 'retry';
        if (failure !== 'conflict' || tries > 0) break;
        // Another device saved this lesson: take its revision, keep the local answers, save again.
        try {
          const fresh = await loadPath();
          revisionRef.current = fresh.progress[lessonId]?.revision ?? 0;
          if (mounted.current) latest.current.onReload(fresh);
        } catch { break; }
      }
    }
    if (mounted.current) setStatus('error');
  }, []);

  /** Runs a save now (after any save already running). */
  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const run = chain.current.then(attempt);
    chain.current = run.catch(() => undefined);
    return chain.current;
  }, [attempt]);

  const settle = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    return chain.current;
  }, []);

  // Moving between items: save shortly after the last move.
  const firstIndex = useRef(true);
  useEffect(() => {
    if (firstIndex.current) { firstIndex.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void flush(); }, AUTOSAVE_DELAY_MS);
  }, [index, flush]);

  // Leaving the app (home button, app switcher, incoming call): save right away.
  useEffect(() => {
    const listener = AppState.addEventListener('change', next => { if (next !== 'active') void flush(); });
    return () => { listener.remove(); if (timer.current) { clearTimeout(timer.current); timer.current = null; } };
  }, [flush]);

  /** Latest known revision, including one taken by an autosave the screen has not rendered yet. */
  const latestRevision = useCallback(() => revisionRef.current, []);

  return { status, flush, settle, latestRevision };
}
