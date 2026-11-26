import React, { useState } from 'react';
import { Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TODO_CONFIG } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTheme } from '@/context/theme-context';
import { useTodos } from '@/features/tasks/use-todos';
import { useNotes } from '@/features/notes/notes-context';
import { SettingsBackupModal } from '@/features/settings/components/settings-backup-modal';
import { RecycleBinModal } from '@/features/settings/components/recycle-bin-modal';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface AppHeaderProps {
  /** Icon inside the gradient badge: the same icon the tab uses in the bottom bar. */
  icon: IconName;
  /** Icon size inside the 34px badge (circled glyphs read better slightly larger). */
  iconSize?: number;
  /** Which list the Recycle Bin opens on. */
  binTab?: 'tasks' | 'notes';
}

/**
 * The "Daily Focus" header shared by the Todo and Notes tabs: badge, title, theme toggle,
 * and the Settings button (Settings, Backup & Restore, and the Recycle Bin open from here).
 */
export const AppHeader: React.FC<AppHeaderProps> = ({ icon, iconSize = 17, binTab = 'tasks' }) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const { toggleTheme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0);

  const {
    todos,
    binTodos,
    importBackupData,
    restoreFromBin,
    restoreBatchFromBin,
    deletePermanently,
    deletePermanentlyBatch,
    emptyBin,
  } = useTodos();
  const { binNotes, restoreNotesFromBin, deleteNotesPermanently, emptyNoteBin } = useNotes();

  const [settingsVisible, setSettingsVisible] = useState(false);
  const [binVisible, setBinVisible] = useState(false);

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLeftRow}>
          <LinearGradient
            colors={TODO_CONFIG.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIconBadge}>
            <Ionicons name={icon} size={iconSize} color={TODO_CONFIG.onGradient} />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Focus</Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Dark / Light theme toggle */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
            activeOpacity={0.75}
            onPress={async () => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await toggleTheme();
            }}
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={15} color={isDark ? '#F59E0B' : '#8B5CF6'} />
          </TouchableOpacity>

          {/* Settings */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Settings"
            activeOpacity={0.75}
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.selectionAsync();
              setSettingsVisible(true);
            }}
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="settings-outline" size={15} color={isDark ? '#6EE7B7' : TODO_CONFIG.color} />
          </TouchableOpacity>
        </View>
      </View>

      {settingsVisible && (
        <SettingsBackupModal
          visible={settingsVisible}
          todos={todos}
          binTodos={binTodos}
          binNotesCount={binNotes.length}
          onClose={() => setSettingsVisible(false)}
          onImportBackup={importBackupData}
          onOpenBin={() => setBinVisible(true)}
        />
      )}

      {binVisible && (
        <RecycleBinModal
          visible={binVisible}
          binTodos={binTodos}
          onClose={() => setBinVisible(false)}
          onRestore={restoreFromBin}
          onRestoreBatch={restoreBatchFromBin}
          onDeletePermanently={deletePermanently}
          onDeletePermanentlyBatch={deletePermanentlyBatch}
          onEmptyBin={emptyBin}
          initialTab={binTab}
          binNotes={binNotes}
          onRestoreNotes={restoreNotesFromBin}
          onDeleteNotesPermanently={deleteNotesPermanently}
          onEmptyNoteBin={emptyNoteBin}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  headerIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
});
