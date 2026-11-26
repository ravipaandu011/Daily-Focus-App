import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem, SubtaskItem, PriorityLevel } from '@/features/tasks/types';
import { TODO_CONFIG } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTodos } from '@/features/tasks/use-todos';
import { TaskList } from '@/features/tasks/components/task-list';
import { DateNavigator } from '@/components/date-navigator';
import { RolloverBanner } from '@/features/tasks/components/rollover-banner';
import { UndoToast } from '@/components/undo-toast';
import { AddTaskModal } from '@/features/tasks/components/add-task-modal';
import { EditTaskModal } from '@/features/tasks/components/edit-task-modal';
import { CalendarModal } from '@/components/calendar-modal';
import { TaskTransferModal } from '@/features/tasks/components/task-transfer-modal';
import { AppHeader } from '@/components/app-header';
import { getTomorrowKey } from '@/utils/date';
import { useFloatingBarLayout } from '@/components/floating-tab-bar';

const sectionConfig = TODO_CONFIG;

export const SectionTodoScreen: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const dock = useFloatingBarLayout();


  const {
    todos,
    isLoading,
    today,
    selectedDate,
    setSelectedDate,
    getTodosForDate,
    getPastPendingTasks,
    rolloverPastTasks,
    addTodo,
    addBatchTodos,
    toggleTodo,
    toggleSubtask,
    togglePinBatch,
    moveToDate,
    duplicateTodo,
    editTodo,
    deleteTodo,
    deleteBatchTodos,
    toggleBatchComplete,
    moveBatchToDate,
    undoDelete,
    isUndoVisible,
    undoMessage,
    dismissUndo,
  } = useTodos();

  const [addModalVisible, setAddModalVisible] = useState(false);

  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);
  const [transferItem, setTransferItem] = useState<TodoItem | null>(null);

  const dateTodos = useMemo(
    () => getTodosForDate(selectedDate),
    [getTodosForDate, selectedDate]
  );

  const isToday = selectedDate === today;
  const pastPending = useMemo(
    () => (isToday ? getPastPendingTasks() : []),
    [isToday, getPastPendingTasks]
  );

  // Calendar dots: green when every task that day is done, otherwise the theme color.
  const calendarDotColors = useMemo(() => {
    const stats: Record<string, { total: number; completed: number }> = {};
    todos.forEach((t) => {
      const s = (stats[t.date] ??= { total: 0, completed: 0 });
      s.total++;
      if (t.completed) s.completed++;
    });
    const colors: Record<string, string> = {};
    Object.entries(stats).forEach(([date, s]) => {
      colors[date] = s.completed === s.total ? '#10B981' : sectionConfig.color;
    });
    return colors;
  }, [todos]);

  const handleOpenAddModal = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setAddModalVisible(true);
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
      subtasks?: SubtaskItem[];
      notes?: string;
    }) => {
      await addTodo(params);
    },
    [addTodo]
  );

  const handleAddBatchTasks = React.useCallback(
    async (texts: string[], date: string, tag?: string, priority?: PriorityLevel) => {
      await addBatchTodos(texts, date, tag, priority);
    },
    [addBatchTodos]
  );

  const handleEditTask = React.useCallback(
    async (params: {
      id: string;
      text: string;
      tag?: string;
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
      {/* Same icon as the Todo tab in the bottom bar */}
      <AppHeader icon="checkmark-done-circle" iconSize={20} />

      {/* Date History, Day Navigator & Monthly Calendar Trigger */}
      <DateNavigator
        selectedDate={selectedDate}
        sectionConfig={sectionConfig}
        dotColors={calendarDotColors}
        onSelectDate={setSelectedDate}
        onOpenCalendar={handleOpenCalendar}
      />

      {/* Content Area with Soft Gradient Dissolve */}
      <View style={styles.contentArea}>
        {isLoading && todos.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={sectionConfig.color} />
          </View>
        ) : (
          <TaskList
          todos={dateTodos}
          sectionConfig={sectionConfig}
          onToggle={toggleTodo}
          onTogglePin={togglePinBatch}
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
                  onRollover={rolloverPastTasks}
                />
              )}
            </>
          }
        />
      )}

        {/* Soft Linear Gradient Fade-Out Overlay */}
        <LinearGradient
          colors={['transparent', theme.background]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
          style={[styles.bottomGradientFade, { height: (insets.bottom > 0 ? insets.bottom : 14) + 65 }]}
        />
      </View>

      {/* Floating Add Task Button */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Add task"
        activeOpacity={0.88}
        onPress={handleOpenAddModal}
        style={[
          styles.fabTouchable,
          { bottom: dock.bottom, right: dock.fabRight, shadowColor: sectionConfig.color },
        ]}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={sectionConfig.onGradient} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Undo Toast Snackbar */}
      <UndoToast
        visible={isUndoVisible}
        message={undoMessage}
        onUndo={undoDelete}
        onDismiss={dismissUndo}
      />

      {/* Add Task Modal with Subtasks, Batch & Tags */}
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

      {/* Monthly Calendar Grid Modal */}
      {calendarModalVisible && (
        <CalendarModal
          visible={calendarModalVisible}
          selectedDate={selectedDate}
          dotColors={calendarDotColors}
          onSelectDate={setSelectedDate}
          onClose={() => setCalendarModalVisible(false)}
        />
      )}

      {/* Duplicate Task Modal */}
      {transferItem !== null && (
        <TaskTransferModal
          visible={transferItem !== null}
          item={transferItem}
          onClose={() => setTransferItem(null)}
          onDuplicate={duplicateTodo}
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

  contentArea: {
    flex: 1,
    position: 'relative',
  },
  bottomGradientFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabTouchable: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    // Must sit above bottomGradientFade (zIndex 20), which otherwise darkens the button on Android.
    zIndex: 30,
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






