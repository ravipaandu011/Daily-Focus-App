import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionKey, TodoItem, RecurrenceType, SubtaskItem } from '@/types/todo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAppTheme } from '@/context/theme-context';
import { useTodos } from '@/hooks/use-todos';
import { TaskList } from '@/components/task-list';
import { DateNavigator } from '@/components/date-navigator';
import { TaskFilterBar } from '@/components/task-filter-bar';
import { RolloverBanner } from '@/components/rollover-banner';
import { UndoToast } from '@/components/undo-toast';
import { AddTaskModal } from '@/components/add-task-modal';
import { EditTaskModal } from '@/components/edit-task-modal';
import { StreakModal } from '@/components/streak-modal';
import { RecycleBinModal } from '@/components/recycle-bin-modal';
import { AnalyticsModal } from '@/components/analytics-modal';
import { SettingsBackupModal } from '@/components/settings-backup-modal';
import { FocusTimerModal } from '@/components/focus-timer-modal';
import { CalendarModal } from '@/components/calendar-modal';
import { TaskTransferModal } from '@/components/task-transfer-modal';
import { ConfettiCelebration } from '@/components/confetti-celebration';
import { CategoryManagerModal } from '@/components/category-manager-modal';
import { AuthModal } from '@/components/auth-modal';
import { useAuth } from '@/context/auth-context';
import { useCategories } from '@/context/category-context';
import { getTodayKey, getTomorrowKey } from '@/utils/date';

interface SectionTodoScreenProps {
  sectionKey: SectionKey;
}

