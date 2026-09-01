import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
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
import { TaskItem } from '@/components/task-item';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TodoItem, StatusFilter } from '@/types/todo';

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
  onReorder?: (reorderedList: TodoItem[]) => void;
  onToggleSubtask?: (todoId: string, subtaskId: string) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onToggleBatchComplete?: (ids: string[], completed: boolean) => void;
  onMoveBatchToTomorrow?: (ids: string[]) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  statusFilter?: StatusFilter;
  onStatusFilterChange?: (f: StatusFilter) => void;
  totalCount?: number;
  pendingCount?: number;
  completedCount?: number;
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
  onReorder,
  onToggleSubtask,
  onDeleteBatch,
  onToggleBatchComplete,
  onMoveBatchToTomorrow,
  searchQuery = '',
  onSearchChange,
  statusFilter = 'all',
  onStatusFilterChange,
  totalCount,
  pendingCount,
  completedCount,
  headerContent,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];

  // Derive counts with fallback to todos list
  const displayTotal = totalCount !== undefined ? totalCount : todos.length;
  const displayPending = pendingCount !== undefined ? pendingCount : todos.filter((t) => !t.completed).length;
  const displayCompleted = completedCount !== undefined ? completedCount : todos.filter((t) => t.completed).length;

  // Selected Task ID(s)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Drag & Reorder Mode
  const [isReorderMode, setIsReorderMode] = useState<boolean>(false);
  // Search toggle state
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  const showSearch = isSearchOpen || searchQuery.length > 0;

  // Automatically prune any stale IDs when todos list changes
  useEffect(() => {
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

  const isSelectionMode = selectedIds.size > 0;
  const isAllSelected = todos.length > 0 && selectedIds.size === todos.length;

  const activeItem =
    selectedIds.size === 1
      ? todos.find((t) => selectedIds.has(t.id)) || null
      : null;

  // Long press handler: enters selection mode & selects task
  const handleLongPressSelect = useCallback((id: string) => {
    setIsReorderMode(false);
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

  // Tap handler in selection mode: toggles selection
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

  // Toggle Reorder / Drag mode
  const handleToggleReorderMode = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsReorderMode((prev) => {
      if (!prev) {
        setSelectedIds(new Set());
      }
      return !prev;
    });
  }, []);

  // Filter selection handler
  const handleFilterSelect = useCallback(
    (f: StatusFilter) => {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      onStatusFilterChange?.(f);
    },
    [onStatusFilterChange]
  );

  // Search toggle handler
  const handleToggleSearch = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (showSearch) {
      onSearchChange?.('');
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  }, [showSearch, onSearchChange]);

  const handleClearSearch = useCallback(() => {
    onSearchChange?.('');
    setIsSearchOpen(false);
  }, [onSearchChange]);

  // Move task up
  const handleMoveUp = useCallback(
    (id: string) => {
      const index = todos.findIndex((t) => t.id === id);
      if (index <= 0) return;
      const newTodos = [...todos];
      const [moved] = newTodos.splice(index, 1);
      newTodos.splice(index - 1, 0, moved);
      onReorder?.(newTodos);
    },
    [todos, onReorder]
  );

  // Move task down
  const handleMoveDown = useCallback(
    (id: string) => {
      const index = todos.findIndex((t) => t.id === id);
      if (index < 0 || index >= todos.length - 1) return;
      const newTodos = [...todos];
      const [moved] = newTodos.splice(index, 1);
      newTodos.splice(index + 1, 0, moved);
      onReorder?.(newTodos);
    },
    [todos, onReorder]
  );

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

  const handleBatchTimer = () => {
    const itemToFocus = activeItem || (selectedIds.size > 0 ? todos.find((t) => selectedIds.has(t.id)) : null);
    if (!itemToFocus) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onStartTimer(itemToFocus);
    setSelectedIds(new Set());
  };

  const handleBatchPin = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    selectedIds.forEach((id) => onTogglePin(id));
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
        isReorderMode={isReorderMode}
        isFirst={index === 0}
        isLast={index === todos.length - 1}
        onSelectTask={handleSelectTask}
        onLongPressSelect={handleLongPressSelect}
        onToggle={onToggle}
        onEdit={onEdit}
        onToggleSubtask={onToggleSubtask}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
      />
    ),
    [
      sectionConfig,
      selectedIds,
      isSelectionMode,
      isReorderMode,
      todos.length,
      handleSelectTask,
      handleLongPressSelect,
      onToggle,
      onEdit,
      onToggleSubtask,
      handleMoveUp,
      handleMoveDown,
    ]
  );

  const renderEmptyComponent = useCallback(
    () => (
      <View style={styles.emptyContainer}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIconGradient}>
          <Ionicons name={sectionConfig.activeIconName} size={32} color="#FFFFFF" />
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

  const keyExtractor = useCallback((item: TodoItem) => item.id, []);

  return (
    <View style={styles.container}>
      {headerContent}

          {/* Collapsible Search Input Bar (when search is open) */}
          {showSearch && (
            <View
              style={[
                styles.searchBar,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <Ionicons
                name="search-outline"
                size={15}
                color={sectionConfig.color}
                style={styles.searchIcon}
              />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder="Search tasks..."
                placeholderTextColor={theme.textMuted}
                style={[styles.searchInput, { color: theme.text }]}
                returnKeyType="search"
                autoFocus={true}
                clearButtonMode="while-editing"
              />
              <TouchableOpacity
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                onPress={handleClearSearch}
                style={styles.clearBtn}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Section Header: Unified Single Row with Tasks Title + Segmented Filter Capsule + Search + Reorder */}
          <View style={styles.sectionHeader}>
            {isSelectionMode ? (
              /* Selection Mode Top Bar */
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
                      borderColor: isAllSelected ? '#3B82F6' : theme.cardBorder,
                    },
                  ]}>
                  <Ionicons
                    name={isAllSelected ? 'checkbox' : 'checkbox-outline'}
                    size={13}
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
              </View>
            ) : (
              /* Normal Header: Tasks Title & Count on LEFT, Segmented Capsule + Search + Reorder on RIGHT */
              <View style={styles.unifiedHeaderRow}>
                {/* Left: Tasks Title & Count Badge */}
                <View style={styles.sectionHeaderLeft}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Tasks</Text>
                  {displayTotal > 0 && (
                    <LinearGradient
                      colors={sectionConfig.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.taskCountBadge}>
                      <Text style={styles.taskCountText}>{displayTotal}</Text>
                    </LinearGradient>
                  )}
                </View>

                {/* Right: Inline Segmented Filter Capsule + Search + Always-Visible Reorder */}
                <View style={styles.headerRightGroup}>
                  {/* Segmented Filter Track Container */}
                  <View
                    style={[
                      styles.segmentedContainer,
                      {
                        backgroundColor: isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(241, 245, 249, 0.95)',
                        borderColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(226, 232, 240, 0.9)',
                      },
                    ]}>
                    {/* All */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleFilterSelect('all')}
                      style={styles.segmentedTabWrapper}>
                      {statusFilter === 'all' ? (
                        <LinearGradient
                          colors={sectionConfig.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.segmentedTabActive, { shadowColor: sectionConfig.color }]}>
                          <Text style={styles.segmentedTextActive}>All ({displayTotal})</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.segmentedTabInactive}>
                          <Text style={[styles.segmentedTextInactive, { color: theme.textSecondary }]}>
                            All ({displayTotal})
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Pending */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleFilterSelect('pending')}
                      style={styles.segmentedTabWrapper}>
                      {statusFilter === 'pending' ? (
                        <LinearGradient
                          colors={sectionConfig.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.segmentedTabActive, { shadowColor: sectionConfig.color }]}>
                          <Text style={styles.segmentedTextActive}>Pending ({displayPending})</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.segmentedTabInactive}>
                          <Text style={[styles.segmentedTextInactive, { color: theme.textSecondary }]}>
                            Pending ({displayPending})
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Done */}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleFilterSelect('completed')}
                      style={styles.segmentedTabWrapper}>
                      {statusFilter === 'completed' ? (
                        <LinearGradient
                          colors={sectionConfig.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[styles.segmentedTabActive, { shadowColor: sectionConfig.color }]}>
                          <Text style={styles.segmentedTextActive}>Done ({displayCompleted})</Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.segmentedTabInactive}>
                          <Text style={[styles.segmentedTextInactive, { color: theme.textSecondary }]}>
                            Done ({displayCompleted})
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Search Icon Button */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Search tasks"
                    activeOpacity={0.75}
                    onPress={handleToggleSearch}
                    style={[
                      styles.iconCircleBtn,
                      showSearch
                        ? { backgroundColor: sectionConfig.color, borderColor: sectionConfig.color }
                        : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' },
                    ]}>
                    <Ionicons
                      name="search"
                      size={12}
                      color={showSearch ? '#FFFFFF' : theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Reorder Icon Button - ALWAYS VISIBLE */}
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Reorder tasks"
                    activeOpacity={0.75}
                    onPress={handleToggleReorderMode}
                    style={[
                      styles.iconCircleBtn,
                      isReorderMode
                        ? { backgroundColor: sectionConfig.color, borderColor: sectionConfig.color }
                        : { backgroundColor: isDark ? '#1E293B' : '#FFFFFF', borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)' },
                    ]}>
                    <Ionicons
                      name={isReorderMode ? 'checkmark' : 'swap-vertical'}
                      size={12}
                      color={isReorderMode ? '#FFFFFF' : theme.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

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

                {/* 2. Timer */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchTimer}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="timer-outline" size={17} color="#3B82F6" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Timer
                  </Text>
                </TouchableOpacity>

                {/* 3. Pin */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchPin}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="pin" size={16} color="#F59E0B" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Pin
                  </Text>
                </TouchableOpacity>

                {/* 4. Tomorrow */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchTomorrow}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="arrow-forward-circle-outline" size={17} color="#06B6D4" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Tomorrow
                  </Text>
                </TouchableOpacity>

                {/* 5. Transfer */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchTransfer}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="swap-horizontal" size={17} color="#8B5CF6" />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Transfer
                  </Text>
                </TouchableOpacity>

                {/* 6. Edit */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleBatchEdit}
                  style={styles.actionBtnWrapper}>
                  <Ionicons name="pencil-outline" size={16} color={isDark ? '#94A3B8' : '#64748B'} />
                  <Text numberOfLines={1} style={[styles.actionBtnLabel, { color: theme.text }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                {/* 7. Delete */}
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

          {/* Reorder Mode Guidance Banner */}
          {isReorderMode && todos.length > 1 && (
            <View
              style={[
                styles.reorderInfoBanner,
                { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: isDark ? '#334155' : '#E2E8F0' },
              ]}>
              <Ionicons name="information-circle-outline" size={15} color="#3B82F6" />
              <Text style={[styles.reorderInfoText, { color: theme.textSecondary }]}>
                Drag the <Ionicons name="reorder-two" size={13} /> handle or tap ▲ / ▼ to reorder tasks
              </Text>
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
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginHorizontal: 16,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    paddingVertical: 0,
    fontWeight: '500',
  },
  clearBtn: {
    padding: 3,
    marginLeft: 3,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    marginBottom: 6,
    marginTop: 2,
    minHeight: 28,
  },
  unifiedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  taskCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
  },
  segmentedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 2.5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  segmentedTabWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentedTabInactive: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTextActive: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: -0.1,
  },
  segmentedTextInactive: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  iconCircleBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  reorderInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  reorderInfoText: {
    fontSize: 11.5,
    fontWeight: '500',
    flex: 1,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});









