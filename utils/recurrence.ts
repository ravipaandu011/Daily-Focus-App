import { RecurrenceType } from '@/types/todo';
import { parseDateKey, formatDateKey, addDaysToDateKey } from '@/utils/date';

export function calculateNextRecurrenceDate(currentDateKey: string, recurrence: RecurrenceType): string | null {
  if (recurrence === 'none') return null;

  const dateObj = parseDateKey(currentDateKey);

  if (recurrence === 'daily') {
    return addDaysToDateKey(currentDateKey, 1);
  }

  if (recurrence === 'weekdays') {
    let nextDate = new Date(dateObj);
    nextDate.setDate(nextDate.getDate() + 1);
    const dayOfWeek = nextDate.getDay(); // 0 = Sunday, 6 = Saturday

    if (dayOfWeek === 6) {
      // Saturday -> jump to Monday (+2 days)
      nextDate.setDate(nextDate.getDate() + 2);
    } else if (dayOfWeek === 0) {
      // Sunday -> jump to Monday (+1 day)
      nextDate.setDate(nextDate.getDate() + 1);
    }
    return formatDateKey(nextDate);
  }

  if (recurrence === 'weekly') {
    return addDaysToDateKey(currentDateKey, 7);
  }

  if (recurrence === 'monthly') {
    const nextDate = new Date(dateObj);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return formatDateKey(nextDate);
  }

  return null;
}
