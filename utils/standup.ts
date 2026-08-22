import { TodoItem } from '@/types/todo';
import { SECTIONS } from '@/constants/sections';
import { formatDateForDisplay } from '@/utils/date';
import { calculateCompletionStreak } from '@/utils/streak';

export function generateStandupText(todos: TodoItem[], dateKey: string): string {
  const dayTasks = todos.filter((t) => t.date === dateKey);
  const completed = dayTasks.filter((t) => t.completed);
  const pending = dayTasks.filter((t) => !t.completed);
  const streak = calculateCompletionStreak(todos);
  const rate = dayTasks.length > 0 ? Math.round((completed.length / dayTasks.length) * 100) : 0;

  let text = `📋 Daily Standup • ${formatDateForDisplay(dateKey)}\n\n`;

  if (completed.length > 0) {
    text += `✅ COMPLETED (${completed.length}):\n`;
    completed.forEach((item) => {
      const section = SECTIONS[item.section]?.tabLabel || item.section;
      text += `• [${section}] ${item.text}\n`;
    });
    text += `\n`;
  }

  if (pending.length > 0) {
    text += `⏳ PENDING / IN PROGRESS (${pending.length}):\n`;
    pending.forEach((item) => {
      const section = SECTIONS[item.section]?.tabLabel || item.section;
      text += `• [${section}] ${item.text}\n`;
    });
    text += `\n`;
  }

  if (dayTasks.length === 0) {
    text += `No tasks recorded for this date.\n\n`;
  }

  text += `━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔥 Streak: ${streak} days | Completion: ${rate}%\n`;
  text += `Generated with Personal Todo App`;

  return text;
}
