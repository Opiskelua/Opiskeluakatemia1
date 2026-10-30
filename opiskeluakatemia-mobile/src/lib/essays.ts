import { apiRequest } from './api';
export interface Essay { id: string; topicId: string; topicTitle: string; isDraft: boolean; isSubmitted: boolean; updatedAt: string; evaluation: { mappedScore: number } | null }
export interface Draft { id: string; topic_id: string; topic_title: string; content: string }
// The grader returns strengths/weaknesses as { category, description, evidence } and category feedback as
// { point, evidence } lists (same shapes the website renders); older rows may hold plain strings.
export interface Evaluation { essay: { topicTitle: string; content: string }; evaluation: { mappedScore: number; scoreLevelDescription: string; strengths: unknown; weaknesses: unknown; categoryFeedback: Record<string, unknown> | null } }
export const CATEGORY_LABELS: Record<string, string> = {
  viestin_valitys_ja_selkeys: 'Viestinvälitys ja selkeys',
  rakenne_ja_johdonmukaisuus: 'Rakenne ja johdonmukaisuus',
  kielellinen_tarkkuus: 'Kielellinen tarkkuus',
  sanasto_ja_ilmaisurakenne: 'Sanasto ja ilmaisurakenne',
  sisalto_ja_aiheen_kasittely: 'Sisältö ja aiheen käsittely',
};
function feedbackLine(item: unknown): string {
  if (typeof item === 'string') return item.trim();
  if (typeof item !== 'object' || item === null) return '';
  const o = item as Record<string, unknown>;
  const text = typeof o.description === 'string' ? o.description : typeof o.point === 'string' ? o.point : '';
  const evidence = typeof o.evidence === 'string' && o.evidence.trim() ? ` – ”${o.evidence.trim()}”` : '';
  return text.trim() ? text.trim() + evidence : '';
}
export function feedbackLines(value: unknown): string[] {
  const items = Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
  return items.map(feedbackLine).filter(Boolean);
}
export const loadEssays = async () => await apiRequest('/api/essays/list?limit=100') as { essays: Essay[]; hasMore: boolean };
export const loadDrafts = async () => await apiRequest('/api/essays/draft') as { drafts: Draft[] };
export const loadEvaluation = async (id: string) => await apiRequest(`/api/essays/${encodeURIComponent(id)}/evaluation`) as Evaluation;
/** YO-koe essay limits: 700 recommended minimum, 1300 maximum (going over costs points). */
export const ESSAY_MIN_CHARS = 700;
export const ESSAY_MAX_CHARS = 1300;
/** YTL counts every character except spaces and line breaks; punctuation counts (EA grading instructions). */
export function essayCounts(content: string) {
  return { charCount: content.replace(/\s/g, '').length, wordCount: content.trim() ? content.trim().split(/\s+/).length : 0 };
}
