import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { NoteItem } from '@/features/notes/types';
import { NOTES_ACCENT } from '@/features/notes/note-colors';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateForDisplay } from '@/utils/date';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface NoteActionSheetProps {
  note: NoteItem;
  onClose: () => void;
  onTogglePin: (note: NoteItem) => void;
  onMove: (note: NoteItem) => void;
  onShare: (note: NoteItem) => void;
  onCopy: (note: NoteItem) => void;
  onDelete: (note: NoteItem) => void;
}

/** Bottom sheet shown when a note card is long-pressed. Each action closes the sheet first. */
export const NoteActionSheet: React.FC<NoteActionSheetProps> = ({
  note,
  onClose,
  onTogglePin,
  onMove,
  onShare,
  onCopy,
  onDelete,
}) => {
  const theme = Colors[useColorScheme()];
  const insets = useSafeAreaInsets();
  const title = note.title.trim() || note.body.trim().split('\n')[0] || 'Untitled';

  const actions: { key: string; label: string; icon: IconName; color?: string; run: (n: NoteItem) => void }[] = [
    {
      key: 'pin',
      label: note.pinned ? 'Unpin' : 'Pin to top',
      icon: note.pinned ? 'pin' : 'pin-outline',
      color: NOTES_ACCENT,
      run: onTogglePin,
    },
    { key: 'move', label: 'Move to another day', icon: 'calendar-outline', run: onMove },
    { key: 'share', label: 'Share', icon: 'share-social-outline', run: onShare },
    { key: 'copy', label: 'Copy text', icon: 'copy-outline', run: onCopy },
    { key: 'delete', label: 'Delete', icon: 'trash-outline', color: theme.danger, run: onDelete },
  ];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                  paddingBottom: Math.max(insets.bottom, 12) + 8,
                },
              ]}>
              <View style={[styles.handle, { backgroundColor: theme.cardBorder }]} />
              <Text numberOfLines={1} style={[styles.title, { color: theme.text }]}>
                {title}
              </Text>
              <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{formatDateForDisplay(note.date)}</Text>

              {actions.map((action) => (
                <TouchableOpacity
                  key={action.key}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                  activeOpacity={0.7}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    onClose();
                    action.run(note);
                  }}
                  style={styles.row}>
                  <Ionicons name={action.icon} size={20} color={action.color ?? theme.text} />
                  <Text style={[styles.rowLabel, { color: action.key === 'delete' ? theme.danger : theme.text }]}>
                    {action.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
});
