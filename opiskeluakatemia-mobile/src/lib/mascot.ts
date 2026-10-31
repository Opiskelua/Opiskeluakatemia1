// Pure helpers for the Abi mascot layer (no React Native imports, unit-tested in tests/mascot.test.cjs).
// Copy, poses and rules live in mascot-states.json, a copy of ../../../assets/mascot/mascot-states.json
// shared with the website (tests/mascot.test.cjs checks for drift). pickLine, momentForResult and
// streakAtRisk follow the definitions in the spec's `rules` so both apps pick the same lines.
import spec from './mascot-states.json';
import type { CourseId } from './courses';
import type { GradeResult, PathSummaryV2, RewardSummary } from './path-v2-types';

export type MascotPose = 'idle' | 'greet' | 'think' | 'relax' | 'celebrate' | 'cheer';
export type MascotMoment =
  | 'onboarding' | 'pathHere' | 'nextUpDaily' | 'lessonPassed' | 'lessonPerfect' | 'lessonFailed'
  | 'unitCompleted' | 'levelUp' | 'dailyGoalReached' | 'streakAtRisk' | 'reviewEmpty' | 'allDone' | 'loading';
export type ResultMoment = 'lessonFailed' | 'unitCompleted' | 'levelUp' | 'dailyGoalReached' | 'lessonPerfect' | 'lessonPassed';

interface MomentSpec { pose: MascotPose; when: string; lines: string[]; title?: string; cta?: string; dismiss?: string }
interface MascotSpec {
  poses: Record<MascotPose, { alt: string }>;
  rules: { maxBigCelebrationsPerDay: number };
  moments: Record<MascotMoment, MomentSpec>;
}
export const mascotSpec = spec as unknown as MascotSpec;
export const MAX_BIG_CELEBRATIONS_PER_DAY = mascotSpec.rules.maxBigCelebrationsPerDay;

export const moment = (name: MascotMoment): MomentSpec => mascotSpec.moments[name];
export const poseFor = (name: MascotMoment): MascotPose => mascotSpec.moments[name].pose;
export const altFor = (pose: MascotPose): string => mascotSpec.poses[pose].alt;

// ---------------------------------------------------------------------------
// Lines
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit over UTF-16 code units (spec rules.rotateLines). */
export function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const PLACEHOLDER = /\{(\w+)\}/g;
export type LineVars = Record<string, string | number>;

/**
 * Line for a moment, stable for (moment, Helsinki date, user) so it rotates daily and never
 * flickers between renders. Only lines whose placeholders all exist in `vars` are eligible;
 * null when none is.
 */
export function pickLine(name: MascotMoment, dateYmd: string, userId: string, vars: LineVars = {}): string | null {
  const lines = mascotSpec.moments[name]?.lines ?? [];
  const eligible = lines.filter(line => [...line.matchAll(PLACEHOLDER)].every(match => Object.hasOwn(vars, match[1])));
  if (!eligible.length) return null;
  const line = eligible[fnv1a(`${name}|${dateYmd}|${userId}`) % eligible.length];
  // A value that already ends in ? ! or . swallows the '.' right after its placeholder ("A vai an?." → "A vai an?").
  return line.replace(/\{(\w+)\}(\.?)/g, (_, key: string, dot: string) => {
    const value = String(vars[key]);
    return /[?!.]$/.test(value) ? value : value + dot;
  });
}

// ---------------------------------------------------------------------------
// Moments
// ---------------------------------------------------------------------------

/** Result-screen moment (spec rules.momentForResult). */
export function momentForResult(grade: Pick<GradeResult, 'score' | 'passed'>, rewards: Pick<RewardSummary, 'unitCompleted' | 'leveledUp' | 'dailyGoalReached'> | null, bigCelebrationsToday: number): ResultMoment {
  if (!grade.passed) return 'lessonFailed';
  if (rewards && bigCelebrationsToday < MAX_BIG_CELEBRATIONS_PER_DAY) {
    if (rewards.unitCompleted) return 'unitCompleted';
    if (rewards.leveledUp) return 'levelUp';
  }
  if (rewards?.dailyGoalReached) return 'dailyGoalReached';
  if (grade.score === 100) return 'lessonPerfect';
  return 'lessonPassed';
}

/** unitCompleted and levelUp count toward the daily big-celebration cap. */
export const isBigCelebration = (name: MascotMoment) => name === 'unitCompleted' || name === 'levelUp';

