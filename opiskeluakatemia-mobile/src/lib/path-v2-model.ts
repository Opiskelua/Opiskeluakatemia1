// Pure helpers for the Polku v2 screens (no React Native imports, unit-tested in tests/path-v2.test.cjs).
import type {
  AnswerValue, Answers, DailyGoalInfo, ItemFeedback, LessonProgressV2, LevelInfo, PathErrorCode, PathStateV2, PathSummaryV2,
  PublicItem, PublicLessonV2, PublicUnitV2, ResourceLink, SkillArea, StreakInfo,
} from './path-v2-types';

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** True when the value is a complete answer for this item (what `submit` requires). */
export function isAnswered(item: PublicItem, value: AnswerValue | undefined): boolean {
  if (value === undefined) return false;
  if (item.kind === 'choice') return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < item.options.length;
  if (item.kind === 'gap') return typeof value === 'string' && value.trim().length > 0;
  return Array.isArray(value) && value.length === item.tokens.length && isOrderPrefix(value, item.tokens.length);
}

export const answeredCount = (items: PublicItem[], answers: Answers) => items.filter(item => isAnswered(item, answers[item.id])).length;
export const allAnswered = (items: PublicItem[], answers: Answers) => items.length > 0 && answeredCount(items, answers) === items.length;
/** Index of the first unanswered item, or 0 when everything is answered. */
export function firstUnanswered(items: PublicItem[], answers: Answers) {
  const index = items.findIndex(item => !isAnswered(item, answers[item.id]));
  return index < 0 ? 0 : index;
}

/** Unique, in-range integer indices (a partial or complete ordering). */
function isOrderPrefix(value: unknown[], tokenCount: number) {
  const seen = new Set<number>();
  for (const index of value) {
    if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= tokenCount || seen.has(index)) return false;
    seen.add(index);
  }
  return true;
}

/**
 * Keep only draft values that still fit the current items (content can change between
 * releases). Partial order lists are kept; blank gap text is dropped.
 */
export function sanitizeDraft(items: PublicItem[], draft: unknown): Answers {
  const result: Answers = {};
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return result;
  const source = draft as Record<string, unknown>;
  for (const item of items) {
    const value = source[item.id];
    if (item.kind === 'choice' && typeof value === 'number' && isAnswered(item, value)) result[item.id] = value;
    else if (item.kind === 'gap' && typeof value === 'string' && value.trim()) result[item.id] = value.slice(0, item.maxLength);
    else if (item.kind === 'order' && Array.isArray(value) && value.length > 0 && value.length <= item.tokens.length && isOrderPrefix(value, item.tokens.length)) result[item.id] = [...value] as number[];
  }
  return result;
}

/** Only answered values (complete for submit or partial for a draft) are sent. */
export function answersForSubmit(items: PublicItem[], answers: Answers): Answers {
  return Object.fromEntries(items.filter(item => isAnswered(item, answers[item.id])).map(item => [item.id, answers[item.id]]));
}

// Word ordering: the answer is the list of token indices in the order the student tapped them.
export function orderAppend(current: number[] | undefined, tokenIndex: number, tokenCount: number): number[] {
  const list = current ?? [];
  if (!Number.isInteger(tokenIndex) || tokenIndex < 0 || tokenIndex >= tokenCount || list.includes(tokenIndex)) return list;
  return [...list, tokenIndex];
}
export function orderRemoveAt(current: number[] | undefined, position: number): number[] {
  const list = current ?? [];
  if (position < 0 || position >= list.length) return list;
  return list.filter((_, i) => i !== position);
}
/** Token indices not yet placed, in their scrambled display order. */
export function orderRemaining(tokens: string[], chosen: number[] | undefined): number[] {
  const used = new Set(chosen ?? []);
  return tokens.map((_, i) => i).filter(i => !used.has(i));
}
/** The sentence built so far, with the first letter capitalized for display. */
export function orderSentence(tokens: string[], chosen: number[] | undefined): string {
  const text = (chosen ?? []).map(i => tokens[i]).filter(Boolean).join(' ');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** Splits a prompt with one `___` blank. `blank` is false when the prompt has no blank. */
export function splitPrompt(prompt: string): { before: string; after: string; blank: boolean } {
  const at = prompt.indexOf('___');
  if (at < 0) return { before: prompt, after: '', blank: false };
  return { before: prompt.slice(0, at), after: prompt.slice(at + 3).replace(/^_+/, ''), blank: true };
}

/** Human-readable version of the student's own answer (for the result list). */
export function describeAnswer(item: PublicItem, value: AnswerValue | undefined): string {
  if (value === undefined) return 'Ei vastausta';
  if (item.kind === 'choice') return typeof value === 'number' && item.options[value] !== undefined ? item.options[value] : 'Ei vastausta';
  if (item.kind === 'gap') return typeof value === 'string' && value.trim() ? value.trim() : 'Ei vastausta';
  return Array.isArray(value) && value.length ? orderSentence(item.tokens, value) : 'Ei vastausta';
}

export function wrongFeedback(feedback: ItemFeedback[]) { return feedback.filter(entry => !entry.correct); }

// ---------------------------------------------------------------------------
// Progress formatting
// ---------------------------------------------------------------------------

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);
export const percent = (fraction: number) => Math.round(clamp01(fraction) * 100);

