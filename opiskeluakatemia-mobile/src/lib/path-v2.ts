import { apiRequest, errorCode, RequestError } from './api';
import { config } from './config';
import {
  PATH_V2_VERSION, type Answers, type LessonMutationResponseV2, type PathStateV2, type ReviewSessionV2, type ReviewSubmitResponseV2,
  type TargetRequestV2, type TargetResponseV2,
} from './path-v2-types';
import { pathFailure } from './path-v2-model';

/**
 * Development-only switch: with EXPO_PUBLIC_PATH_PREVIEW=1 in a development build, the Polku
 * screens use the website's unauthenticated in-memory preview API (/api/abikurssi/path-preview,
 * which itself returns 404 outside `next dev`). `__DEV__` is false in release bundles, so this
 * constant folds to false there and the preview branch is removed by the minifier.
 */
export const PATH_PREVIEW = __DEV__ && process.env.EXPO_PUBLIC_PATH_PREVIEW === '1';
export type PreviewScenario = 'fresh' | 'midway' | 'complete';

const PREVIEW_USER = 'mobile';

// Mirrors apiRequest's user-facing error mapping, without a session or token.
async function previewRequest(path: string, options: { method?: string; body?: unknown }): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const separator = path.includes('?') ? '&' : '?';
    const response = await fetch(`${config.apiUrl}${path}${separator}user=${PREVIEW_USER}`, {
      method: options.method ?? 'GET',
      headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    if (!response.ok) throw new RequestError(`Esikatselu: HTTP ${response.status}`, response.status, await errorCode(response));
    return await response.json();
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new Error('Esikatselupalvelimeen ei saatu yhteyttä (npx next dev -p 3600).');
  } finally { clearTimeout(timeout); }
}

function request(path: string, options: { method?: string; body?: unknown; scenario?: PreviewScenario } = {}) {
  if (__DEV__ && PATH_PREVIEW) {
    const previewPath = path.replace('/api/abikurssi/path', '/api/abikurssi/path-preview');
    return previewRequest(options.scenario ? `${previewPath}?scenario=${options.scenario}` : previewPath, options);
  }
  return apiRequest(path, { method: options.method, body: options.body });
}

function expectObject<T>(value: unknown, key: string): T {
  if (typeof value !== 'object' || value === null || !(key in value)) throw new Error('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.');
  return value as T;
}

/**
 * In-memory copy of the last loaded path (~57 KB), so opening a lesson from the map does not
 * download it again. Only `loadPathCached` reads it; `loadPath` always fetches and refreshes it.
 * Any lesson save/submit, review submit or target save drops it, as does a sign-in change (clearPathCache).
 */
export const PATH_CACHE_TTL_MS = 60_000;
let cached: { state: PathStateV2; at: number } | null = null;
let generation = 0;
export function clearPathCache() { cached = null; generation++; }

export async function loadPath(scenario?: PreviewScenario) {
  // A preview scenario resets the preview user on the server, so any cached copy is stale.
  if (scenario) clearPathCache();
  const started = generation;
  const state = expectObject<PathStateV2>(await request('/api/abikurssi/path', { scenario }), 'content');
  if (!Array.isArray(state.content?.units) || !state.level || !state.progress) throw new Error('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.');
  // Skip caching a response that raced with a mutation or sign-out started after this request.
  if (started === generation) cached = { state, at: Date.now() };
  return state;
}

/** The cached path when it is younger than PATH_CACHE_TTL_MS, otherwise a fresh load. */
export async function loadPathCached() {
  if (cached && Date.now() - cached.at >= 0 && Date.now() - cached.at < PATH_CACHE_TTL_MS) return cached.state;
  return loadPath();
}

export async function saveLesson(action: 'save' | 'submit', lessonId: string, answers: Answers, revision: number) {
  clearPathCache();
  try {
    return expectObject<LessonMutationResponseV2>(await request('/api/abikurssi/path', {
      method: 'POST', body: { action, version: PATH_V2_VERSION, lessonId, answers, revision },
    }), 'summary');
  } finally { clearPathCache(); }
}

export async function loadReview() {
  const session = expectObject<ReviewSessionV2>(await request('/api/abikurssi/path/review'), 'items');
  if (!Array.isArray(session.items)) throw new Error('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.');
  return session;
}

export async function submitReview(answers: Answers, revision: number) {
  clearPathCache();
  try {
    return expectObject<ReviewSubmitResponseV2>(await request('/api/abikurssi/path/review', {
      method: 'POST', body: { version: PATH_V2_VERSION, revision, answers },
    }), 'result');
  } finally { clearPathCache(); }
}

/**
 * POST /path/target (preview: /path-preview/target). On a 409 the target was changed in another
 * session: reload the path once, take its targetRevision and retry, like the lesson save does.
 * Drops the path cache before and after, like every other mutation.
 */
export async function saveTarget(body: TargetRequestV2): Promise<TargetResponseV2> {
  clearPathCache();
  try {
    let revision = body.revision;
    for (let attempt = 0; ; attempt++) {
      try {
        return expectObject<TargetResponseV2>(await request('/api/abikurssi/path/target', { method: 'POST', body: { ...body, revision } }), 'summary');
      } catch (error) {
        if (attempt === 0 && error instanceof RequestError && pathFailure(error.status, error.code) === 'conflict') {
          const fresh = await loadPath();
          revision = fresh.targetRevision ?? 0;
          continue;
        }
        throw error;
      }
    }
  } finally { clearPathCache(); }
}
