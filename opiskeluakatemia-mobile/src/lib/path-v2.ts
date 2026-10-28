import { apiRequest, RequestError } from './api';
import { config } from './config';
import {
  PATH_V2_VERSION, type Answers, type LessonMutationResponseV2, type PathStateV2, type ReviewSessionV2, type ReviewSubmitResponseV2,
} from './path-v2-types';

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
    if (!response.ok) throw new RequestError(`Esikatselu: HTTP ${response.status}`, response.status);
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

export async function loadPath(scenario?: PreviewScenario) {
  const state = expectObject<PathStateV2>(await request('/api/abikurssi/path', { scenario }), 'content');
  if (!Array.isArray(state.content?.units) || !state.level || !state.progress) throw new Error('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.');
  return state;
}

export async function saveLesson(action: 'save' | 'submit', lessonId: string, answers: Answers, revision: number) {
  return expectObject<LessonMutationResponseV2>(await request('/api/abikurssi/path', {
    method: 'POST', body: { action, version: PATH_V2_VERSION, lessonId, answers, revision },
  }), 'summary');
}

export async function loadReview() {
  const session = expectObject<ReviewSessionV2>(await request('/api/abikurssi/path/review'), 'items');
  if (!Array.isArray(session.items)) throw new Error('Palvelimen vastausta ei voitu lukea. Yritä uudelleen.');
  return session;
}

export async function submitReview(answers: Answers, revision: number) {
  return expectObject<ReviewSubmitResponseV2>(await request('/api/abikurssi/path/review', {
    method: 'POST', body: { version: PATH_V2_VERSION, revision, answers },
  }), 'result');
}
