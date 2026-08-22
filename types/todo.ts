export type DefaultSectionKey = 'work' | 'education' | 'gym' | 'home' | 'personal';
export type SectionKey = DefaultSectionKey | (string & {});

export interface CustomCategory {
  id: string;
  key: string;
  title: string;
  emoji: string;
  color: string;
  gradient: [string, string];
  lightBg: string;
  accentColor: string;
  iconName: string;
  createdAt: number;
}

export type StatusFilter = 'all' | 'pending' | 'completed';

export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

export type RecurrenceType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export interface SubtaskItem {
  id: string;
  title: string;
  completed: boolean;
}

export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  section: SectionKey;
  date: string; // 'YYYY-MM-DD'
  pinned?: boolean;
  priority?: PriorityLevel;
  tag?: string; // e.g. '15m', '30m', '1h', 'urgent', 'idea'
  recurrence?: RecurrenceType;
  subtasks?: SubtaskItem[];
  notes?: string;
  order?: number;
  deletedAt?: number;
}

export interface RoutineTemplate {
  id: string;
  title: string;
  emoji: string;
  section: SectionKey;
  tasks: string[];
  isCustom?: boolean;
}

export interface AchievementBadge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
}
