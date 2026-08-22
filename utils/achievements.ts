import { TodoItem, AchievementBadge } from '@/types/todo';
import { calculateCompletionStreak } from '@/utils/streak';

export function computeAchievements(todos: TodoItem[]): AchievementBadge[] {
  const completedTasks = todos.filter((t) => t.completed);
  const totalCompleted = completedTasks.length;
  const streak = calculateCompletionStreak(todos);

  // Count completed subtasks
  let completedSubtasks = 0;
  todos.forEach((t) => {
    t.subtasks?.forEach((st) => {
      if (st.completed) completedSubtasks++;
    });
  });

  // Check if any recurring task exists
  const hasRecurring = todos.some((t) => t.recurrence && t.recurrence !== 'none');

  // Check flawless day (at least 3 tasks on a date, all completed)
  const dateCounts: Record<string, { total: number; completed: number }> = {};
  todos.forEach((t) => {
    if (!dateCounts[t.date]) {
      dateCounts[t.date] = { total: 0, completed: 0 };
    }
    dateCounts[t.date].total++;
    if (t.completed) dateCounts[t.date].completed++;
  });
  const hasFlawlessDay = Object.values(dateCounts).some(
    (d) => d.total >= 3 && d.completed === d.total
  );

  const badges: AchievementBadge[] = [
    {
      id: 'badge_first_task',
      title: 'First Step',
      description: 'Complete your first task',
      emoji: '🚀',
      progress: Math.min(totalCompleted, 1),
      maxProgress: 1,
      unlocked: totalCompleted >= 1,
    },
    {
      id: 'badge_momentum',
      title: 'Momentum',
      description: 'Complete 10 total tasks',
      emoji: '⚡',
      progress: Math.min(totalCompleted, 10),
      maxProgress: 10,
      unlocked: totalCompleted >= 10,
    },
    {
      id: 'badge_centurion',
      title: 'Centurion',
      description: 'Complete 50 total tasks',
      emoji: '🎯',
      progress: Math.min(totalCompleted, 50),
      maxProgress: 50,
      unlocked: totalCompleted >= 50,
    },
    {
      id: 'badge_streak_master',
      title: 'Streak Master',
      description: 'Maintain a 7-day completion streak',
      emoji: '🔥',
      progress: Math.min(streak, 7),
      maxProgress: 7,
      unlocked: streak >= 7,
    },
    {
      id: 'badge_flawless_day',
      title: 'Flawless Day',
      description: 'Finish all tasks in a day (min 3 tasks)',
      emoji: '🏆',
      progress: hasFlawlessDay ? 1 : 0,
      maxProgress: 1,
      unlocked: hasFlawlessDay,
    },
    {
      id: 'badge_detail_oriented',
      title: 'Detail Oriented',
      description: 'Complete 5 subtask checklist items',
      emoji: '📋',
      progress: Math.min(completedSubtasks, 5),
      maxProgress: 5,
      unlocked: completedSubtasks >= 5,
    },
    {
      id: 'badge_habit_builder',
      title: 'Habit Builder',
      description: 'Set up an auto-repeating task',
      emoji: '🔁',
      progress: hasRecurring ? 1 : 0,
      maxProgress: 1,
      unlocked: hasRecurring,
    },
  ];

  return badges;
}