export function formatXp(xp: number) {
  const value = Number.isFinite(xp) ? Math.max(0, Math.round(xp)) : 0;
  return `${value.toLocaleString('fi-FI')} XP`;
}

/** "55 XP seuraavaan tasoon" / "Korkein taso saavutettu". */
export function levelRemainingLabel(level: LevelInfo) {
  if (level.nextLevelXp === null) return 'Korkein taso saavutettu';
  return `${formatXp(Math.max(0, level.nextLevelXp - level.xp))} seuraavaan tasoon`;
}
/** XP inside the current level, e.g. "5 / 60 XP". */
export function levelSpanLabel(level: LevelInfo) {
  if (level.nextLevelXp === null) return formatXp(level.xp);
  return `${Math.max(0, level.xp - level.levelStartXp)} / ${formatXp(level.nextLevelXp - level.levelStartXp)}`;
}

export function dailyGoalFraction(goal: DailyGoalInfo) {
  return goal.targetXp > 0 ? clamp01(goal.earnedXp / goal.targetXp) : 0;
}
export function dailyGoalLabel(goal: DailyGoalInfo) {
  return goal.reached ? `Tavoite täynnä · ${formatXp(goal.earnedXp)}` : `${Math.min(goal.earnedXp, goal.targetXp)} / ${formatXp(goal.targetXp)}`;
}

/** "1 päivä" / "3 päivää" (Finnish partitive after numbers other than one). */
export const dayCount = (n: number) => `${n} ${n === 1 ? 'päivä' : 'päivää'}`;
export function streakLabel(streak: StreakInfo) {
  if (streak.current <= 0) return 'Ei putkea vielä';
  return `${dayCount(streak.current)} putkeen`;
}
export function streakHint(streak: StreakInfo) {
  if (streak.practicedToday) return 'Tämä päivä on kirjattu.';
  return streak.current > 0 ? 'Läpäise oppitunti tänään, niin putki jatkuu.' : 'Läpäise oppitunti, niin putki alkaa.';
}

// ---------------------------------------------------------------------------
// Path structure
// ---------------------------------------------------------------------------

export type NodeState = 'locked' | 'available' | 'in_progress' | 'completed';

export function lessonState(progress: LessonProgressV2 | undefined): NodeState {
  if (!progress) return 'locked';
  if (progress.status === 'completed' || progress.status === 'locked') return progress.status;
  // "in progress" means a saved draft or an attempt below the pass score.
  if (progress.status === 'in_progress' || progress.attempts > 0 || Object.keys(progress.draft ?? {}).length > 0) return 'in_progress';
  return 'available';
}

export function findLesson(units: PublicUnitV2[], lessonId: string): { unit: PublicUnitV2; lesson: PublicLessonV2 } | null {
  for (const unit of units) {
    const lesson = unit.lessons.find(entry => entry.id === lessonId);
    if (lesson) return { unit, lesson };
  }
  return null;
}

/** Horizontal position of node n on the winding path, from -1 (left) to 1 (right). */
export function windingOffset(index: number) {
  const pattern = [0, 0.75, 1, 0.75, 0, -0.75, -1, -0.75];
  return pattern[((index % pattern.length) + pattern.length) % pattern.length];
}

/** The summary returned by a mutation replaces the progress part of the loaded path. */
export function mergeSummary(state: PathStateV2, summary: PathSummaryV2): PathStateV2 {
  return { ...state, ...summary, content: state.content, rules: state.rules };
}

/** Lesson-friendly status line for the home card and the path header. */
export function nextStepLabel(state: Pick<PathStateV2, 'nextLessonId' | 'content' | 'review'>) {
  const next = state.nextLessonId ? findLesson(state.content.units, state.nextLessonId) : null;
  if (next) return { title: next.lesson.title, detail: `${next.unit.title} · ${next.lesson.kind === 'checkpoint' ? 'Välietappi' : `Oppitunti ${next.lesson.order}`}` };
  if (state.review.pendingItems > 0) return { title: 'Kertaa virheesi', detail: `${state.review.pendingItems} kerrattavaa kohtaa` };
  return { title: 'Kaikki tehty – kertaa korteilla', detail: 'Uusia osia on tulossa.' };
}

