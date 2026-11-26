import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NoteItem } from '@/features/notes/types';
import { NOTES_ACCENT, getNoteColor } from '@/features/notes/note-colors';
import { Colors } from '@/constants/theme';
import { formatRelativeTime } from '@/utils/date';

interface NoteCardProps {
  note: NoteItem;
  isDark: boolean;
  onPress: (note: NoteItem) => void;
  onLongPress: (note: NoteItem) => void;
  onTogglePin: (id: string) => void;
}

const NoteCardComponent: React.FC<NoteCardProps> = ({ note, isDark, onPress, onLongPress, onTogglePin }) => {
  const theme = Colors[isDark ? 'dark' : 'light'];
  const colorConfig = getNoteColor(note.color);
  const isDefault = note.color === 'default';
  const title = note.title.trim();
  const body = note.body.trim();

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Note: ${title || body.slice(0, 40) || 'Untitled'}`}
      accessibilityHint="Opens the note. Long-press for pin, move, share, copy and delete."
      activeOpacity={0.85}
      onPress={() => onPress(note)}
      onLongPress={() => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(note);
      }}
      delayLongPress={350}
      style={[
        styles.card,
        {
          backgroundColor: isDefault ? theme.card : isDark ? colorConfig.darkBg : colorConfig.lightBg,
          borderColor: isDefault ? theme.cardBorder : `${colorConfig.accent}55`,
        },
      ]}>
      {!isDefault && <View style={[styles.stripe, { backgroundColor: colorConfig.accent }]} />}

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text
            numberOfLines={1}
            style={[styles.title, { color: title ? theme.text : theme.textMuted }]}>
            {title || 'Untitled'}
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={note.pinned ? 'Unpin note' : 'Pin note'}
            hitSlop={10}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              onTogglePin(note.id);
            }}>
            <Ionicons
              name={note.pinned ? 'pin' : 'pin-outline'}
              size={17}
              color={note.pinned ? NOTES_ACCENT : theme.textMuted}
            />
          </TouchableOpacity>
        </View>

        {body.length > 0 && (
          <Text numberOfLines={4} style={[styles.body, { color: theme.textSecondary }]}>
            {body}
          </Text>
        )}

        <Text style={[styles.meta, { color: theme.textMuted }]}>
          Edited {formatRelativeTime(note.updatedAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export const NoteCard = React.memo(NoteCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  stripe: {
    width: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  meta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});
