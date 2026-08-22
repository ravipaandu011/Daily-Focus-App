import AsyncStorage from '@react-native-async-storage/async-storage';
import { RoutineTemplate } from '@/types/todo';

const CUSTOM_ROUTINES_KEY = '@personal_todo_custom_routines_v1';

export const DEFAULT_ROUTINES: RoutineTemplate[] = [
  {
    id: 'routine_work_startup',
    title: 'Work Startup Checklist',
    emoji: '💼',
    section: 'work',
    tasks: [
      'Inbox zero: triage emails & messages',
      'Post daily standup update',
      'Identify top 3 critical deliverables',
      'Block 45m deep work focus session',
    ],
  },
  {
    id: 'routine_gym_split',
    title: 'Workout & Fitness Routine',
    emoji: '🏋️',
    section: 'gym',
    tasks: [
      '10 mins dynamic warmup & mobility',
      'Target muscle group strength workout',
      '15 mins cardio session',
      'Hydrate & post-workout stretch',
    ],
  },
  {
    id: 'routine_edu_study',
    title: 'Daily Deep Learning Split',
    emoji: '📚',
    section: 'education',
    tasks: [
      'Review previous lesson notes',
      'Complete 1 course module / chapter',
      'Practice 2 coding / practical problems',
      'Write down 3 key takeaways',
    ],
  },
  {
    id: 'routine_home_reset',
    title: 'Home Reset & Tidy',
    emoji: '🏠',
    section: 'home',
    tasks: [
      'Wipe down kitchen & workspaces',
      'Tidy up bedroom & make bed',
      'Take out trash & recycling',
      'Water indoor plants',
    ],
  },
  {
    id: 'routine_personal_wellness',
    title: 'Daily Wellness & Mindset',
    emoji: '🎯',
    section: 'personal',
    tasks: [
      '10 mins mindfulness meditation',
      'Drink 1 large glass of water',
      'Read 20 pages of non-fiction book',
      'Reflect on 3 things grateful for',
    ],
  },
];

export async function loadCustomRoutines(): Promise<RoutineTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_ROUTINES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomRoutine(routine: RoutineTemplate): Promise<RoutineTemplate[]> {
  try {
    const current = await loadCustomRoutines();
    const updated = [routine, ...current.filter((r) => r.id !== routine.id)];
    await AsyncStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export async function deleteCustomRoutine(id: string): Promise<RoutineTemplate[]> {
  try {
    const current = await loadCustomRoutines();
    const updated = current.filter((r) => r.id !== id);
    await AsyncStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}
