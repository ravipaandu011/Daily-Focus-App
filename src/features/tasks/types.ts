export type SectionKey = string;

export type PriorityLevel = 'high' | 'medium' | 'low' | 'none';

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
  /** Legacy grouping value (always TODO_SECTION_KEY for new tasks); not used by the UI. */
  section: SectionKey;
  date: string; // 'YYYY-MM-DD'
  pinned?: boolean;
  priority?: PriorityLevel;
  tag?: string; // e.g. '15m', '30m', '1h', 'urgent', 'idea'
  subtasks?: SubtaskItem[];
  notes?: string;
  deletedAt?: number;
}