/**
 * Server error → what the screen should do. The body `code` ({ error, code: PathErrorCode })
 * decides; the HTTP status is the fallback for responses without one (the shared auth layer's
 * 401/403, proxies, unreadable bodies). `nothing_to_review` means the same as a conflict for the
 * review screen: the server state moved on, load it again.
 */
export type PathFailure = 'conflict' | 'locked' | 'invalid' | 'incomplete' | 'retry';
const FAILURE_BY_CODE: Record<PathErrorCode, PathFailure> = {
  invalid_request: 'invalid', incomplete: 'incomplete', locked: 'locked', conflict: 'conflict',
  nothing_to_review: 'conflict', unavailable: 'retry', not_found: 'invalid',
};
const isPathErrorCode = (code: unknown): code is PathErrorCode => typeof code === 'string' && Object.hasOwn(FAILURE_BY_CODE, code);
export function pathFailure(status: number | undefined, code?: string): PathFailure {
  if (isPathErrorCode(code)) return FAILURE_BY_CODE[code];
  if (status === 409) return 'conflict';
  if (status === 403) return 'locked';
  if (status === 400 || status === 404) return 'invalid';
  return 'retry';
}

/** Finnish message for a server error code, or undefined when the code is missing or unknown. */
const MESSAGE_BY_CODE: Record<PathErrorCode, string> = {
  invalid_request: 'Vastauksia ei voitu käsitellä, koska oppitunnin sisältö on voinut päivittyä. Lataa oppitunti uudelleen; vastauksesi säilyvät.',
  incomplete: 'Vastaa ensin jokaiseen kohtaan, niin voit tarkistaa vastaukset.',
  locked: 'Tämä oppitunti on lukittu. Suorita ensin edelliset oppitunnit polulla.',
  conflict: 'Oppituntia muokattiin samaan aikaan toisella laitteella. Vastauksesi ovat tallessa tässä näkymässä – yritä uudelleen.',
  nothing_to_review: 'Kertaus on jo päivittynyt. Hae uudet kertaustehtävät.',
  unavailable: 'Oppimispolku ei ole juuri nyt käytettävissä. Vastauksesi ovat tallessa tässä näkymässä – yritä hetken päästä uudelleen.',
  not_found: 'Oppituntia ei löytynyt. Palaa polulle ja valitse oppitunti uudelleen.',
};
export function pathErrorMessage(code: string | undefined): string | undefined {
  return isPathErrorCode(code) ? MESSAGE_BY_CODE[code] : undefined;
}

// ---------------------------------------------------------------------------
// Draft autosave (used by src/hooks/useDraftAutosave.ts)
// ---------------------------------------------------------------------------

/** Order-stable fingerprint of what a draft save would send for these answers. */
export function draftKey(items: PublicItem[], answers: unknown): string {
  return JSON.stringify(sanitizeDraft(items, answers));
}

/**
 * Whether an automatic draft save should run now: only for a playable lesson, never while
 * another save or submit is running, and only when the draft differs from the one the server has.
 */
export function shouldAutosaveDraft(input: { enabled: boolean; busy: boolean; current: string; saved: string }): boolean {
  return input.enabled && !input.busy && input.current !== input.saved;
}

/**
 * Maps a unit's website resource link to an in-app screen. Exercise resources open the
 * matching ready-made catalogue exercise when one exists, otherwise the exercise menu.
 */
export type ResourceRoute = { pathname: '/theory' | '/exercise' | '/exercises' | '/essays' | '/flashcards'; params?: Record<string, string> };
export function resourceRoute(resource: ResourceLink, catalogue: { id: string; category: string; path?: string; multipleChoiceOnly?: boolean }[]): ResourceRoute {
  if (resource.kind === 'theory') return resource.id ? { pathname: '/theory', params: { section: resource.id } } : { pathname: '/theory' };
  if (resource.kind === 'essay') return { pathname: '/essays' };
  if (resource.kind === 'flashcards') return { pathname: '/flashcards' };
  const category = resource.kind === 'listening-mc' ? 'listening' : resource.kind;
  const match = resource.id ? catalogue.find(choice => choice.category === category && !choice.multipleChoiceOnly && !!choice.path && choice.path.endsWith(`/${resource.id}.json`)) : undefined;
  return match ? { pathname: '/exercise', params: { id: match.id } } : { pathname: '/exercises' };
}

export const skillLabel: Record<SkillArea, string> = {
  grammar: 'Kielioppi', vocabulary: 'Sanasto', reading: 'Luetunymmärtäminen', listening: 'Kuullunymmärtäminen', writing: 'Kirjoittaminen',
};
