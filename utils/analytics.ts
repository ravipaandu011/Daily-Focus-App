import { TodoItem, SectionKey } from '@/types/todo';
import { SECTIONS } from '@/constants/sections';
import { getTodayKey, addDaysToDateKey, parseDateKey } from '@/utils/date';
import { calculateCompletionStreak } from '@/utils/streak';

export interface DayActivity {
  dateKey: string;
  dayLabel: string;
  shortDate: string;
  completed: number;
  total: number;
}

export interface CategoryStat {
  sectionKey: SectionKey;
  title: string;
  emoji: string;
  color: string;
  gradient: [string, string];
  completedCount: number;
  totalCount: number;
  percentage: number;
}

export interface AnalyticsSummary {
  weeklyActivity: DayActivity[];
  categoryBreakdown: CategoryStat[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  completionRate: number;
  currentStreak: number;
  mostProductiveCategory: string;
}

export function computeAnalytics(todos: TodoItem[]): AnalyticsSummary {
  const today = getTodayKey();
  const days: DayActivity[] = [];

  // Last 7 days (including today)
  for (let i = 6; i >= 0; i--) {
    const dKey = addDaysToDateKey(today, -i);
    const dateObj = parseDateKey(dKey);
    const dayLabel = i === 0 ? 'Today' : dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });

    const dayTasks = todos.filter((t) => t.date === dKey);
    const completed = dayTasks.filter((t) => t.completed).length;

    days.push({
      dateKey: dKey,
      dayLabel,
      shortDate,
      completed,
      total: dayTasks.length,
    });
  }

  // Category stats
  const sectionKeys: SectionKey[] = ['work', 'education', 'gym', 'home', 'personal'];
  const totalCompletedAll = todos.filter((t) => t.completed).length;

  const categoryBreakdown: CategoryStat[] = sectionKeys.map((key) => {
    const config = SECTIONS[key];
    const sectionTasks = todos.filter((t) => t.section === key);
    const completedCount = sectionTasks.filter((t) => t.completed).length;
    const totalCount = sectionTasks.length;
    const percentage = totalCompletedAll > 0 ? Math.round((completedCount / totalCompletedAll) * 100) : 0;

    return {
      sectionKey: key,
      title: config.tabLabel,
      emoji: config.emoji,
      color: config.color,
      gradient: config.gradient,
      completedCount,
      totalCount,
      percentage,
    };
  });

  // Sort categories by completed count desc
  const sortedCategories = [...categoryBreakdown].sort((a, b) => b.completedCount - a.completedCount);
  const mostProductiveCategory = sortedCategories[0]?.completedCount > 0
    ? `${sortedCategories[0].emoji} ${sortedCategories[0].title}`
    : 'None yet';

  const totalTasks = todos.length;
  const completedTasks = totalCompletedAll;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const currentStreak = calculateCompletionStreak(todos);

  return {
    weeklyActivity: days,
    categoryBreakdown,
    totalTasks,
    completedTasks,
    pendingTasks,
    completionRate,
    currentStreak,
    mostProductiveCategory,
  };
}
