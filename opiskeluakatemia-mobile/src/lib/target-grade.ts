// Polku target grade (opiskeluakatemia-content/docs/POLKU_TARGET_GRADE_AND_GUARANTEE.md §2).
// Pure logic for src/components/TargetCard.tsx; copy matches the website's
// src/components/course/path-v2/TargetCard.tsx, target-grades.ts and format.ts.
// TODO(mascot): targetReached / behindPace moments have no copy yet; add them with the
// mascot-states.json update, not here.
import type { CourseId } from './courses';
import { PATH_V2_VERSION, type PathSummaryV2, type TargetGrade, type TargetProgressV2, type TargetRequestV2 } from './path-v2-types';

/** Same pattern the server validates examSeason against. */
export const EXAM_SEASON = /^[KS]20\d{2}$/;

export interface TargetGradeOption {
  grade: TargetGrade;
  label: string;
  /** Points out of 299; must equal the server's target points for the course. */
  points: number;
  /** Share of candidates at this grade or better; left out where no YTL distribution backs it. */
  share?: string;
}

/** Shares of EA candidates at each level or better, YTL arvosanajakaumat K2024–K2026 (all candidates). */
export const TARGET_GRADE_OPTIONS: readonly TargetGradeOption[] = [
  { grade: 'C', label: 'Cum laude', points: 218, share: 'noin kaksi kolmesta saa C:n tai paremman' },
  { grade: 'M', label: 'Magna', points: 241, share: 'noin 45 % saa M:n tai paremman' },
  { grade: 'E', label: 'Eximia', points: 259, share: 'noin joka viides saa E:n tai L:n' },
  { grade: 'L', label: 'Laudatur', points: 278, share: 'noin 5 % saa L:n' },
];

/**
 * RB "safe" minimums: the highest YTL boundary of K2023–K2026 (build contract §4), the same
 * points as the server's RB target. There is no RB grade distribution, so no shares.
 */
export const SV_TARGET_GRADE_OPTIONS: readonly TargetGradeOption[] = [
  { grade: 'C', label: 'Cum laude', points: 156 },
  { grade: 'M', label: 'Magna', points: 189 },
  { grade: 'E', label: 'Eximia', points: 221 },
  { grade: 'L', label: 'Laudatur', points: 255 },
];

export const TARGET_COPY = {
  pickerTitle: 'Mihin arvosanaan tähtäät?',
  pickerIntro: 'Polku näyttää, mitkä oppitunnit pitää tehdä tavoitetasolle ja millä tahdilla.',
  choose: 'Valitse tavoite',
  change: 'Muuta',
  gradeLegend: 'Arvosana',
  seasonLabel: 'Koekerta',
  seasonUnknown: 'En tiedä vielä',
  save: 'Tallenna tavoite',
  cancel: 'Peruuta',
  clear: 'Poista tavoite',
  sourceNote: 'Osuudet: YTL:n arvosanajakaumat, englanti pitkä oppimäärä, kevät 2024 – kevät 2026.',
  eyebrow: 'Tavoite',
  paceLabel: 'Tahti',
  estimateLabel: 'Pistearvio',
  coverage: 'Polku kattaa nyt rakenteet ja sanaston, noin 11 % kokeen pisteistä. Arvio perustuu myös luetun ja kuullun ymmärtämisen ja kirjoittamisen harjoituksiin.',
  raiseTitle: 'Nosta tavoitetasolle',
} as const;

/** The course-specific part of the target copy. English equals TARGET_COPY; Swedish matches the web's target-grades.ts. */
export interface TargetCourseCopy {
  options: readonly TargetGradeOption[];
  /** Small print under the picker: where the points (and shares) come from. */
  sourceNote: string;
  /** Small print under the progress: what Polku covers. */
  coverage: string;
  /** "Pistearvio" when the server has no estimate for the course. */
  noEstimate: (targetPoints: number) => string;
}

export const TARGET_COURSE_COPY: Readonly<Record<CourseId, TargetCourseCopy>> = {
  en: {
    options: TARGET_GRADE_OPTIONS,
    sourceNote: TARGET_COPY.sourceNote,
    coverage: TARGET_COPY.coverage,
    noEstimate: () => 'Tee vielä lukemisen ja kuuntelun tehtäviä, jotta arvio tarkentuu.',
  },
  sv: {
    options: SV_TARGET_GRADE_OPTIONS,
    sourceNote: 'Pisteet: YTL:n korkein pisteraja kevät 2023 – kevät 2026, ruotsi, keskipitkä oppimäärä.',
    coverage: 'Polku kattaa rakenteet ja sanaston, noin 10–12 % kokeen pisteistä, sekä luetun ja kuullun ymmärtämisen ja kirjoittamisen strategiat.',
    noEstimate: targetPoints => `Ruotsin pistearvio ei ole vielä käytössä. Tavoite ${targetPoints} / 299 p.`,
  },
};

/** Accessibility label of a grade option, e.g. "E, Eximia, 259 pistettä. noin joka viides saa E:n tai L:n". */
export const gradeOptionLabel = (option: TargetGradeOption) => `${option.grade}, ${option.label}, ${option.points} pistettä.${option.share ? ` ${option.share}` : ''}`;

