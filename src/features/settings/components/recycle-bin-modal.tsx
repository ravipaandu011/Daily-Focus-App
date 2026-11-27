import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/features/tasks/types';
import { BinNote } from '@/features/notes/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateForDisplay } from '@/utils/date';

import { ConfirmDialog } from '@/components/confirm-dialog';

interface RecycleBinModalProps {
  visible: boolean;
  binTodos: TodoItem[];
  onClose: () => void;
  onRestore: (id: string) => void;
  onRestoreBatch?: (ids: string[]) => void;
  onDeletePermanently: (id: string) => void;
  onDeletePermanentlyBatch?: (ids: string[]) => void;
  onEmptyBin: () => void;
  /** Which list to show first. */
  initialTab?: BinTab;
  binNotes?: BinNote[];
  onRestoreNotes?: (ids: string[]) => void;
  onDeleteNotesPermanently?: (ids: string[]) => void;
  onEmptyNoteBin?: () => void;
}

type BinTab = 'tasks' | 'notes';

/** One row in the bin, whether it was a task or a note. */
interface BinEntry {
  id: string;
  title: string;
  preview?: string;
  date: string;
}

function noteToEntry(note: BinNote): BinEntry {
  const title = note.title.trim();
  const lines = note.body.trim().split('\n');
  return {
    id: note.id,
    title: title || lines[0] || 'Untitled note',
    preview: (title ? lines : lines.slice(1)).join('\n').trim(),
    date: note.date,
  };
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  visible,
  binTodos,
  onClose,
  onRestore,
  onRestoreBatch,
  onDeletePermanently,
  onDeletePermanentlyBatch,
  onEmptyBin,
  initialTab = 'tasks',
  binNotes = [],
  onRestoreNotes,
  onDeleteNotesPermanently,
  onEmptyNoteBin,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 16
  );

  const [activeTab, setActiveTab] = useState<BinTab>(initialTab);
  const isNotes = activeTab === 'notes';
  const noun = isNotes ? 'note' : 'task';
  const items = useMemo<BinEntry[]>(
    () => (isNotes ? binNotes.map(noteToEntry) : binTodos.map((t) => ({ id: t.id, title: t.text, date: t.date }))),
    [isNotes, binNotes, binTodos]
  );

  const restoreIds = (ids: string[]) => {
    if (isNotes) {
      onRestoreNotes?.(ids);
    } else if (onRestoreBatch) {
      onRestoreBatch(ids);
    } else {
      ids.forEach((id) => onRestore(id));
    }
  };

  const deleteIdsForever = (ids: string[]) => {
    if (isNotes) {
      onDeleteNotesPermanently?.(ids);
    } else if (onDeletePermanentlyBatch) {
      onDeletePermanentlyBatch(ids);
    } else {
      ids.forEach((id) => onDeletePermanently(id));
    }
  };

  // Selected ids; ids no longer in the list are ignored. (Mounted only while open, so it starts empty.)
  const [rawSelectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = useMemo(() => {
    if (rawSelectedIds.size === 0) return rawSelectedIds;
    const listed = new Set(items.map((t) => t.id));
    const valid = [...rawSelectedIds].filter((id) => listed.has(id));
    return valid.length === rawSelectedIds.size ? rawSelectedIds : new Set(valid);
  }, [rawSelectedIds, items]);
  const [confirmDialog, setConfirmDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    confirmText: 'Delete Forever',
    onConfirm: () => {},
  });

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const hasSelection = selectedIds.size > 0;

  const handleToggleSelectTask = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
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

  const handleToggleSelectAll = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((t) => t.id)));
    }
  }, [isAllSelected, items]);

  const handleSwitchTab = (tab: BinTab) => {
    if (tab === activeTab) return;
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    setActiveTab(tab);
    setSelectedIds(new Set());
  };

  const handleRestoreSingle = (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    restoreIds([id]);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleRestoreSelected = () => {
    const idsToRestore = Array.from(selectedIds);
    if (idsToRestore.length === 0) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    restoreIds(idsToRestore);
    setSelectedIds(new Set());
  };

  const handleRestoreAll = () => {
    if (items.length === 0) return;
    const allIds = items.map((t) => t.id);

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    restoreIds(allIds);
    setSelectedIds(new Set());
  };

  const handleDeletePermanentlySingle = (id: string, itemText?: string) => {
    const preview = itemText ? `"${itemText}"` : `this ${noun}`;
    setConfirmDialog({
      visible: true,
      title: 'Delete Forever',
      message: `Are you sure you want to permanently delete ${preview}? This action cannot be undone.`,
      confirmText: 'Delete Forever',
      onConfirm: () => {
        deleteIdsForever([id]);
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleDeletePermanentlySelected = () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    setConfirmDialog({
      visible: true,
      title: 'Delete Selected Forever',
      message: `Are you sure you want to permanently delete ${idsToDelete.length} selected ${noun}${idsToDelete.length === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmText: 'Delete Forever',
      onConfirm: () => {
        deleteIdsForever(idsToDelete);
        setSelectedIds(new Set());
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const handleEmptyBin = () => {
    if (items.length === 0) return;

    setConfirmDialog({
      visible: true,
      title: isNotes ? 'Empty Notes Bin' : 'Empty Tasks Bin',
      message: `Permanently delete all ${items.length} deleted ${noun}${items.length === 1 ? '' : 's'}? This action cannot be undone.`,
      confirmText: 'Empty Bin',
      onConfirm: () => {
        if (isNotes) {
          onEmptyNoteBin?.();
        } else {
          onEmptyBin();
        }
        setSelectedIds(new Set());
        setConfirmDialog((prev) => ({ ...prev, visible: false }));
      },
    });
  };

  const renderItem = ({ item }: { item: BinEntry }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => handleToggleSelectTask(item.id)}
        style={[
          styles.binItemCard,
          {
            backgroundColor: isSelected
              ? colorScheme === 'dark'
                ? '#1E293B'
                : '#EFF6FF'
              : theme.card,
            borderColor: isSelected ? '#3B82F6' : theme.cardBorder,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}>
        {/* Main Header Row: Selection Squircle Checkbox + Date */}
        <View style={styles.itemTopRow}>
          <View style={styles.itemTopLeftRow}>
            {/* Selection Squircle Checkbox */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleToggleSelectTask(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.checkboxTouch}>
              {isSelected ? (
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.checkboxGradient}>
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.checkboxEmpty,
                    {
                      borderColor: colorScheme === 'dark' ? '#475569' : '#CBD5E1',
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          </View>

          <Text style={[styles.dateText, { color: theme.textSecondary }]}>
            {formatDateForDisplay(item.date)}
          </Text>
        </View>

        {/* Task Text */}
        <Text
          style={[
            styles.taskText,
            {
              color: theme.text,
              textDecorationLine: 'line-through',
              opacity: 0.85,
            },
          ]}
          numberOfLines={isNotes ? 2 : 3}>
          {item.title}
        </Text>
        {isNotes && !!item.preview && (
          <Text style={[styles.previewText, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.preview}
          </Text>
        )}

        {/* Action Buttons: Restore & Delete Forever */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={`Restore ${noun}`}
            activeOpacity={0.75}
            onPress={(e) => {
              e.stopPropagation?.();
              handleRestoreSingle(item.id);
            }}
            style={[
              styles.restoreBtn,
              { backgroundColor: colorScheme === 'dark' ? '#1E3A8A' : '#EFF6FF' },
            ]}>
            <Ionicons name="arrow-undo" size={14} color="#3B82F6" />
            <Text style={[styles.restoreBtnText, { color: '#3B82F6' }]}>Restore</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Delete forever"
            activeOpacity={0.75}
            onPress={(e) => {
              e.stopPropagation?.();
              handleDeletePermanentlySingle(item.id, item.title);
            }}
            style={[
              styles.deleteBtn,
              { backgroundColor: colorScheme === 'dark' ? '#3F1A1A' : '#FEE2E2' },
            ]}>
            <Ionicons name="trash" size={14} color="#EF4444" />
            <Text style={[styles.deleteBtnText, { color: '#EF4444' }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconCircle, { backgroundColor: theme.inputBg }]}>
        <Ionicons name="trash-bin-outline" size={40} color={theme.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No deleted {noun}s</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Deleted {noun}s will be stored here. You can restore them anytime.
      </Text>
    </View>
  );

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleClose]);

  return (
    <Modal
      visible={visible}
      // No fade on Android: the bin opens and closes instantly over Settings.
      animationType={Platform.OS === 'ios' ? 'slide' : 'none'}
      presentationStyle="pageSheet"
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Modal Header */}
        <View
          style={[
            styles.modalHeader,
            {
              paddingTop: topInset + 10,
              borderBottomColor: theme.cardBorder,
              backgroundColor: theme.card,
            },
          ]}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.headerIconCircle}>
              <Ionicons name="trash" size={18} color="#EF4444" />
            </View>
            <View>
              <View style={styles.titleWithCount}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Recycle Bin</Text>
                {binTodos.length + binNotes.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{binTodos.length + binNotes.length}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Restore or clear deleted tasks and notes
              </Text>
            </View>
          </View>

          <View style={styles.headerRightActions}>
            {items.length > 0 && (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={`Empty ${noun}s bin`}
                activeOpacity={0.7}
                onPress={handleEmptyBin}
                style={styles.emptyActionBtn}>
                <Text style={styles.emptyActionText}>Empty</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Close bin"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks / Notes switch */}
        <View style={[styles.tabRow, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
          <View style={[styles.tabTrack, { backgroundColor: theme.inputBg }]}>
            {(['tasks', 'notes'] as const).map((tab) => {
              const selected = tab === activeTab;
              const count = tab === 'notes' ? binNotes.length : binTodos.length;
              return (
                <TouchableOpacity
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Deleted ${tab}, ${count}`}
                  activeOpacity={0.8}
                  onPress={() => handleSwitchTab(tab)}
                  style={[styles.tabBtn, selected && { backgroundColor: theme.card }]}>
                  <Ionicons
                    name={tab === 'notes' ? 'document-text-outline' : 'checkmark-done-circle-outline'}
                    size={15}
                    color={selected ? '#3B82F6' : theme.textSecondary}
                  />
                  <Text style={[styles.tabText, { color: selected ? theme.text : theme.textSecondary }]}>
                    {tab === 'notes' ? 'Notes' : 'Tasks'} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Toolbar: "Select All" & "Restore All" */}
        {items.length > 0 && (
          <View
            style={[
              styles.toolbarContainer,
              {
                backgroundColor: theme.card,
                borderBottomColor: theme.cardBorder,
              },
            ]}>
            {/* Select All Button */}
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
                size={16}
                color={isAllSelected ? '#3B82F6' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.selectAllText,
                  { color: isAllSelected ? '#3B82F6' : theme.textSecondary },
                ]}>
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>

            {/* Quick "Restore All" or "Restore Selected" */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={hasSelection ? handleRestoreSelected : handleRestoreAll}
              style={styles.restoreAllBtn}>
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.restoreAllGradient}>
                <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
                <Text style={styles.restoreAllText}>
                  {hasSelection
                    ? `Restore Selected (${selectedIds.size})`
                    : `Restore All (${items.length})`}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Bin Items List */}
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmptyComponent}
          contentContainerStyle={[
            styles.listContent,
            hasSelection && { paddingBottom: 90 },
          ]}
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Batch Action Bar when tasks are selected */}
        {hasSelection && (
          <View
            style={[
              styles.floatingActionBar,
              {
                backgroundColor: colorScheme === 'dark' ? '#0F172A' : '#1E293B',
                bottom: insets.bottom + 16,
              },
            ]}>
            <View style={styles.floatingLeftRow}>
              <View style={styles.floatingCountBadge}>
                <Text style={styles.floatingCountText}>{selectedIds.size}</Text>
              </View>
              <Text style={styles.floatingLabel}>selected</Text>
            </View>

            <View style={styles.floatingRightRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleDeletePermanentlySelected}
                style={styles.floatingDeleteBtn}>
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.floatingDeleteText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleRestoreSelected}
                style={styles.floatingRestoreBtn}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.floatingRestoreGradient}>
                  <Ionicons name="arrow-undo" size={15} color="#FFFFFF" />
                  <Text style={styles.floatingRestoreText}>Restore</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Custom Material 3 Confirmation Dialog */}
        <ConfirmDialog
          visible={confirmDialog.visible}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmText={confirmDialog.confirmText}
          cancelText="Cancel"
          variant="danger"
          iconName="trash"
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWithCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  emptyActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  emptyActionText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabTrack: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  selectAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  restoreAllBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  restoreAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  restoreAllText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  binItemCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  itemTopLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkboxTouch: {
    padding: 2,
  },
  checkboxGradient: {
    width: 22,
    height: 22,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxEmpty: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 2,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  taskText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 14,
    paddingLeft: 4,
  },
  previewText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: -8,
    marginBottom: 14,
    paddingLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  restoreBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  floatingActionBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 16,
  },
  floatingLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingCountBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  floatingLabel: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  floatingRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  floatingDeleteText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  floatingRestoreBtn: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  floatingRestoreGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  floatingRestoreText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
