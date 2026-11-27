import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NoteItem } from '@/features/notes/types';
import { NOTES_ACCENT, NOTES_GRADIENT, NOTES_ON_GRADIENT } from '@/features/notes/note-colors';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotes } from '@/features/notes/notes-context';
import { NoteCard } from '@/features/notes/components/note-card';
import { NoteEditorModal } from '@/features/notes/components/note-editor-modal';
import { NoteActionSheet } from '@/features/notes/components/note-action-sheet';
import { UndoToast } from '@/components/undo-toast';
import { useFloatingBarLayout } from '@/components/floating-tab-bar';
import { AppHeader } from '@/components/app-header';
import { EmptyState } from '@/components/empty-state';
import { DateNavigator } from '@/components/date-navigator';
import { CalendarModal } from '@/components/calendar-modal';
import { TODO_CONFIG } from '@/constants/sections';
import { formatDateForDisplay, getTodayKey } from '@/utils/date';
import { copyNote, shareNote } from '@/features/notes/note-share';
import { searchNotes } from '@/features/notes/note-search';

/** "Today • Fri, Nov 27", with the year added for other years. */
function formatResultDay(dateKey: string): string {
  const label = formatDateForDisplay(dateKey);
  const year = dateKey.slice(0, 4);
  return year === getTodayKey().slice(0, 4) ? label : `${label}, ${year}`;
}

type Row =
  | { type: 'header'; key: string; label: string }
  | { type: 'note'; key: string; note: NoteItem };

