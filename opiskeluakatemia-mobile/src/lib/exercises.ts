import { apiRequest, checkCourseAccess } from './api';
import { normalizeExercise, parseResult, submission, grammarScore, type Choice, type Difficulty, type Exercise, type Answers, type Category } from './exercise-model';
import { supabase } from './supabase';

export async function loadExercise(choice: Choice, difficulty: Difficulty, signal?: AbortSignal) {
  if (!await checkCourseAccess()) throw new Error('Tarvitset aktiivisen kurssioikeuden.');
  const value = choice.path ? await apiRequest(choice.path, { signal }) : await apiRequest(`/api/${choice.category}/${choice.category === 'grammar' ? 'generate-exercise' : 'generate'}`, {
    method: 'POST', body: { exerciseType: choice.type, difficulty }, signal, timeout: 120000,
  });
  return normalizeExercise(value, choice);
}
export async function submitExercise(exercise: Exercise, answers: Answers, clientAttemptId: string) {
  if (!await checkCourseAccess()) throw new Error('Kurssioikeutesi ei ole aktiivinen. Vastauksia ei tallennettu.');
  const request = submission(exercise, answers);
  const result = parseResult(await apiRequest(request.path, { method: 'POST', body: { ...request.body, clientAttemptId }, timeout: 180000 }));
  if (exercise.category === 'grammar') result.evaluations = grammarScore(exercise, answers).evaluations;
  return result;
}
export interface Attempt {
  id: string; exercise_id: string; exercise_title: string; total_score: number; max_score: number; score_percentage: number; submitted_at: string; category: Category;
}
export async function loadHistory(): Promise<Attempt[]> {
  if (!supabase) throw new Error('Yhteys puuttuu.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Kirjaudu uudelleen.');
  const categories: Category[] = ['grammar', 'reading', 'listening'];
  const result = await Promise.all(categories.map(async category => {
    const { data, error } = await supabase!.from(`${category}_attempts`)
      .select('id,exercise_id,exercise_title,total_score,max_score,score_percentage,submitted_at')
      .eq('user_id', session.user.id).order('submitted_at', { ascending: false }).limit(100);
    if (error) throw new Error('Historiaa ei voitu hakea. Tarkista yhteys ja yritä uudelleen.');
    return (data ?? []).map(row => ({ ...row, category }) as Attempt);
  }));
  return result.flat().sort((a, b) => Date.parse(b.submitted_at) - Date.parse(a.submitted_at));
}
