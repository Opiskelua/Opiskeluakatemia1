// Mirrored from the website repo: ../opiskeluakatemia/src/lib/learning-path-v2/types.ts
// (Polku v2 API contract, website commit 867c838). Keep this copy identical in substance;
// when the website contract changes, copy the file again. See ../opiskeluakatemia/docs/LEARNING_PATH_V2.md.

// Polku v2 — shared API contract.
//
// This file is intentionally dependency-free so the mobile app can copy it
// verbatim (or mirror it) and the website UI can import it directly.
// Every shape here is what /api/abikurssi/path* returns or accepts.
// See docs/LEARNING_PATH_V2.md for semantics.

export const PATH_V2_VERSION = 'v2-2026' as const;
export type PathV2Version = typeof PATH_V2_VERSION;

// ---------------------------------------------------------------------------
// Gamification rules (also returned as `rules` in GET /api/abikurssi/path so
// clients never hard-code numbers).
// ---------------------------------------------------------------------------

export interface PathLevelDefinition { level: number; minXp: number; title: string }

export const PATH_V2_RULES = {
  /** A lesson/checkpoint counts as completed at this score (0–100). Matches save_course_lesson. */
  passScore: 80,
  /** XP for completing a normal lesson (first time it reaches passScore). */
  lessonXp: 10,
  /** Extra lesson XP when the best score is 100. */
  lessonPerfectBonus: 5,
  /** XP for passing a unit checkpoint. */
  checkpointXp: 30,
  /** Extra checkpoint XP when the best score is 100. */
  checkpointPerfectBonus: 10,
  /** XP for each review (Kertaus) item answered correctly — once per item, ever. */
  reviewItemXp: 2,
  /** Daily goal: XP earned during one Helsinki calendar day. */
  dailyGoalXp: 20,
  /** Maximum number of items served in one Kertaus session. */
  reviewSessionSize: 10,
  /** Kertaus session counts as a study day (streak) at or above this score. */
  reviewStudyDayScore: 80,
  levels: [
    { level: 1, minXp: 0, title: 'Harjoittelija' },
    { level: 2, minXp: 40, title: 'Assistentti' },
    { level: 3, minXp: 100, title: 'Nuorempi asiantuntija' },
    { level: 4, minXp: 180, title: 'Asiantuntija' },
    { level: 5, minXp: 280, title: 'Vanhempi asiantuntija' },
    { level: 6, minXp: 400, title: 'Tiiminvetäjä' },
    { level: 7, minXp: 550, title: 'Projektipäällikkö' },
    { level: 8, minXp: 720, title: 'Osastopäällikkö' },
    { level: 9, minXp: 900, title: 'Johtaja' },
    { level: 10, minXp: 1100, title: 'Kielivirtuoosi' },
  ] as PathLevelDefinition[],
  /** Mastery labels by lower bound (inclusive), checked from the top. */
  masteryLabels: [
    { min: 95, label: 'Mestari' },
    { min: 80, label: 'Vahva' },
    { min: 50, label: 'Kehittyy' },
    { min: 1, label: 'Alkuun' },
    { min: 0, label: 'Ei aloitettu' },
  ],
};
export type PathRules = typeof PATH_V2_RULES;

// ---------------------------------------------------------------------------
// Content (public — never contains answer keys or explanations)
// ---------------------------------------------------------------------------

export type ItemKind = 'choice' | 'gap' | 'order';

/** Answer values by item kind: choice → option index, gap → typed text, order → token indices in chosen order. */
export type AnswerValue = number | string | number[];
export type Answers = Record<string, AnswerValue>;

interface PublicItemBase {
  id: string;
  kind: ItemKind;
  /** Short Finnish instruction, e.g. "Valitse oikea vaihtoehto." */
  instruction: string;
}
export interface PublicChoiceItem extends PublicItemBase {
  kind: 'choice';
  /** English sentence; the blank is written as ___ (three underscores) when present. */
  prompt: string;
  options: string[];
}
export interface PublicGapItem extends PublicItemBase {
  kind: 'gap';
  /** English sentence with exactly one ___ blank. */
  prompt: string;
  /** Base word or choices shown next to the blank, e.g. "write" or "a / an". */
  hint: string | null;
  maxLength: number;
}
export interface PublicOrderItem extends PublicItemBase {
  kind: 'order';
  /** Finnish meaning of the sentence to build. */
  prompt: string;
  /** Tokens in a fixed scrambled display order. The answer is a permutation of 0..tokens.length-1. */
  tokens: string[];
}
export type PublicItem = PublicChoiceItem | PublicGapItem | PublicOrderItem;