/**
 * Feature detection: the picker and the card appear only when the server sends `targetRevision`.
 * An older server omits all target fields, and the app ships over the air, so it may meet one.
 */
export function supportsTarget(summary: object | null | undefined): boolean {
  return !!summary && Object.hasOwn(summary, 'targetRevision');
}

/** Revision to send with POST /path/target: 0 when the target was never set (or the field is missing). */
export function targetRevision(summary: Pick<PathSummaryV2, 'targetRevision'>): number {
  const revision = summary.targetRevision;
  return typeof revision === 'number' && Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

/** The current target, treating undefined as null. */
export const currentTarget = (summary: Pick<PathSummaryV2, 'target'>): TargetProgressV2 | null => summary.target ?? null;
export const currentTargetGrade = (summary: Pick<PathSummaryV2, 'targetGrade'>): TargetGrade | null => summary.targetGrade ?? null;

/**
 * The next `count` exam seasons (EA and RB alike) from a Helsinki date (YYYY-MM-DD): K = spring (March),
 * S = autumn (September). A season stays listed until the end of its exam month.
 */
export function upcomingExamSeasons(today: string, count = 3): string[] {
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const seasons: string[] = [];
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return seasons;
  for (let y = year; seasons.length < count; y++) {
    if (y > year || month <= 3) seasons.push(`K${y}`);
    if (seasons.length < count && (y > year || month <= 9)) seasons.push(`S${y}`);
  }
  return seasons;
}

/** Season choices for the picker: upcoming seasons, with an already chosen (older) season kept first. "En tiedä vielä" (null) is added by the UI. */
export function seasonOptions(today: string, current: string | null | undefined): string[] {
  const seasons = upcomingExamSeasons(today);
  if (current && EXAM_SEASON.test(current) && !seasons.includes(current)) seasons.unshift(current);
  return seasons;
}

export function seasonLabel(season: string) {
  return `${season[0] === 'K' ? 'Kevät' : 'Syksy'} ${season.slice(1)}`;
}

/** Body for POST /path/target. A null grade clears the target (and the season with it). */
export function buildTargetRequest(summary: Pick<PathSummaryV2, 'version' | 'targetRevision'>, targetGrade: TargetGrade | null, examSeason: string | null): TargetRequestV2 {
  const season = targetGrade && examSeason && EXAM_SEASON.test(examSeason) ? examSeason : null;
  return { version: PATH_V2_VERSION, revision: targetRevision(summary), targetGrade, examSeason: season };
}

/** Card title, e.g. "14/20 oppituntia vähintään 85 %". */
export const targetTitle = (target: TargetProgressV2) => `${target.lessonsMet}/${target.lessonsRequired} oppituntia vähintään ${target.passMark} %`;

/** Share of required lessons at the target level, 0–100. */
export const targetPercent = (target: TargetProgressV2) =>
  target.lessonsRequired ? Math.round((target.lessonsMet / target.lessonsRequired) * 100) : 0;

export function paceLine(target: Pick<TargetProgressV2, 'lessonsPerWeek' | 'weeksLeft' | 'examSeason'>): string {
  if (target.lessonsPerWeek === null) return target.examSeason ? 'Koepäivää ei vielä tiedetä.' : 'Valitse koekerta, niin näet tahdin.';
  if (target.lessonsPerWeek === 0) return 'Kaikki tavoitteen oppitunnit tehty.';
  return `${target.lessonsPerWeek} ${target.lessonsPerWeek === 1 ? 'oppitunti' : 'oppituntia'} viikossa · ${target.weeksLeft} vk kokeeseen`;
}

export function estimateLine(target: Pick<TargetProgressV2, 'estimate' | 'targetPoints'>, course: CourseId = 'en'): string {
  return target.estimate
    ? `${target.estimate.points} p (${target.estimate.grade}) · tavoite ${target.targetPoints} p`
    : TARGET_COURSE_COPY[course].noEstimate(target.targetPoints);
}

/** "Nosta tavoitetasolle" row, e.g. "Artikkelit 1 · paras 82 %". Unknown ids fall back to the id. */
export function raiseRowLabel(title: string | undefined, id: string, bestScore: number | null | undefined) {
  return `${title ?? id} · paras ${bestScore ?? 0} %`;
}

/** Eyebrow, e.g. "Tavoite / Kevät 2027" or just "Tavoite". */
export const targetEyebrow = (target: Pick<TargetProgressV2, 'examSeason'>) =>
  target.examSeason ? `${TARGET_COPY.eyebrow} / ${seasonLabel(target.examSeason)}` : TARGET_COPY.eyebrow;

/**
 * User-facing message for a failed save, keyed on pathFailure(). The lesson-oriented copy in
 * pathErrorMessage() talks about answers, so the target uses the server's own target wording.
 */
export function targetErrorMessage(failure: 'conflict' | 'locked' | 'invalid' | 'incomplete' | 'retry', code: string | undefined, fallback: string): string {
  if (failure === 'conflict') return 'Tavoite muuttui toisessa istunnossa. Lataa polku uudelleen.';
  if (failure === 'invalid') return 'Tavoitearvosana tai koekerta on virheellinen.';
  if (code === 'unavailable') return 'Oppimispolku ei ole juuri nyt käytettävissä. Yritä hetken päästä uudelleen.';
  return fallback;
}
