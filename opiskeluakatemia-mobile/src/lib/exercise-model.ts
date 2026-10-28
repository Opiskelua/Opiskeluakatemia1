export type Category = 'grammar' | 'reading' | 'listening';
export type Answers = Record<string, string | number>;
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export interface Choice { id: string; title: string; category: Category; type: string; path?: string; multipleChoiceOnly?: boolean; }
export interface Question { id: string; prompt: string; hint?: string; options?: string[]; correctIndex?: number; acceptableAnswers?: string[]; explanation?: string; maxCharacters?: number; }
export interface Exercise { id: string; title: string; type: string; difficulty: string; category: Category; instructions: string; passages: string[]; questions: Question[]; audioUrl?: string; splitTime?: number; transcript?: string; raw: Record<string, unknown>; }
export interface Evaluation { questionId: string; score: number; feedback: string; }
export interface Result { attemptId: string; totalScore: number; maxScore: number; evaluations?: Evaluation[]; }
export function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Tehtävän tiedot ovat puutteelliset.');
  return value as Record<string, unknown>;
}
const str = (value: unknown) => typeof value === 'string' ? value : '';
export function plainText(value: unknown): string {
  return str(value).replace(/<\/(p|div|h[1-6])>/gi, '\n\n').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\*\*/g, '').trim();
}
export function normalizeExercise(value: unknown, choice: Choice): Exercise {
  let raw = record(value);
  if (choice.multipleChoiceOnly && Array.isArray(raw.questions)) {
    const questions = raw.questions.filter(q => record(q).type === 'multiple-choice');
    raw = { ...raw, id: `${raw.id}-mc`, title: `${raw.title} · monivalinta`, questions,
      totalPoints: questions.reduce((sum: number, q) => sum + Number(record(q).points || 3), 0) };
  }
  if (typeof raw.id !== 'string' || !raw.id || typeof raw.title !== 'string') throw new Error('Tehtävän tunniste puuttuu.');
  const type = str(raw.type) || choice.type;
  const passages: string[] = [];
  if (raw.introText) passages.push(plainText(raw.introText));
  if (Array.isArray(raw.paragraphs)) raw.paragraphs.forEach(p => passages.push(plainText(record(p).text)));
  if (Array.isArray(raw.textSections)) raw.textSections.forEach(p => { const section = record(p); passages.push([plainText(section.title), plainText(section.content), plainText(section.source)].filter(Boolean).join('\n\n')); });
  if (raw.summaryText) passages.push(plainText(raw.summaryText));
  const source = type === 'gap-fill' && Array.isArray(raw.gaps) ? raw.gaps : raw.questions;
  if (!Array.isArray(source) || !source.length) throw new Error('Tehtävässä ei ole kysymyksiä.');
  const questions = source.map((item, index): Question => {
    const q = record(item);
    if (typeof q.id !== 'string' || !q.id) throw new Error('Kysymyksen tunniste puuttuu.');
    const options = Array.isArray(q.options) && q.options.every(o => typeof o === 'string') ? q.options as string[] : undefined;
    const correctIndex = typeof q.correctIndex === 'number' ? q.correctIndex : typeof q.correctAnswer === 'number' ? q.correctAnswer : undefined;
    const acceptableAnswers = Array.isArray(q.acceptableAnswers) ? q.acceptableAnswers.filter((a): a is string => typeof a === 'string') : [q.correctWord, q.correctAnswer].filter((a): a is string => typeof a === 'string');
    if (choice.category === 'grammar' && (options ? !Number.isInteger(correctIndex) || correctIndex! < 0 || correctIndex! >= options.length : !acceptableAnswers.length)) throw new Error('Tehtävän vastausavain puuttuu. Luo uusi tehtävä.');
    return {
      id: q.id,
      prompt: plainText(q.questionFi || q.question || q.sentence || (q.textBefore !== undefined ? `${str(q.textBefore)} _____ ${str(q.textAfter)}` : `Aukko ${q.gapNumber || index + 1}`)),
      hint: [q.clue, q.underlinedWord && `Korostettu sana: ${q.underlinedWord}`, q.errorWord && `Korjaa sana: ${q.errorWord}`, q.verb && `Verbi: ${q.verb}`, q.context].filter(v => typeof v === 'string').map(plainText).join('\n'),
      options, correctIndex, acceptableAnswers, explanation: plainText(q.explanation),
      maxCharacters: typeof q.maxCharacters === 'number' ? q.maxCharacters : undefined,
    };
  });
  if (new Set(questions.map(q => q.id)).size !== questions.length) throw new Error('Tehtävän kysymystunnisteet eivät ole yksilöllisiä.');
  return { id: raw.id, title: raw.title, category: choice.category, type, difficulty: str(raw.difficulty) || 'intermediate', instructions: plainText(raw.instructions || raw.taskIntro), passages, questions,
    audioUrl: str(raw.audioUrl) || undefined, splitTime: typeof raw.splitTime === 'number' ? raw.splitTime : undefined, transcript: str(raw.transcript), raw };
}
export function allAnswered(exercise: Exercise, answers: Answers): boolean {
  return exercise.questions.every(q => q.options ? Number.isInteger(answers[q.id]) && Number(answers[q.id]) >= 0 && Number(answers[q.id]) < q.options.length : typeof answers[q.id] === 'string' && String(answers[q.id]).trim().length > 0);
}
export function grammarScore(exercise: Exercise, answers: Answers) {
  const evaluations = exercise.questions.map(q => {
    const answer = answers[q.id];
    const correct = q.options ? answer === q.correctIndex : (q.acceptableAnswers || []).some(a => a.toLowerCase().trim() === String(answer ?? '').toLowerCase().trim());
    const solution = q.options ? q.options[q.correctIndex!] : q.acceptableAnswers?.[0];
    return { questionId: q.id, score: correct ? 1 : 0, feedback: `${correct ? 'Oikein.' : `Oikea vastaus: ${solution ?? '—'}.`} ${q.explanation || ''}`.trim() };
  });
  return { totalScore: evaluations.reduce((sum, e) => sum + e.score, 0), maxScore: exercise.questions.length, evaluations };
}
export function submission(exercise: Exercise, answers: Answers) {
  if (!allAnswered(exercise, answers)) throw new Error('Vastaa kaikkiin kysymyksiin ennen palautusta.');
  if (exercise.category === 'grammar') {
    const score = grammarScore(exercise, answers);
    return { path: '/api/grammar/evaluate', body: { exerciseId: exercise.id, exerciseTitle: exercise.title, exerciseType: exercise.type, exerciseDifficulty: exercise.difficulty, answers, totalScore: score.totalScore, maxScore: score.maxScore } };
  }
  if (exercise.category === 'reading') return { path: '/api/reading/evaluate', body: { exerciseId: exercise.id, exercise: exercise.raw, answers } };
  return { path: exercise.questions.every(q => q.options) ? '/api/listening/evaluate-mc' : '/api/listening/evaluate', body: { exerciseId: exercise.id, answers } };
}
export function parseResult(value: unknown): Result {
  const data = record(value);
  if (typeof data.attemptId !== 'string' || typeof data.totalScore !== 'number' || typeof data.maxScore !== 'number') throw new Error('Tallennuksen vahvistus puuttuu. Tarkista historia ennen uutta palautusta.');
  const evaluations = Array.isArray(data.evaluations) ? data.evaluations.map(e => { const row = record(e); return { questionId: str(row.questionId), score: Number(row.score) || 0, feedback: plainText(row.feedback) }; }) : undefined;
  return { attemptId: data.attemptId, totalScore: data.totalScore, maxScore: data.maxScore, evaluations };
}
/** Open answers in reading and listening are graded by the backend's AI provider (Google Gemini). */
export const usesAiGrading = (exercise: Exercise) => exercise.category !== 'grammar' && exercise.questions.some(q => !q.options);