export const SectionTodoScreen: React.FC<SectionTodoScreenProps> = ({ sectionKey }) => {
  const { getCategoryConfig, activeCategoryKey, setActiveCategoryKey } = useCategories();
  const activeSection = (activeCategoryKey as SectionKey) || sectionKey;

  useEffect(() => {
    if (sectionKey) {
      setActiveCategoryKey(sectionKey);
    }
  }, [sectionKey, setActiveCategoryKey]);

  const sectionConfig = getCategoryConfig(activeSection);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { toggleTheme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0
  );

  const {
    todos,
    binTodos,
    isLoading,
    selectedDate,
    setSelectedDate,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    streak,
    getSectionTodos,
    getPastPendingTasks,
    rolloverPastTasks,
    addTodo,
    addBatchTodos,
    toggleTodo,
    toggleSubtask,
    togglePinTodo,
    moveToDate,
    moveToSection,
    duplicateTodo,
    editTodo,
    deleteTodo,
    deleteBatchTodos,
    toggleBatchComplete,
    moveBatchToDate,
    undoDelete,
    restoreFromBin,
    restoreBatchFromBin,
    deletePermanently,
    deletePermanentlyBatch,
    emptyBin,
    importBackupData,
    isUndoVisible,
    dismissUndo,
  } = useTodos();

  const { isAuthModalVisible, closeAuthModal, promptAuthModal } = useAuth();

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [binModalVisible, setBinModalVisible] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [analyticsModalVisible, setAnalyticsModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [focusItem, setFocusItem] = useState<TodoItem | null>(null);
  const [transferItem, setTransferItem] = useState<TodoItem | null>(null);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isToday = selectedDate === getTodayKey();
  const pastPending = useMemo(() => getPastPendingTasks(activeSection), [getPastPendingTasks, activeSection]);

  const sectionTodos = useMemo(
    () => getSectionTodos(activeSection, selectedDate),
    [getSectionTodos, activeSection, selectedDate]
  );

  // Counts for the active section & date
  const dayTodos = useMemo(
    () => todos.filter((t) => t.section === activeSection && t.date === selectedDate),
    [todos, activeSection, selectedDate]
  );
  const totalCount = dayTodos.length;
  const pendingCount = dayTodos.filter((t) => !t.completed).length;
  const completedCount = dayTodos.filter((t) => t.completed).length;

  const handleToggleTaskWithCelebration = React.useCallback(
    async (id: string) => {
      const item = todos.find((t) => t.id === id);
      const wasPending = item && !item.completed;

      await toggleTodo(id);

      // Check if that was the last remaining task for the day
      if (wasPending && pendingCount === 1 && totalCount > 0) {
        setTimeout(() => {
          setCelebrationVisible(true);
        }, 300);
      }
    },
    [todos, toggleTodo, pendingCount, totalCount]
  );

  const handleOpenAddModal = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAddModalVisible(true);
  }, []);

  const handleOpenBinModal = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setBinModalVisible(true);
  }, []);

  const handleOpenStreak = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setStreakModalVisible(true);
  }, []);

  const handleOpenAnalytics = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setAnalyticsModalVisible(true);
  }, []);

  const handleOpenSettings = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSettingsModalVisible(true);
  }, []);

  const handleOpenCalendar = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCalendarModalVisible(true);
  }, []);

  const handleAddTask = React.useCallback(
    async (params: {
      text: string;
      date: string;
      tag?: string;
      recurrence?: RecurrenceType;
      subtasks?: SubtaskItem[];
      notes?: string;
    }) => {
      await addTodo({
        section: activeSection,
        ...params,
      });
    },
    [addTodo, activeSection]
  );

  const handleAddBatchTasks = React.useCallback(
    async (texts: string[], date: string, tag?: string) => {
      await addBatchTodos(activeSection, texts, date, tag);
    },
    [addBatchTodos, activeSection]
  );

  const handleEditTask = React.useCallback(
    async (params: {
      id: string;
      text: string;
      tag?: string;
      recurrence?: RecurrenceType;
      subtasks?: SubtaskItem[];
      notes?: string;
    }) => {
      await editTodo(params);
      setEditingItem(null);
    },
    [editTodo]
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent={true}
      />

      {/* Top Header with "Daily Focus" title and sleek action buttons */}
      <View style={[styles.header, { paddingTop: topInset + 8 }]}>
        <View style={styles.headerLeftRow}>
          <LinearGradient
            colors={sectionConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.headerIconBadge}>
            <Ionicons name={sectionConfig.activeIconName} size={17} color="#FFFFFF" />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Daily Focus
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          {/* Daily Streak Counter */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleOpenStreak}
            accessibilityRole="button"
            accessibilityLabel="Open Streak details"
            style={[
              styles.streakPill,
              {
                backgroundColor: colorScheme === 'dark' ? '#3B200A' : '#FFF7ED',
                borderColor: colorScheme === 'dark' ? '#7C2D12' : '#FDBA74',
              },
            ]}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{streak}d</Text>
          </TouchableOpacity>

          {/* Quick 1-Click Dark/Light Theme Toggle (Small circle before Productivity/Trophy) */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Switch to ${colorScheme === 'dark' ? 'Light' : 'Dark'} mode`}
            activeOpacity={0.75}
            onPress={async () => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              await toggleTheme();
            }}
            style={[
              styles.headerIconBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.cardBorder,
              },
            ]}>
            <Ionicons
              name={colorScheme === 'dark' ? 'sunny' : 'moon'}
              size={15}
              color={colorScheme === 'dark' ? '#F59E0B' : '#8B5CF6'}
            />
          </TouchableOpacity>

          {/* Productivity & Gamification Trophy Button */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Productivity Analytics & Badges"
            activeOpacity={0.75}
            onPress={handleOpenAnalytics}
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="trophy-outline" size={15} color="#3B82F6" />
          </TouchableOpacity>

          {/* Settings & Hub Button (LAST) */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Settings and Hub"
            activeOpacity={0.75}
            onPress={handleOpenSettings}
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <Ionicons name="settings-outline" size={15} color="#8B5CF6" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Date History, Day Navigator & Monthly Calendar Trigger */}
      <DateNavigator
        selectedDate={selectedDate}
        sectionConfig={sectionConfig}
        onSelectDate={setSelectedDate}
        onOpenCalendar={handleOpenCalendar}
      />

      {/* Content */}
      {isLoading && todos.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={sectionConfig.color} />
        </View>
      ) : (
        <TaskList
          todos={sectionTodos}
          sectionConfig={sectionConfig}
          onToggle={handleToggleTaskWithCelebration}
          onStartTimer={(item) => setFocusItem(item)}
          onTogglePin={togglePinTodo}
          onMoveToTomorrow={(id) => moveToDate(id, getTomorrowKey())}
          onOpenTransfer={(item) => setTransferItem(item)}
          onEdit={(item) => setEditingItem(item)}
          onDelete={deleteTodo}
          onToggleSubtask={toggleSubtask}
          onDeleteBatch={deleteBatchTodos}
          onToggleBatchComplete={toggleBatchComplete}
          onMoveBatchToTomorrow={(ids) => moveBatchToDate(ids, getTomorrowKey())}
          headerContent={
            <>
              {/* Rollover Banner for Today */}
              {isToday && pastPending.length > 0 && (
                <RolloverBanner
                  pendingCount={pastPending.length}
                  sectionConfig={sectionConfig}
                  onRollover={() => rolloverPastTasks(activeSection)}
                />
              )}

              {/* Search & Status Filters */}
              <TaskFilterBar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                sectionConfig={sectionConfig}
                totalCount={totalCount}
                pendingCount={pendingCount}
                completedCount={completedCount}
                isSearchVisible={isSearchOpen}
                onCloseSearch={() => setIsSearchOpen(false)}
              />
            </>
          }
        />
      )}

      {/* Floating Add Button with LinearGradient & Material Rounded Squircle */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Add new task to ${sectionConfig.tabLabel}`}
        activeOpacity={0.88}
        onPress={handleOpenAddModal}
        style={[styles.fabTouchable, { shadowColor: sectionConfig.color }]}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}>
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Undo Toast Snackbar */}
      <UndoToast
        visible={isUndoVisible}
        message="Moved to bin"
        onUndo={undoDelete}
        onDismiss={dismissUndo}
      />

      {/* Streak Dashboard Modal */}
      <StreakModal
        visible={streakModalVisible}
        streak={streak}
        todos={todos}
        onClose={() => setStreakModalVisible(false)}
        onOpenAnalytics={() => setAnalyticsModalVisible(true)}
      />

      {/* Add Task Modal with Subtasks, Recurrence, Batch & Tags */}
      {addModalVisible && (
        <AddTaskModal
          visible={addModalVisible}
          sectionConfig={sectionConfig}
          initialDate={selectedDate}
          onClose={() => setAddModalVisible(false)}
          onAdd={handleAddTask}
          onAddBatch={handleAddBatchTasks}
        />
      )}

      {/* Edit Task Modal */}
      {editingItem !== null && (
        <EditTaskModal
          visible={editingItem !== null}
          item={editingItem}
          sectionConfig={sectionConfig}
          onClose={() => setEditingItem(null)}
          onSave={handleEditTask}
        />
      )}

      {/* Focus / Pomodoro Timer Modal */}
      {focusItem !== null && (
        <FocusTimerModal
          visible={focusItem !== null}
          item={focusItem}
          onClose={() => setFocusItem(null)}
          onCompleteTask={(id) => {
            handleToggleTaskWithCelebration(id);
            setFocusItem(null);
          }}
        />
      )}

      {/* Monthly Calendar Grid Modal */}
      {calendarModalVisible && (
        <CalendarModal
          visible={calendarModalVisible}
          selectedDate={selectedDate}
          todos={todos}
          onSelectDate={setSelectedDate}
          onClose={() => setCalendarModalVisible(false)}
        />
      )}

      {/* 1-Tap Category Transfer & Task Duplication Modal */}
      {transferItem !== null && (
        <TaskTransferModal
          visible={transferItem !== null}
          item={transferItem}
          onClose={() => setTransferItem(null)}
          onMoveSection={moveToSection}
          onDuplicate={duplicateTodo}
        />
      )}

      {/* 100% Completion Confetti Celebration */}
      {celebrationVisible && (
        <ConfettiCelebration
          visible={celebrationVisible}
          totalCompleted={totalCount}
          streak={streak}
          onClose={() => setCelebrationVisible(false)}
        />
      )}

      {/* Recycle Bin Modal */}
      {binModalVisible && (
        <RecycleBinModal
          visible={binModalVisible}
          binTodos={binTodos}
          onClose={() => setBinModalVisible(false)}
          onRestore={restoreFromBin}
          onRestoreBatch={restoreBatchFromBin}
          onDeletePermanently={deletePermanently}
          onDeletePermanentlyBatch={deletePermanentlyBatch}
          onEmptyBin={emptyBin}
        />
      )}

      {/* Productivity Analytics & Gamification Modal */}
      {analyticsModalVisible && (
        <AnalyticsModal
          visible={analyticsModalVisible}
          todos={todos}
          onClose={() => setAnalyticsModalVisible(false)}
        />
      )}

      {/* Settings, Standup Share & Backup Modal */}
      {settingsModalVisible && (
        <SettingsBackupModal
          visible={settingsModalVisible}
          todos={todos}
          binTodos={binTodos}
          selectedDate={selectedDate}
          onClose={() => setSettingsModalVisible(false)}
          onImportBackup={importBackupData}
          onOpenAuth={promptAuthModal}
          onOpenBin={() => setBinModalVisible(true)}
        />
      )}

      {/* Custom Category Manager Modal */}
      {categoryModalVisible && (
        <CategoryManagerModal
          visible={categoryModalVisible}
          onClose={() => setCategoryModalVisible(false)}
          onSelectCategory={(newKey) => setActiveCategoryKey(newKey)}
        />
      )}

      {/* Supabase Cloud Auth Modal (Sign In / Sign Up / Guest) */}
      {isAuthModalVisible && (
        <AuthModal
          visible={isAuthModalVisible}
          onClose={closeAuthModal}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  streakEmoji: {
    fontSize: 11,
  },
  streakText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  binBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 9999,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  binBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  fabTouchable: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  fabGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
});
