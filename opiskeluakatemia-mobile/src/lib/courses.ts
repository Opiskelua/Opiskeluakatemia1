// Courses the app serves. Identifiers follow the website's build contract
// (opiskeluakatemia-content/docs/RUOTSIN_ABIKURSSI.md §1–2) and its src/lib/courses.ts:
// the course id goes into API params, the course type into the access check.
// Pure data and URL helpers without React Native imports, so tests/courses.test.cjs can load it.

/** Course id used in code and API params. */
export type CourseId = 'en' | 'sv';
/** has_active_course_access(input_course_type): what /api/courses/check-access checks. */
export type CourseType = 'abikurssi' | 'ruotsin-abikurssi';
/** Polku endpoints below a course's path base. */
export type PathSuffix = '' | '/review' | '/target';

/** What the app offers for a course. A false feature hides its home entry in that course. */
export interface CourseFeatures {
  /** Polku: lessons, Kertaus and the target grade. */
  path: boolean;
  theory: boolean;
  /** Exercise catalogue, exercise history and the home statistics built from it. */
  exercises: boolean;
  essays: boolean;
  flashcards: boolean;
  /** Päivän tehtävät. */
  daily: boolean;
  /** Arvosana-arvio ja taitoprofiili. */
  progress: boolean;
}

export interface Course {
  id: CourseId;
  courseType: CourseType;
  /** Status line and headings, e.g. "Englannin abikurssi". */
  label: string;
  /** Course switcher chip. */
  shortLabel: string;
  /** Polku API base; '/review' and '/target' are appended. */
  pathBase: string;
  /**
   * Development preview: one unauthenticated endpoint for every course, the course picked by
   * query. Explicit per course, so a Swedish URL is never rewritten into a production call.
   */
  previewBase: string;
  previewQuery: string;
  /** Query for GET /api/abikurssi/content; empty for English, which app builds without courses also get. */
  contentQuery: string;
  features: CourseFeatures;
  /** Shown under the home tiles when the course has fewer areas in the app than on the web. */
  homeNote: string | null;
}

/** Display and fallback order: owners of both courses land on English by default. */
export const COURSE_IDS: readonly CourseId[] = ['en', 'sv'];
export const DEFAULT_COURSE: CourseId = 'en';

export const COURSES: Readonly<Record<CourseId, Course>> = {
  en: {
    id: 'en',
    courseType: 'abikurssi',
    label: 'Englannin abikurssi',
    shortLabel: 'Englanti',
    pathBase: '/api/abikurssi/path',
    previewBase: '/api/abikurssi/path-preview',
    previewQuery: '',
    contentQuery: '',
    features: { path: true, theory: true, exercises: true, essays: true, flashcards: true, daily: true, progress: true },
    homeNote: null,
  },
  sv: {
    id: 'sv',
    courseType: 'ruotsin-abikurssi',
    label: 'Ruotsin abikurssi',
    shortLabel: 'Ruotsi',
    pathBase: '/api/abikurssi/ruotsi/path',
    previewBase: '/api/abikurssi/path-preview',
    previewQuery: 'course=sv',
    contentQuery: 'course=sv',
    // Swedish exercises, writing and flashcards live on the website only for now; daily tasks,
    // the grade estimate and the skill profile are English-only (contract §4).
    features: { path: true, theory: true, exercises: false, essays: false, flashcards: false, daily: false, progress: false },
    homeNote: 'Sovelluksessa ovat ruotsin kurssin Polku ja teoria. Harjoitukset, kirjoitelmat ja muistikortit ovat verkkopalvelussa.',
  },
};

export const isCourseId = (value: unknown): value is CourseId => value === 'en' || value === 'sv';

/** GET /api/courses/check-access for one course; answers { hasAccess, courseType }. */
export const accessCheckUrl = (course: CourseId) => `/api/courses/check-access?courseType=${COURSES[course].courseType}`;

/** Theory (and English essay topics) for the mobile app. */
export function contentUrl(course: CourseId) {
  const query = COURSES[course].contentQuery;
  return `/api/abikurssi/content${query ? `?${query}` : ''}`;
}

/** Authenticated Polku endpoint, e.g. /api/abikurssi/ruotsi/path/review. */
export const pathUrl = (course: CourseId, suffix: PathSuffix = '') => `${COURSES[course].pathBase}${suffix}`;

/**
 * Development preview endpoint for the same call: English /api/abikurssi/path-preview/target,
 * Swedish /api/abikurssi/path-preview/target?course=sv. The caller appends the preview user.
 */
export function previewPathUrl(course: CourseId, suffix: PathSuffix = '', scenario?: string) {
  const { previewBase, previewQuery } = COURSES[course];
  const query = [previewQuery, scenario ? `scenario=${encodeURIComponent(scenario)}` : ''].filter(Boolean).join('&');
  return `${previewBase}${suffix}${query ? `?${query}` : ''}`;
}

// ---------------------------------------------------------------------------
// Selected course (src/providers/CourseProvider.tsx)
// ---------------------------------------------------------------------------

/** AsyncStorage key of the last course the student used on this device. */
export const COURSE_STORAGE_KEY = 'oa.course.v1';

/** Server-checked access per course; null = not known yet (never checked, or every check failed). */
export type CourseOwnership = Record<CourseId, boolean | null>;
export const UNKNOWN_OWNERSHIP: CourseOwnership = { en: null, sv: null };

/** A stored value, or null when it is missing or not a course this build knows. */
export const parseStoredCourse = (raw: unknown): CourseId | null => (isCourseId(raw) ? raw : null);

/**
 * Takes the checks that succeeded; a failed check (left out) keeps the last known value, so a
 * flaky request never moves the student to another course.
 */
export function mergeOwnership(previous: CourseOwnership, results: Partial<Record<CourseId, boolean>>): CourseOwnership {
  const next = { ...previous };
  for (const id of COURSE_IDS) if (typeof results[id] === 'boolean') next[id] = results[id];
  return next;
}

/** Courses known to be owned, in display order. */
export const ownedCourses = (owned: CourseOwnership): CourseId[] => COURSE_IDS.filter(id => owned[id] === true);

/**
 * The course the app shows: the remembered one unless it is known not to be owned; otherwise the
 * first owned course, then the first one not checked yet, then English (which shows the no-access state).
 */
export function resolveCourse(preferred: CourseId | null, owned: CourseOwnership): CourseId {
  if (preferred && owned[preferred] !== false) return preferred;
  return COURSE_IDS.find(id => owned[id] === true) ?? COURSE_IDS.find(id => owned[id] === null) ?? DEFAULT_COURSE;
}