export type ResourceKind = 'theory' | 'reading' | 'listening' | 'listening-mc' | 'grammar' | 'flashcards' | 'essay';
export interface ResourceLink {
  kind: ResourceKind;
  /** Theory section id or exercise id (e.g. 'artikkelit', 'climate-article'); '' for list pages. */
  id: string;
  label: string;
  /** Website path. Mobile maps (kind, id) to its own screens. */
  href: string;
}

/** "Muista sääntö" guide shown before/while answering. */
export interface LessonGuide {
  rule: string;
  examples: { sentence: string; note: string }[];
  reminder: string;
  theory: ResourceLink | null;
}

export type LessonKind = 'lesson' | 'checkpoint';

export interface PublicLessonV2 {
  id: string;
  unitId: string;
  kind: LessonKind;
  /** 1-based position inside the unit; the checkpoint is last. */
  order: number;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  /** Maximum XP this lesson can award (completion + perfect bonus). */
  maxXp: number;
  guide: LessonGuide | null;
  items: PublicItem[];
}

export type SkillArea = 'grammar' | 'vocabulary' | 'reading' | 'listening' | 'writing';

export interface PublicUnitV2 {
  id: string;
  /** 1-based. */
  order: number;
  title: string;
  subtitle: string;
  skill: SkillArea;
  /** Coming-soon units have no lessons yet and are always locked. */
  comingSoon: boolean;
  /** Planned lesson titles for coming-soon units (empty for built units). */
  plannedLessons: string[];
  lessons: PublicLessonV2[];
  /** Extra practice in the existing course (reading/listening exercises, theory, essays). */
  resources: ResourceLink[];
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

export type LessonStatus = 'locked' | 'available' | 'in_progress' | 'completed';

export interface LessonProgressV2 {
  lessonId: string;
  status: LessonStatus;
  /** Best graded score 0–100, null if never submitted. */
  bestScore: number | null;
  /** Score of the most recent graded attempt. */
  lastScore: number | null;
  attempts: number;
  /** ISO timestamp of the first pass (score ≥ passScore). */
  completedAt: string | null;
  /** Unsubmitted answers saved with action 'save' (resume support). */
  draft: Answers;
  /** Send this back as `revision` when saving this lesson. 0 = never saved. */
  revision: number;
  xpEarned: number;
}

export type UnitStatus = 'locked' | 'available' | 'completed' | 'coming_soon';

export interface UnitProgressV2 {
  unitId: string;
  status: UnitStatus;
  lessonsCompleted: number;
  /** Normal lessons only (checkpoint excluded). */
  lessonsTotal: number;
  checkpointPassed: boolean;
  /** 0–100, see docs (best scores, checkpoint weighted ×2). */
  mastery: number;
  masteryLabel: string;
  xpEarned: number;
  xpTotal: number;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  /** XP threshold where the current level starts. */
  levelStartXp: number;
  /** XP threshold of the next level, null at max level. */
  nextLevelXp: number | null;
  nextLevelTitle: string | null;
  /** 0–1 progress toward the next level (1 at max level). */
  progress: number;
}

export interface DailyGoalInfo {
  /** Helsinki date YYYY-MM-DD. */
  date: string;
  targetXp: number;
  earnedXp: number;
  reached: boolean;
  /** Lessons/checkpoints first completed today. */
  lessonsCompletedToday: number;
  /** Review items answered correctly for the first time today. */
  reviewItemsToday: number;
}

export interface StreakInfo { current: number; longest: number; practicedToday: boolean }

export interface ReviewSummary {
  /** Items wrong in the latest graded attempts and not yet fixed in Kertaus. */
  pendingItems: number;
  /** min(pendingItems, rules.reviewSessionSize). */
  sessionSize: number;
  /** Revision of the Kertaus progress row; send with POST /review. */
  revision: number;
  /** Due course flashcards (null if the flashcard store could not be read). */
  dueFlashcards: number | null;
  flashcardsHref: string;
}

/** Everything except static content; also returned after each submit. */
export interface PathSummaryV2 {
  version: PathV2Version;
  /** Helsinki date used for daily goal / streak. */
  today: string;
  progress: Record<string, LessonProgressV2>;
  units: UnitProgressV2[];
  /** First available, not-yet-completed lesson in path order (null when everything built is done). */
  nextLessonId: string | null;
  xp: { total: number; today: number };
  level: LevelInfo;
  dailyGoal: DailyGoalInfo;
  streak: StreakInfo;
  review: ReviewSummary;
}

/** GET /api/abikurssi/path */
export interface PathStateV2 extends PathSummaryV2 {
  content: { units: PublicUnitV2[] };
  rules: PathRules;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** POST /api/abikurssi/path */
export interface LessonMutationV2 {
  action: 'save' | 'submit';
  version: PathV2Version;
  lessonId: string;
  answers: Answers;
  /** LessonProgressV2.revision as last seen by the client. */
  revision: number;
}

export interface ItemFeedback {
  id: string;
  correct: boolean;
  /** Present when keysRevealed. Human-readable correct answer (option text, gap answer, or sentence). */
  correctAnswer?: string;
  /** Present for choice items when keysRevealed. */
  correctIndex?: number;
  /** Finnish explanation; present when keysRevealed. */
  explanation?: string;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  correctCount: number;
  total: number;
  /**
   * False only for a failed checkpoint attempt: feedback then tells which items
   * were wrong but not the keys, so the checkpoint stays a real test.
   */
  keysRevealed: boolean;
  feedback: ItemFeedback[];
}

export interface RewardSummary {
  xpBefore: number;
  xpAfter: number;
  xpGained: number;
  levelBefore: number;
  levelAfter: number;
  leveledUp: boolean;
  /** True when this submit completed the lesson for the first time. */
  firstCompletion: boolean;
  /** Unit id completed by this submit (its checkpoint passed). */
  unitCompleted: string | null;
  /** Unit id that became available by this submit. */
  unitUnlocked: string | null;
  /** Daily goal went from not reached to reached with this submit. */
  dailyGoalReached: boolean;
  /** Streak after this submit. */
  streak: StreakInfo;
}

export interface LessonMutationResponseV2 {
  /** New revision of this lesson's row. */
  revision: number;
  /** Null for action 'save'. */
  result: GradeResult | null;
  rewards: RewardSummary | null;
  summary: PathSummaryV2;
}

// ---------------------------------------------------------------------------
// Review (Kertaus)
// ---------------------------------------------------------------------------

export type ReviewItem = PublicItem & { lessonId: string; unitId: string; lessonTitle: string };

/** GET /api/abikurssi/path/review */
export interface ReviewSessionV2 {
  version: PathV2Version;
  revision: number;
  items: ReviewItem[];
  pendingTotal: number;
  dueFlashcards: number | null;
  flashcardsHref: string;
}

/** POST /api/abikurssi/path/review */
export interface ReviewSubmitV2 {
  version: PathV2Version;
  /** Subset of the served item ids (at least one). */
  answers: Answers;
  revision: number;
}

export interface ReviewSubmitResponseV2 {
  revision: number;
  result: GradeResult;
  rewards: RewardSummary;
  summary: PathSummaryV2;
}

// ---------------------------------------------------------------------------
// Errors — every non-2xx response is { error: string (Finnish, user-facing), code: PathErrorCode }
// (401/403 from the shared auth layer may omit `code`.)
// ---------------------------------------------------------------------------

export type PathErrorCode =
  | 'invalid_request' // 400 malformed JSON, wrong version, unknown lesson/item, bad answer type, too large
  | 'incomplete' // 400 submit without answering every item
  | 'locked' // 403 lesson/unit not unlocked yet, or unit is coming soon
  | 'conflict' // 409 revision is stale (another device/tab saved) — reload and retry
  | 'nothing_to_review' // 409 review submit with items that are no longer pending
  | 'unavailable' // 503 storage error
  | 'not_found'; // 404 (preview routes outside development)

export interface PathErrorBody { error: string; code?: PathErrorCode }
