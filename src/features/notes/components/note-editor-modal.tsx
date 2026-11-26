import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NoteColor, NoteItem } from '@/features/notes/types';
import { NOTE_COLORS, NOTES_ACCENT, getNoteColor } from '@/features/notes/note-colors';
import { TODO_CONFIG } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotes } from '@/features/notes/notes-context';
import { CalendarModal } from '@/components/calendar-modal';
import { formatDateForDisplay, formatRelativeTime } from '@/utils/date';
import { shareNote } from '@/features/notes/note-share';

interface NoteEditorModalProps {
  /** The note to edit, or null to write a new one. */
  note: NoteItem | null;
  /** Day a new note is written for ('YYYY-MM-DD'). Ignored when editing an existing note. */
  date: string;
  /** Called when the editor closes; `date` is the note's final day (it may have been moved). */
  onClose: (result?: { date: string }) => void;
  /** Delete the note (the screen removes it and offers Undo). */
  onDelete: (note: NoteItem) => void;
}

const AUTOSAVE_DELAY_MS = 500;

/**
 * Full-screen note editor. Changes save automatically while typing and on close;
 * a note left with no title and no text is discarded.
 * Render it only while open (it initializes from `note` on mount).
 */
export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({ note, date, onClose, onDelete }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  const { notes, createNote, updateNote, deleteNote } = useNotes();

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [color, setColor] = useState<NoteColor>(note?.color ?? 'default');
  const [pinned, setPinned] = useState(note?.pinned ?? false);
  const [showColors, setShowColors] = useState(false);
  const [noteDate, setNoteDate] = useState(note?.date ?? date);
  const [dayPickerVisible, setDayPickerVisible] = useState(false);
  const [lastEditedAt, setLastEditedAt] = useState<number | null>(note?.updatedAt ?? null);

  const noteIdRef = useRef<string | null>(note?.id ?? null);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(note?.id ?? null);
  const lastSavedRef = useRef(JSON.stringify({ title, body, color, pinned, noteDate }));
  const bodyInputRef = useRef<TextInputInstance>(null);

  const isEmpty = title.trim() === '' && body.trim() === '';

  // Days that already have notes, marked in the move-to-day calendar.
  const dayDots = useMemo(() => {
    const dots: Record<string, string> = {};
    notes.forEach((n) => {
      dots[n.date] = TODO_CONFIG.color;
    });
    return dots;
  }, [notes]);

  const persist = useCallback(() => {
    const snapshot = JSON.stringify({ title, body, color, pinned, noteDate });
    if (snapshot === lastSavedRef.current) return;
    if (title.trim() === '' && body.trim() === '') return; // never create or save an empty note
    if (noteIdRef.current) {
      updateNote(noteIdRef.current, { title, body, color, pinned, date: noteDate });
    } else {
      noteIdRef.current = createNote({ title, body, color, pinned, date: noteDate }).id;
      setSavedNoteId(noteIdRef.current);
    }
    lastSavedRef.current = snapshot;
    setLastEditedAt(Date.now());
  }, [title, body, color, pinned, noteDate, createNote, updateNote]);

  // Autosave shortly after the user stops typing or changes color/pin.
  useEffect(() => {
    const timer = setTimeout(persist, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [persist]);

  /** Closes the editor and the keyboard (otherwise it stays open over the notes list). */
  const closeEditor = (result?: { date: string }) => {
    Keyboard.dismiss();
    onClose(result);
  };

  const handleClose = () => {
    if (isEmpty) {
      // An emptied note goes to the Recycle Bin with its last saved text, so it can be recovered.
      const saved = noteIdRef.current ? notes.find((n) => n.id === noteIdRef.current) : undefined;
      if (saved) deleteNote(saved);
      closeEditor();
      return;
    }
    persist();
    closeEditor({ date: noteDate });
  };

  /** Save button: saves now and closes the editor. */
  const handleSave = () => {
    if (isEmpty) return;
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    persist();
    closeEditor({ date: noteDate });
  };

  const handleTogglePin = () => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setPinned((p) => !p);
  };

  const handleSelectColor = (key: NoteColor) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setColor(key);
  };

  const handleDelete = () => {
    const id = noteIdRef.current;
    if (!id) return;
    // Hand the latest content to the screen so Undo restores exactly what was on screen.
    const saved = notes.find((n) => n.id === id);
    const now = Date.now();
    onDelete({
      id,
      title,
      body,
      color,
      pinned,
      date: noteDate,
      createdAt: saved?.createdAt ?? note?.createdAt ?? now,
      updatedAt: now,
    });
    closeEditor();
  };

  const colorConfig = getNoteColor(color);
  const background = color === 'default' ? theme.background : isDark ? colorConfig.darkBg : colorConfig.lightBg;
  const iconColor = theme.text;
  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined}
      statusBarTranslucent
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: background }]}
        // Android too: with edge-to-edge the window no longer resizes for the keyboard.
        behavior="padding">
        {/* Toolbar */}
        <View style={[styles.toolbar, { paddingTop: (Platform.OS === 'ios' ? 12 : topInset) + 6 }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close note"
            onPress={handleClose}
            hitSlop={10}
            style={styles.toolbarBtn}>
            <Ionicons name="chevron-back" size={24} color={iconColor} />
          </TouchableOpacity>

          {/* Tap the day to move the note to another day */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Note day: ${formatDateForDisplay(noteDate)}. Change day`}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setDayPickerVisible(true);
            }}
            style={styles.dayButton}>
            <Text numberOfLines={1} style={[styles.dayLabel, { color: theme.textSecondary }]}>
              {formatDateForDisplay(noteDate)}
            </Text>
            <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
          </TouchableOpacity>

          <View style={styles.toolbarRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={pinned ? 'Unpin note' : 'Pin note'}
              onPress={handleTogglePin}
              hitSlop={8}
              style={styles.toolbarBtn}>
              <Ionicons name={pinned ? 'pin' : 'pin-outline'} size={21} color={pinned ? NOTES_ACCENT : iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Change note color"
              onPress={() => setShowColors((s) => !s)}
              hitSlop={8}
              style={styles.toolbarBtn}>
              <Ionicons name={showColors ? 'color-palette' : 'color-palette-outline'} size={21} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Share note"
              disabled={isEmpty}
              onPress={() => shareNote({ title, body })}
              hitSlop={8}
              style={[styles.toolbarBtn, isEmpty && styles.disabled]}>
              <Ionicons name="share-social-outline" size={21} color={iconColor} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete note"
              disabled={!savedNoteId}
              onPress={handleDelete}
              hitSlop={8}
              style={[styles.toolbarBtn, !savedNoteId && styles.disabled]}>
              <Ionicons name="trash-outline" size={21} color={theme.danger} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Save note"
              accessibilityState={{ disabled: isEmpty }}
              disabled={isEmpty}
              onPress={handleSave}
              hitSlop={6}
              style={[styles.saveBtn, { backgroundColor: NOTES_ACCENT }, isEmpty && styles.disabled]}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Color picker */}
        {showColors && (
          <View style={styles.colorRow}>
            {NOTE_COLORS.map((c) => {
              const selected = c.key === color;
              return (
                <TouchableOpacity
                  key={c.key}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.label} color`}
                  accessibilityState={{ selected }}
                  onPress={() => handleSelectColor(c.key)}
                  style={[
                    styles.swatch,
                    {
                      backgroundColor: c.key === 'default' ? theme.card : isDark ? c.darkBg : c.lightBg,
                      borderColor: selected ? c.accent : theme.cardBorder,
                      borderWidth: selected ? 2.5 : 1,
                    },
                  ]}>
                  {c.key === 'default' ? (
                    <Ionicons name="ban-outline" size={14} color={theme.textMuted} />
                  ) : (
                    <View style={[styles.swatchDot, { backgroundColor: c.accent }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Title & body */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={theme.textMuted}
          style={[styles.titleInput, { color: theme.text }]}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => bodyInputRef.current?.focus()}
          maxLength={200}
          autoFocus={!note}
        />
        <TextInput
          ref={bodyInputRef}
          value={body}
          onChangeText={setBody}
          placeholder="Start writing..."
          placeholderTextColor={theme.textMuted}
          style={[styles.bodyInput, { color: theme.text }]}
          multiline
          textAlignVertical="top"
          scrollEnabled
        />

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {lastEditedAt ? `Edited ${formatRelativeTime(lastEditedAt)}` : 'New note'}
          </Text>
          <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {dayPickerVisible && (
        <CalendarModal
          visible
          selectedDate={noteDate}
          dotColors={dayDots}
          onSelectDate={setNoteDate}
          onClose={() => setDayPickerVisible(false)}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  toolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  toolbarBtn: {
    width: 36,
    height: 40,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 17,
    marginLeft: 4,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  swatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  dayLabel: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  bodyInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
