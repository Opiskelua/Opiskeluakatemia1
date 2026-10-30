import type { Attempt } from './exercises';

// Pure formatting for the history list (no React Native imports) so it can be unit tested in Node.

export interface HistoryRow { key: string; badge: string; title: string; subtitle: string; trailing: string; label: string }

const labels = { grammar: 'Kielioppi', reading: 'Luetunymmärtäminen', listening: 'Kuuntelu' } as const;
const badges = { grammar: 'K', reading: 'L', listening: 'U' } as const;

/** "30.10.2026 klo 11.05" in Finnish, or '' for a missing or malformed timestamp (never "Invalid Date"). */
export function formatAttemptDate(value: string, timeZone?: string): string {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return '';
  return new Date(time).toLocaleString('fi-FI', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone });
}

export function historyRow(a: Attempt, timeZone?: string): HistoryRow {
  const title = a.exercise_title || a.exercise_id || 'Harjoitus';
  const category = labels[a.category] ?? 'Harjoitus';
  const date = formatAttemptDate(a.submitted_at, timeZone);
  const total = Number(a.total_score) || 0;
  const max = Number(a.max_score) || 0;
  return {
    key: `${a.category}-${a.id}`, badge: badges[a.category] ?? '?', title,
    subtitle: date ? `${category} · ${date}` : category,
    trailing: `${total}/${max}`,
    label: [title, category, date, `${total} / ${max} pistettä`].filter(Boolean).join(', '),
  };
}

/** Mean score percentage; rows with a non-numeric percentage count as 0. Returns 0 for no rows. */
export function averagePercentage(attempts: readonly Pick<Attempt, 'score_percentage'>[]): number {
  if (!attempts.length) return 0;
  return attempts.reduce((sum, a) => sum + (Number(a.score_percentage) || 0), 0) / attempts.length;
}
