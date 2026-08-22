import { TodoItem } from '@/types/todo';
import { getTodayKey, addDaysToDateKey } from '@/utils/date';

export function calculateCompletionStreak(todos: TodoItem[]): number {
  const completedDates = new Set<string>();

  todos.forEach((item) => {
    if (item.completed && item.date) {
      completedDates.add(item.date);
    }
  });

  if (completedDates.size === 0) return 0;

  const today = getTodayKey();
  let streak = 0;
  let currentDate = today;

  // Check if today has at least 1 completed task
  if (completedDates.has(today)) {
    streak++;
    currentDate = addDaysToDateKey(today, -1);
  } else {
    // If not today, check if yesterday was completed to keep the streak alive
    const yesterday = addDaysToDateKey(today, -1);
    if (completedDates.has(yesterday)) {
      currentDate = yesterday;
    } else {
      return 0;
    }
  }

  // Count backwards
  while (completedDates.has(currentDate)) {
    streak++;
    currentDate = addDaysToDateKey(currentDate, -1);
  }

  return streak;
}
