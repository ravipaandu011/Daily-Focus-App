export type NoteColor = 'default' | 'blue' | 'green' | 'yellow' | 'pink' | 'purple';

export interface NoteItem {
  id: string;
  title: string;
  body: string;
  color: NoteColor;
  pinned: boolean;
  /** The day this note belongs to ('YYYY-MM-DD'). */
  date: string;
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

/** A deleted note waiting in the Recycle Bin. */
export interface BinNote extends NoteItem {
  deletedAt: number; // epoch ms
}
