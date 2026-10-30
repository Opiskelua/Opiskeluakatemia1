import { apiRequest } from './api';
import { contentUrl, type CourseId } from './courses';
export interface TheorySection {
  id: string; title: string; category: string;
  content: { description: string; rules: string[]; examples: { correct: string; incorrect?: string; explanation: string }[]; commonMistakes?: string[]; yoExamTips?: string };
}
export interface Topic { id: string; title: string; description: string }
export interface CourseContent { theory: TheorySection[]; topics: Topic[] }
/** Theory for the course; essay topics are English only (Swedish writing prompts come from the essay APIs). */
export const loadContent = async (course: CourseId) => await apiRequest(contentUrl(course)) as CourseContent;
export interface DailyTask {
  id: string; taskType: string; taskSubtype: string; exerciseId?: string; difficulty: string; isCompleted: boolean; reason: string;
  displayInfo: { title: string; description: string; estimatedTime: string };
}
export const loadDailyTasks = async () => await apiRequest('/api/abikurssi/daily-tasks') as { tasks: DailyTask[]; summary: { encouragement: string } };
export const completeTask = (taskId: string, score: number, maxScore: number) => apiRequest('/api/abikurssi/daily-tasks/complete', { method: 'POST', body: { taskId, score, maxScore } });
export interface Grade { estimation: { estimatedGrade: string; totalEstimatedPoints: number; overallConfidence: number }; breakdown: Record<string, { label: string; rawScore: number; exercisesCompleted: number; maxPoints: number }> }
export const loadGrade = async () => await apiRequest('/api/abikurssi/grade-estimation') as Grade;
export interface Skills { strengths: { skill: string; label: string; level: number }[]; weaknesses: { skill: string; label: string; level: number }[]; totalExercises: number }
export const loadSkills = async () => await apiRequest('/api/abikurssi/skill-profile') as Skills;
