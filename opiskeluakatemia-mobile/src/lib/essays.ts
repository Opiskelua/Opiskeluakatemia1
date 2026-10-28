import { apiRequest } from './api';
export interface Essay { id: string; topicId: string; topicTitle: string; isDraft: boolean; isSubmitted: boolean; updatedAt: string; evaluation: { mappedScore: number } | null }
export interface Draft { id: string; topic_id: string; topic_title: string; content: string }
export interface Evaluation { essay: { topicTitle: string; content: string }; evaluation: { mappedScore: number; scoreLevelDescription: string; strengths: string[]; weaknesses: string[]; categoryFeedback: Record<string, string> } }
export const loadEssays = async () => await apiRequest('/api/essays/list?limit=100') as { essays: Essay[]; hasMore: boolean };
export const loadDrafts = async () => await apiRequest('/api/essays/draft') as { drafts: Draft[] };
export const loadEvaluation = async (id: string) => await apiRequest(`/api/essays/${encodeURIComponent(id)}/evaluation`) as Evaluation;
export function essayCounts(content: string) {
  return { charCount: content.replace(/[.,/#!$%\^&*;:{}=\-_`~()?\s\n]/g, '').length, wordCount: content.trim() ? content.trim().split(/\s+/).length : 0 };
}
