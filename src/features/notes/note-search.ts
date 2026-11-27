import { NoteItem } from '@/features/notes/types';

/**
 * Notes whose title or body contain every word of the query (any order, ignoring case),
 * newest day first, and most recently edited first within a day.
 */
export function searchNotes(notes: NoteItem[], query: string): NoteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  return notes
    .filter((n) => {
      const text = `${n.title}\n${n.body}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1));
}
