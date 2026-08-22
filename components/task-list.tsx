import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/types/todo';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TaskItem } from '@/components/task-item';

interface TaskListProps {
  todos: TodoItem[];
  sectionConfig: SectionConfig;
  onToggle: (id: string) => void;
  onStartTimer: (item: TodoItem) => void;
  onTogglePin: (id: string) => void;
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
  onStartTimer,
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
  const theme = Colors[colorScheme];

  // Selected Task ID(s)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Automatically prune any stale IDs when todos list changes
  React.useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const currentValidIds = new Set(todos.map((t) => t.id));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentValidIds.has(id)) {
          next.add(id);
        }
      });
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [todos]);

  const isMultiSelect = selectedIds.size > 1;
  const isAllSelected = todos.length > 0 && selectedIds.size === todos.length;

  const activeItem =
    selectedIds.size === 1
      ? todos.find((t) => selectedIds.has(t.id)) || null
      : null;

  const hasSelection = selectedIds.size > 0;

  // Toggle selection on card click
  const handleSelectTask = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.clear();
        next.add(id);
      }
      return next;
    });
  }, []);

  // Toggle "Select All"
  const handleToggleSelectAll = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(todos.map((t) => t.id)));
    }
  };

  // Toolbar Action Handlers (strictly operate on selected tasks only)
  const handleToolbarFocus = () => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onStartTimer(activeItem);
  };

  const handleToolbarPin = () => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onTogglePin(activeItem.id);
  };

  const handleToolbarTomorrow = () => {
    if (!hasSelection) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (selectedIds.size > 1 && onMoveBatchToTomorrow) {
      onMoveBatchToTomorrow(Array.from(selectedIds));
      setSelectedIds(new Set());
    } else if (activeItem) {
      onMoveToTomorrow(activeItem.id);
      setSelectedIds(new Set());
    }
  };

  const handleToolbarTransfer = () => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onOpenTransfer(activeItem);
  };

  const handleToolbarEdit = () => {
    if (!activeItem) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onEdit(activeItem);
  };

  const handleToolbarDelete = () => {
    if (!hasSelection) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (selectedIds.size > 1 && onDeleteBatch) {
      onDeleteBatch(Array.from(selectedIds));
      setSelectedIds(new Set());
    } else if (activeItem) {
      onDelete(activeItem.id);
      setSelectedIds(new Set());
    }
  };

  const handleToolbarComplete = () => {
    if (!hasSelection) return;
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (selectedIds.size > 1 && onToggleBatchComplete) {
      const allSelectedAreCompleted = Array.from(selectedIds).every(
        (id) => todos.find((t) => t.id === id)?.completed
      );
      onToggleBatchComplete(Array.from(selectedIds), !allSelectedAreCompleted);
      setSelectedIds(new Set());
    } else if (activeItem) {
      onToggle(activeItem.id);
    }
  };

  const renderItem = React.useCallback(
    ({ item }: { item: TodoItem }) => (
      <TaskItem
        item={item}
        sectionConfig={sectionConfig}
        isSelected={selectedIds.has(item.id)}
        onSelectTask={handleSelectTask}
        onToggle={onToggle}
        onToggleSubtask={onToggleSubtask}
      />
    ),
    [sectionConfig, selectedIds, handleSelectTask, onToggle, onToggleSubtask]
  );

  const renderEmptyComponent = React.useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIconGradient}>
          <Ionicons name={sectionConfig.activeIconName} size={36} color="#FFFFFF" />
        </LinearGradient>
        <Text style={[styles.emptyTitle, { color: theme.text }]}>No tasks found</Text>
        <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
          Tap the{' '}
          <Text style={{ fontWeight: '700', color: sectionConfig.color }}>+</Text>{' '}
          button below to add a task to {sectionConfig.tabLabel}.
        </Text>
      </View>
    ),
    [sectionConfig, theme]
  );

  const keyExtractor = React.useCallback((item: TodoItem) => item.id, []);

  return (
    <FlatList
      data={todos}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      initialNumToRender={10}
      maxToRenderPerBatch={10}
      windowSize={5}
      removeClippedSubviews={Platform.OS === 'android'}
      updateCellsBatchingPeriod={50}
      ListHeaderComponent={
        <>
          {headerContent}

          {/* Heading Row: "Tasks" Title + "Select All" Button */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderLeft}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasks</Text>
              {todos.length > 0 && (
                <LinearGradient
                  colors={sectionConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.taskCountBadge}>
                  <Text style={styles.taskCountText}>{todos.length}</Text>
                </LinearGradient>
              )}
            </View>

            {/* Select All Checkbox & Toggle with Material 3 Pill Radius */}
            {todos.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleToggleSelectAll}
                style={[
                  styles.selectAllBtn,
                  {
                    backgroundColor: isAllSelected
                      ? colorScheme === 'dark'
                        ? '#1E3A8A'
                        : '#EFF6FF'
                      : 'transparent',
                    borderColor: isAllSelected ? '#3B82F6' : theme.cardBorder,
                  },
                ]}>
                <Ionicons
                  name={isAllSelected ? 'checkbox' : 'checkbox-outline'}
                  size={15}
                  color={isAllSelected ? '#3B82F6' : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.selectAllText,
                    { color: isAllSelected ? '#3B82F6' : theme.textSecondary },
                  ]}>
                  {isAllSelected ? 'Deselect' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Clean slight action icons under Tasks heading */}
          {todos.length > 0 && (
            <View style={styles.toolbarIconsRow}>
              {/* 1. Mark Done / Pending */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasSelection}
                onPress={handleToolbarComplete}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: hasSelection ? 1 : 0.35 },
                ]}>
                <Ionicons
                  name={activeItem?.completed ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={21}
                  color="#10B981"
                />
              </TouchableOpacity>

              {/* 2. Focus Timer (Single Task) */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!activeItem || isMultiSelect}
                onPress={handleToolbarFocus}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: activeItem && !isMultiSelect ? 1 : 0.35 },
                ]}>
                <Ionicons name="timer-outline" size={21} color="#3B82F6" />
              </TouchableOpacity>

              {/* 3. Star / Pin (Single Task) */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!activeItem || isMultiSelect}
                onPress={handleToolbarPin}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: activeItem && !isMultiSelect ? 1 : 0.35 },
                ]}>
                <Ionicons
                  name={activeItem?.pinned ? 'star' : 'star-outline'}
                  size={21}
                  color="#F59E0B"
                />
              </TouchableOpacity>

              {/* 4. Tomorrow */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasSelection}
                onPress={handleToolbarTomorrow}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: hasSelection ? 1 : 0.35 },
                ]}>
                <Ionicons
                  name="arrow-forward-circle-outline"
                  size={21}
                  color="#06B6D4"
                />
              </TouchableOpacity>

              {/* 5. Move / Transfer Category (Single Task) */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!activeItem || isMultiSelect}
                onPress={handleToolbarTransfer}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: activeItem && !isMultiSelect ? 1 : 0.35 },
                ]}>
                <Ionicons name="swap-horizontal" size={21} color="#8B5CF6" />
              </TouchableOpacity>

              {/* 6. Edit Details (Single Task) */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!activeItem || isMultiSelect}
                onPress={handleToolbarEdit}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: activeItem && !isMultiSelect ? 1 : 0.35 },
                ]}>
                <Ionicons name="pencil-outline" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* 7. Delete */}
              <TouchableOpacity
                activeOpacity={0.65}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={!hasSelection}
                onPress={handleToolbarDelete}
                style={[
                  styles.iconOnlyBtn,
                  { opacity: hasSelection ? 1 : 0.35 },
                ]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
            </View>
          )}
        </>
      }
      ListEmptyComponent={renderEmptyComponent}
      contentContainerStyle={styles.listContent}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: 110,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 6,
    marginTop: 4,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  taskCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14, // Material pill radius
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toolbarIconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 8,
  },
  iconOnlyBtn: {
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyIconGradient: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});


