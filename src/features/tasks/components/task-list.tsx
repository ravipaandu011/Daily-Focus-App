import React, { useState, useCallback, useMemo } from 'react';
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { TaskItem } from '@/features/tasks/components/task-item';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TodoItem } from '@/features/tasks/types';
import { useFloatingBarLayout } from '@/components/floating-tab-bar';
import { EmptyState } from '@/components/empty-state';

interface TaskListProps {
  todos: TodoItem[];
  sectionConfig: SectionConfig;
  onToggle: (id: string) => void;
  /** Pins the given tasks, or unpins them all when all are pinned. */
  onTogglePin: (ids: string[]) => void;
  onMoveToTomorrow: (id: string) => void;
  onOpenTransfer: (item: TodoItem) => void;
  onEdit: (item: TodoItem) => void;
  onDelete: (id: string) => void;
  onToggleSubtask?: (todoId: string, subtaskId: string) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onToggleBatchComplete?: (ids: string[], completed: boolean) => void;
  onMoveBatchToTomorrow?: (ids: string[]) => void;
  headerContent?: React.ReactNode;
}

export const TaskList: React.FC<TaskListProps> = ({
  todos,
  sectionConfig,
  onToggle,
  onTogglePin,
  onMoveToTomorrow,
  onOpenTransfer,
  onEdit,
  onDelete,
  onToggleSubtask,
  onDeleteBatch,
  onToggleBatchComplete,
  onMoveBatchToTomorrow,
  headerContent,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];
  const dock = useFloatingBarLayout();

  // Selected task ids; ids of tasks that are no longer listed are ignored.
  const [rawSelectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = useMemo(() => {
    if (rawSelectedIds.size === 0) return rawSelectedIds;
    const listed = new Set(todos.map((t) => t.id));
    const valid = [...rawSelectedIds].filter((id) => listed.has(id));
    return valid.length === rawSelectedIds.size ? rawSelectedIds : new Set(valid);
  }, [rawSelectedIds, todos]);

  const isSelectionMode = selectedIds.size > 0;
  const isAllSelected = todos.length > 0 && selectedIds.size === todos.length;

  const activeItem =
    selectedIds.size === 1
      ? todos.find((t) => selectedIds.has(t.id)) || null
      : null;

  // Long press (enters selection mode) and taps in selection mode both toggle a task's selection.
  const handleSelectTask = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Exit selection mode
  const handleExitSelection = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setSelectedIds(new Set());
  }, []);

  // Toggle "Select All"
  const handleToggleSelectAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(todos.map((t) => t.id)));
    }
  }, [isAllSelected, todos]);

  // Selection Mode Action Handlers (All 7 actions from screenshot)
  const handleBatchComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (selectedIds.size > 1 && onToggleBatchComplete) {
      const allSelectedAreCompleted = Array.from(selectedIds).every(
        (id) => todos.find((t) => t.id === id)?.completed
      );
      onToggleBatchComplete(Array.from(selectedIds), !allSelectedAreCompleted);
    } else if (activeItem) {
      onToggle(activeItem.id);
    }
    setSelectedIds(new Set());
  };

  const handleBatchPin = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onTogglePin(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleBatchTomorrow = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (selectedIds.size > 1 && onMoveBatchToTomorrow) {
      onMoveBatchToTomorrow(Array.from(selectedIds));
    } else if (activeItem) {
      onMoveToTomorrow(activeItem.id);
    }
    setSelectedIds(new Set());
  };

  const handleBatchTransfer = () => {
    const itemToTransfer = activeItem || (selectedIds.size > 0 ? todos.find((t) => selectedIds.has(t.id)) : null);
    if (!itemToTransfer) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onOpenTransfer(itemToTransfer);
    setSelectedIds(new Set());
  };

  const handleBatchEdit = () => {
    const itemToEdit = activeItem || (selectedIds.size > 0 ? todos.find((t) => selectedIds.has(t.id)) : null);
    if (!itemToEdit) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onEdit(itemToEdit);
    setSelectedIds(new Set());
  };

  const handleBatchDelete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (selectedIds.size > 1 && onDeleteBatch) {
      onDeleteBatch(Array.from(selectedIds));
    } else if (activeItem) {
      onDelete(activeItem.id);
    }
    setSelectedIds(new Set());
  };

  const renderItem = useCallback(
    ({ item, index }: { item: TodoItem; index: number }) => (
      <TaskItem
        item={item}
        sectionConfig={sectionConfig}
        isSelected={selectedIds.has(item.id)}
        isSelectionMode={isSelectionMode}
        isLast={index === todos.length - 1}
        onSelectTask={handleSelectTask}
        onLongPressSelect={handleSelectTask}
        onToggle={onToggle}
        onEdit={onEdit}
        onToggleSubtask={onToggleSubtask}
      />
    ),
    [
      sectionConfig,
      selectedIds,
      isSelectionMode,
      todos.length,
      handleSelectTask,
      onToggle,
      onEdit,
      onToggleSubtask,
    ]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <EmptyState icon={sectionConfig.iconName} title="No tasks found" subtitle="Tap the + button below to add a task." />
    ),
    [sectionConfig]
  );

  const keyExtractor = useCallback((item: TodoItem) => item.id, []);

  return (
    <View style={styles.container}>
      {headerContent}

          {/* Selection bar (only while selecting tasks) */}
          {isSelectionMode && (
            <View style={styles.sectionHeader}>
              {/* Selection Mode Top Bar */}
              <View style={styles.selectionModeHeader}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleExitSelection}
                  style={[styles.closeSelectionBtn, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]}>
                  <Ionicons name="close" size={15} color={theme.text} />
                </TouchableOpacity>

                <View style={styles.selectionCountPill}>
                  <Text style={[styles.selectionCountText, { color: theme.text }]}>
                    {selectedIds.size} Selected
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={handleToggleSelectAll}
                  style={[
                    styles.selectAllBtn,
                    {
                      backgroundColor: isAllSelected
                        ? (isDark ? '#1E3A8A' : '#EFF6FF')
                        : 'transparent',
                      borderColor: isAllSelected ? sectionConfig.color : theme.cardBorder,
                    },
                  ]}>
                  <Ionicons
                    name={isAllSelected ? 'checkbox' : 'checkbox-outline'}
                    size={13}
                    color={isAllSelected ? sectionConfig.color : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.selectAllText,
                      { color: isAllSelected ? sectionConfig.color : theme.textSecondary },
                    ]}>
                    {isAllSelected ? 'Deselect' : 'Select All'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Selection Mode Batch Actions Toolbar - All 7 Actions (Zero text wrap) */}
          {isSelectionMode && (
            <View
              style={[
                styles.batchActionContainer,
                {
                  backgroundColor: isDark ? '#1E293B' : 'rgba(255, 255, 255, 0.95)',
                  borderColor: isDark ? '#334155' : 'rgba(226, 232, 240, 0.90)',
                  shadowColor: isDark ? '#000000' : '#64748B',
                },
              ]}>
              <View style={styles.batchActionRow}>
                {/* 1. Done */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchComplete}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="checkmark-circle" size={17} color="#10B981" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Done
                  </Text>
                </TouchableOpacity>

                {/* 2. Pin */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchPin}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="pin" size={16} color="#F59E0B" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Pin
                  </Text>
                </TouchableOpacity>

                {/* 3. Tomorrow */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchTomorrow}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="arrow-forward-circle-outline" size={17} color="#06B6D4" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                {/* 4. Duplicate */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchTransfer}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="copy-outline" size={17} color="#8B5CF6" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Duplicate
                  </Text>
                </TouchableOpacity>

                {/* 5. Edit */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchEdit}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="pencil-outline" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* 6. Delete */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchDelete}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="trash-outline" size={16.5} color="#EF4444" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: '#EF4444' }]}>
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

      {/* Scrollable Tasks FlatList */}
      <FlatList
        data={todos}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        updateCellsBatchingPeriod={50}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={[{ paddingBottom: dock.contentInset }, todos.length === 0 && styles.listEmpty]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 2,
    minHeight: 28,
  },
  // Equal-width tabs; the active gradient pill stretches to fill its slot.
  selectionModeHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeSelectionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  selectionCountText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  batchActionContainer: {
    marginHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
    marginBottom: 8,
    marginTop: 2,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  batchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingVertical: 7,
  },
  actionBtnWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionBtnLabel: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 11,
    textAlign: 'center',
  },
  // When there are no tasks, the list content fills the screen and the message sits in its center.
  // Same bottom space (dock.contentInset) and top padding as the Notes list, so both
  // empty states sit at exactly the same height when switching tabs.
  listEmpty: {
    flexGrow: 1,
    paddingTop: 4,
  },
});









