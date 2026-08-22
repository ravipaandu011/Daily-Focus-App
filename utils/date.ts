export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function getTodayKey(): string {
  return formatDateKey(new Date());
}

export function getYesterdayKey(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return formatDateKey(d);
}

export function getTomorrowKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateKey(d);
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return formatDateKey(date);
}

export function getRelativeDayLabel(dateKey: string): string | null {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const tomorrow = getTomorrowKey();

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';
  if (dateKey === tomorrow) return 'Tomorrow';
  return null;
}

export function formatDateForDisplay(dateKey: string): string {
  const date = parseDateKey(dateKey);
  const relative = getRelativeDayLabel(dateKey);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  };
  const formatted = date.toLocaleDateString('en-US', options);

  if (relative) {
    return `${relative} • ${formatted}`;
  }
  return formatted;
}

export function formatMonthYear(dateKey: string): string {
  const date = parseDateKey(dateKey);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function getDateParts(dateKey: string): {
  weekday: string;
  dayNumber: string;
  month: string;
  relative: string | null;
} {
  const date = parseDateKey(dateKey);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = String(date.getDate());
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const relative = getRelativeDayLabel(dateKey);
  return { weekday, dayNumber, month, relative };
}

export function getSurroundingDateKeys(centerDateKey: string, pastDays = 3, futureDays = 10): string[] {
  const keys: string[] = [];
  for (let i = -pastDays; i <= futureDays; i++) {
    keys.push(addDaysToDateKey(centerDateKey, i));
  }
  return keys;
}
