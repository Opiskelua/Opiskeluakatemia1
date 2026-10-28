import { choices } from './catalogue';
import type { DailyTask } from './course';

// The server uses file IDs for ready-made exercises and catalogue IDs (with
// difficulty appended for reading) for generated exercises.
export function taskChoice(task: Pick<DailyTask, 'taskType' | 'taskSubtype' | 'exerciseId' | 'difficulty'>) {
  return choices.find(choice => {
    if (choice.category !== task.taskType || choice.multipleChoiceOnly) return false;
    if (!task.exerciseId) return !choice.path && choice.type === task.taskSubtype;
    if (choice.path) return choice.path.endsWith(`/${task.exerciseId}.json`);
    return choice.id === task.exerciseId
      || (choice.category === 'reading' && `${choice.id}-${task.difficulty}` === task.exerciseId);
  });
}