/** Helsinki UTC offset in hours by the EU rule (last Sunday of March / October, 01:00 UTC). */
export function helsinkiOffsetHours(now: Date): number {
  const year = now.getUTCFullYear();
  const lastSunday = (month: number) => {
    const last = new Date(Date.UTC(year, month + 1, 0, 1));
    return Date.UTC(year, month, last.getUTCDate() - last.getUTCDay(), 1);
  };
  const t = now.getTime();
  return t >= lastSunday(2) && t < lastSunday(9) ? 3 : 2;
}

/** Fallback when the JS engine's Intl has no time zone data. */
export function helsinkiHourFallback(now: Date): number {
  return new Date(now.getTime() + helsinkiOffsetHours(now) * 3600000).getUTCHours();
}
export function helsinkiDateFallback(now: Date): string {
  return new Date(now.getTime() + helsinkiOffsetHours(now) * 3600000).toISOString().slice(0, 10);
}

function helsinkiFormat(options: Intl.DateTimeFormatOptions, locale: string): Intl.DateTimeFormat | null {
  try {
    const format = new Intl.DateTimeFormat(locale, { timeZone: 'Europe/Helsinki', ...options });
    // An engine without time zone data may ignore timeZone and format in device time instead.
    return format.resolvedOptions().timeZone === 'Europe/Helsinki' ? format : null;
  } catch { return null; }
}

/** Hour 0–23 in Helsinki (spec rules.streakAtRisk), with the EU-rule fallback. */
export function helsinkiHour(now: Date): number {
  const format = helsinkiFormat({ hour: '2-digit', hourCycle: 'h23' }, 'en-GB');
  const hour = format ? Number.parseInt(format.format(now), 10) : Number.NaN;
  return Number.isInteger(hour) && hour >= 0 && hour < 24 ? hour : helsinkiHourFallback(now);
}

/** YYYY-MM-DD in Helsinki, for screens without a server `today` (Kertaus). */
export function helsinkiDate(now: Date): string {
  const format = helsinkiFormat({ year: 'numeric', month: '2-digit', day: '2-digit' }, 'en-CA');
  const value = format ? format.format(now) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : helsinkiDateFallback(now);
}

/** Streak can still be kept today and the evening has started (spec rules.streakAtRisk). */
export function streakAtRisk(summary: Pick<PathSummaryV2, 'streak'>, now: Date): boolean {
  return summary.streak.current > 0 && !summary.streak.practicedToday && helsinkiHour(now) >= 18;
}

/** All built lessons done and more units are still coming (moments.allDone). */
export function allDone(state: { nextLessonId: string | null; content: { units: { comingSoon: boolean }[] } }): boolean {
  return state.nextLessonId === null && state.content.units.some(unit => unit.comingSoon);
}

/** Onboarding card: no XP yet and the intro has not been dismissed. */
export const showOnboarding = (summary: Pick<PathSummaryV2, 'xp'>, introDismissed: boolean) => summary.xp.total === 0 && !introDismissed;

/**
 * Device flag for a dismissed intro, per course, so a Swedish beginner still meets Abi after
 * skipping the English intro. English keeps the key it had before there were courses.
 */
export const introDismissedKey = (course: CourseId) => (course === 'en' ? 'mascot.introDismissed' : `mascot.introDismissed.${course}`);

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export type MascotSize = 'sm' | 'md' | 'lg';
/** Rendered edge length in points. */
export const MASCOT_POINTS: Record<MascotSize, number> = { sm: 48, md: 88, lg: 144 };

// Static requires so Metro bundles every pose (paths match spec poses.*.mobile).
export const MASCOT_ASSETS: Record<MascotPose, Record<256 | 512, number>> = {
  idle: { 256: require('../../assets/mascot/idle-256.webp'), 512: require('../../assets/mascot/idle-512.webp') },
  greet: { 256: require('../../assets/mascot/greet-256.webp'), 512: require('../../assets/mascot/greet-512.webp') },
  think: { 256: require('../../assets/mascot/think-256.webp'), 512: require('../../assets/mascot/think-512.webp') },
  relax: { 256: require('../../assets/mascot/relax-256.webp'), 512: require('../../assets/mascot/relax-512.webp') },
  celebrate: { 256: require('../../assets/mascot/celebrate-256.webp'), 512: require('../../assets/mascot/celebrate-512.webp') },
  cheer: { 256: require('../../assets/mascot/cheer-256.webp'), 512: require('../../assets/mascot/cheer-512.webp') },
};

/** The 256 px file covers up to 256 device pixels; larger renders use 512. */
export const assetPixels = (points: number, pixelRatio: number): 256 | 512 => (points * pixelRatio > 256 ? 512 : 256);
export const mascotAsset = (pose: MascotPose, size: MascotSize, pixelRatio: number) => MASCOT_ASSETS[pose][assetPixels(MASCOT_POINTS[size], pixelRatio)];