export const NotesScreen: React.FC = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const dock = useFloatingBarLayout();

  const { notes, isLoading, togglePinNote, updateNote, deleteNote, restoreNote } = useNotes();
  const [selectedDate, setSelectedDate] = useState(getTodayKey);
  const [calendarVisible, setCalendarVisible] = useState(false);
  // undefined = editor closed, null = new note, NoteItem = editing that note
  const [editing, setEditing] = useState<NoteItem | null | undefined>(undefined);
  const [actionNote, setActionNote] = useState<NoteItem | null>(null);
  const [movingNote, setMovingNote] = useState<NoteItem | null>(null);
  const [deletedNote, setDeletedNote] = useState<NoteItem | null>(null);
  // null = search closed; a string (even empty) = search open with that text.
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const isSearching = searchQuery !== null;

  // Android back closes the search first.
  useEffect(() => {
    if (!isSearching) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSearchQuery(null);
      return true;
    });
    return () => sub.remove();
  }, [isSearching]);

  const dayNotes = useMemo(() => notes.filter((n) => n.date === selectedDate), [notes, selectedDate]);

  // Days that have notes: dots in the day scroller and the month calendar.
  const dotColors = useMemo(() => {
    const colors: Record<string, string> = {};
    notes.forEach((n) => {
      colors[n.date] = TODO_CONFIG.color;
    });
    return colors;
  }, [notes]);

  const searchRows = useMemo<Row[]>(() => {
    if (!searchQuery?.trim()) return [];
    const out: Row[] = [];
    let lastDate = '';
    for (const note of searchNotes(notes, searchQuery)) {
      if (note.date !== lastDate) {
        out.push({ type: 'header', key: `h_${note.date}`, label: formatResultDay(note.date) });
        lastDate = note.date;
      }
      out.push({ type: 'note', key: note.id, note });
    }
    return out;
  }, [notes, searchQuery]);

  const dayRows = useMemo<Row[]>(() => {
    const pinned = dayNotes.filter((n) => n.pinned);
    const others = dayNotes.filter((n) => !n.pinned);
    const toRows = (list: NoteItem[]): Row[] => list.map((note) => ({ type: 'note', key: note.id, note }));
    if (pinned.length === 0) return toRows(others);
    return [
      { type: 'header', key: 'h_pinned', label: 'Pinned' },
      ...toRows(pinned),
      ...(others.length > 0 ? [{ type: 'header', key: 'h_others', label: 'Others' } as Row, ...toRows(others)] : []),
    ];
  }, [dayNotes]);

  const rows = isSearching ? searchRows : dayRows;

  const handleNewNote = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditing(null);
  };

  const handleOpenNote = useCallback((note: NoteItem) => setEditing(note), []);
  const handleLongPress = useCallback((note: NoteItem) => setActionNote(note), []);

  /** Moves the note to the Recycle Bin; the Undo bar can also bring it back right away. */
  const handleDelete = useCallback(
    (note: NoteItem) => {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      deleteNote(note);
      setDeletedNote(note);
    },
    [deleteNote]
  );

  const handleUndoDelete = () => {
    if (deletedNote) restoreNote(deletedNote);
    setDeletedNote(null);
  };

  const handleMoveToDate = (dateKey: string) => {
    if (!movingNote) return;
    if (dateKey !== movingNote.date) updateNote(movingNote.id, { date: dateKey });
    setSelectedDate(dateKey); // follow the note to its new day
  };

  const renderRow = ({ item }: { item: Row }) => {
    if (item.type === 'header') {
      return <Text style={[styles.groupLabel, { color: theme.textSecondary }]}>{item.label}</Text>;
    }
    return (
      <NoteCard
        note={item.note}
        isDark={isDark}
        onPress={handleOpenNote}
        onLongPress={handleLongPress}
        onTogglePin={togglePinNote}
      />
    );
  };

  const deletedTitle = deletedNote ? deletedNote.title.trim() || deletedNote.body.trim().split('\n')[0] || 'Note' : '';
  const undoMessage =
    deletedTitle.length > 22 ? `"${deletedTitle.slice(0, 22)}…" moved to bin` : `"${deletedTitle}" moved to bin`;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <AppHeader icon="document-text" binTab="notes" onSearch={() => setSearchQuery((q) => q ?? '')} />

      {isSearching ? (
        /* Search bar: searches every day's notes */
        <View style={[styles.searchBar, { backgroundColor: theme.inputBg, borderColor: theme.inputBorder }]}>
          <Ionicons name="search" size={16} color={theme.textSecondary} />
          <TextInput
            autoFocus
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search all notes"
            placeholderTextColor={theme.textMuted}
            returnKeyType="search"
            autoCorrect={false}
            style={[styles.searchInput, { color: theme.text }]}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close search"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setSearchQuery(null)}>
            <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        /* Day scroller + month label (tap the calendar icon for the month view) */
        <DateNavigator
          selectedDate={selectedDate}
          sectionConfig={TODO_CONFIG}
          dotColors={dotColors}
          onSelectDate={setSelectedDate}
          onOpenCalendar={() => {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            setCalendarVisible(true);
          }}
        />
      )}

      {isLoading && notes.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NOTES_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          renderItem={renderRow}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.listContent, { paddingBottom: dock.contentInset }, rows.length === 0 && styles.listEmpty]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardDismissMode="on-drag"
          ListEmptyComponent={
            isSearching ? (
              searchQuery.trim() ? (
                <EmptyState
                  icon="search-outline"
                  title="No matching notes"
                  subtitle="Try fewer or different words. Search looks at note titles and text on every day."
                />
              ) : (
                <EmptyState
                  icon="search-outline"
                  title="Search your notes"
                  subtitle="Type a word to find it in any note, on any day."
                />
              )
            ) : (
              <EmptyState
                icon="document-text-outline"
                title="No notes for this day"
                subtitle="Tap the + button to write a note for this day. Notes save automatically."
              />
            )
          }
        />
      )}

      {/* Floating New Note Button (sits beside the tab bar) */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="New note"
        activeOpacity={0.88}
        onPress={handleNewNote}
        style={[styles.fab, { bottom: dock.bottom, right: dock.fabRight, shadowColor: NOTES_ACCENT }]}>
        <LinearGradient
          colors={NOTES_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fabGradient, { width: dock.fabSize, height: dock.fabSize, borderRadius: dock.fabSize / 2 }]}>
          <Ionicons name="add" size={28} color={NOTES_ON_GRADIENT} />
        </LinearGradient>
      </TouchableOpacity>

      <UndoToast
        visible={deletedNote !== null}
        message={undoMessage}
        onUndo={handleUndoDelete}
        onDismiss={() => setDeletedNote(null)}
      />

      {editing !== undefined && (
        <NoteEditorModal
          note={editing}
          date={selectedDate}
          onClose={(result) => {
            setEditing(undefined);
            // If the note was moved to another day in the editor, follow it there.
            if (result?.date && result.date !== selectedDate) setSelectedDate(result.date);
          }}
          onDelete={handleDelete}
        />
      )}

      {actionNote && (
        <NoteActionSheet
          note={actionNote}
          onClose={() => setActionNote(null)}
          onTogglePin={(n) => togglePinNote(n.id)}
          onMove={setMovingNote}
          onShare={shareNote}
          onCopy={copyNote}
          onDelete={handleDelete}
        />
      )}

      {/* Month calendar: browse days */}
      {calendarVisible && (
        <CalendarModal
          visible={calendarVisible}
          selectedDate={selectedDate}
          dotColors={dotColors}
          onSelectDate={setSelectedDate}
          onClose={() => setCalendarVisible(false)}
        />
      )}

      {/* Month calendar: pick the day to move a note to */}
      {movingNote && (
        <CalendarModal
          visible
          selectedDate={movingNote.date}
          dotColors={dotColors}
          onSelectDate={handleMoveToDate}
          onClose={() => setMovingNote(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  listEmpty: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
  groupLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 6,
    marginLeft: 4,
  },
  fab: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  fabGradient: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
});
