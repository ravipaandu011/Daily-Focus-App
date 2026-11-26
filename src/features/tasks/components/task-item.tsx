import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/features/tasks/types';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TaskItemProps {
  item: TodoItem;
  sectionConfig: SectionConfig;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  isLast?: boolean;
  onSelectTask?: (id: string) => void;
  onLongPressSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit?: (item: TodoItem) => void;
  onToggleSubtask?: (todoId: string, subtaskId: string) => void;
}

const TaskItemComponent: React.FC<TaskItemProps> = ({
  item,
  sectionConfig,
  isSelected,
  isSelectionMode,
  isLast,
  onSelectTask,
  onLongPressSelect,
  onToggle,
  onEdit,
  onToggleSubtask,
}) => {
  const hasSubtasks = Boolean(item.subtasks && item.subtasks.length > 0);
  // Subtasks show by default (also when added later); the user can collapse them.
  const [subtasksCollapsed, setSubtasksCollapsed] = useState(false);
  const expandedSubtasks = hasSubtasks && !subtasksCollapsed;
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];

  const handleToggleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(item.id);
  };

  const handleCardPress = () => {
    if (isSelectionMode) {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      onSelectTask?.(item.id);
    } else {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      onEdit?.(item);
    }
  };

  const handleCardLongPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onLongPressSelect?.(item.id);
  };

  const handleSubtaskToggle = (subtaskId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggleSubtask?.(item.id, subtaskId);
  };

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url).catch((e) => console.error('Failed to open url', e));
  };

  const subtasksTotal = item.subtasks?.length || 0;
  const subtasksDone = item.subtasks?.filter((s) => s.completed).length || 0;
  const completionPercentage =
    subtasksTotal > 0 ? Math.round((subtasksDone / subtasksTotal) * 100) : 0;
  const urlMatch = item.notes?.match(/https?:\/\/[^\s]+/);
  const isChecked = Boolean(item.completed);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={handleCardPress}
      onLongPress={handleCardLongPress}
      delayLongPress={220}
      style={[
        styles.wrapper,
        item.completed && styles.completedContainer,
        {
          backgroundColor: isSelected
            ? (isDark ? 'rgba(42, 123, 155, 0.22)' : 'rgba(42, 123, 155, 0.10)')
            : 'transparent',
        },
      ]}>
      <View
        style={[
          styles.flowContainer,
          !isLast && {
            borderBottomWidth: 1,
            borderBottomColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.06)',
          },
        ]}>
        {/* Left Vertical Glowing Accent Spine */}
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[
            styles.leftAccentSpine,
            { shadowColor: sectionConfig.color },
          ]}
        />
        {renderCardContent()}
      </View>
    </TouchableOpacity>
  );
  function renderCardContent() {
    return (
      <View style={styles.cardContent}>
        {/* Main Row: Checkbox / Selection Circle, Text, Badges */}
        <View style={styles.mainRow}>
          {/* Checkbox */}
          {isSelectionMode ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onSelectTask?.(item.id)}
              style={styles.checkboxTouch}>
              {isSelected ? (
                <LinearGradient
                  colors={sectionConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.checkboxGradient, { shadowColor: sectionConfig.color }]}>
                  <Ionicons name="checkmark" size={14} color={sectionConfig.onGradient} />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.checkboxEmpty,
                    {
                      borderColor: isDark ? '#64748B' : '#CBD5E1',
                      backgroundColor: 'transparent',
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              accessibilityLabel={`Mark "${item.text}" as ${item.completed ? 'pending' : 'completed'}`}
              activeOpacity={0.7}
              onPress={handleToggleComplete}
              style={styles.checkboxTouch}>
              {isChecked ? (
                <LinearGradient
                  colors={sectionConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.checkboxGradient, { shadowColor: sectionConfig.color }]}>
                  <Ionicons name="checkmark" size={14} color={sectionConfig.onGradient} />
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.checkboxEmpty,
                    {
                      borderColor: isDark ? '#64748B' : '#CBD5E1',
                      backgroundColor: 'transparent',
                    },
                  ]}
                />
              )}
            </TouchableOpacity>
          )}

          {/* Task Info & Title */}
          <View style={styles.textContainer}>
            {/* Task Title */}
            <Text
              numberOfLines={4}
              style={[
                styles.taskTitle,
                { color: theme.text },
                item.completed && [styles.completedText, { color: theme.textMuted }],
              ]}>
              {item.text}
            </Text>

            {/* Badges & Meta Row */}
            <View style={styles.badgeRow}>
              {item.pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="star" size={9.5} color="#F59E0B" />
                  <Text style={styles.pinnedBadgeText}>PINNED</Text>
                </View>
              )}

              {item.priority && item.priority !== 'none' && (
                <View
                  style={[
                    styles.priorityPill,
                    {
                      backgroundColor:
                        item.priority === 'high'
                          ? 'rgba(239, 68, 68, 0.14)'
                          : item.priority === 'medium'
                          ? 'rgba(245, 158, 11, 0.14)'
                          : 'rgba(16, 185, 129, 0.14)',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.priorityPillText,
                      {
                        color:
                          item.priority === 'high'
                            ? '#EF4444'
                            : item.priority === 'medium'
                            ? '#F59E0B'
                            : '#10B981',
                      },
                    ]}>
                    {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
                  </Text>
                </View>
              )}

              {hasSubtasks && (
                <View style={styles.subtaskProgressWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSubtasksCollapsed((prev) => !prev)}
                    style={[
                      styles.subtaskCounterPill,
                      {
                        backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      },
                    ]}>
                    <Text style={[styles.subtaskCounterText, { color: theme.textSecondary }]}>
                      {subtasksDone}/{subtasksTotal} done
                    </Text>
                    <Ionicons
                      name={expandedSubtasks ? 'chevron-up' : 'chevron-down'}
                      size={11}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Inline Progress Bar next to 1/6 done */}
                  <View
                    style={[
                      styles.inlineProgressTrack,
                      { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' },
                    ]}>
                    <LinearGradient
                      colors={sectionConfig.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.inlineProgressFill, { width: `${completionPercentage}%` }]}
                    />
                  </View>

                  {/* Percentage only, no text */}
                  <Text style={[styles.inlineProgressPercentText, { color: sectionConfig.color }]}>
                    {completionPercentage}%
                  </Text>
                </View>
              )}

              {item.tag && (
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: isDark ? 'rgba(30, 58, 138, 0.5)' : '#EFF6FF',
                    },
                  ]}>
                  <Text style={styles.tagBadgeText}>#{item.tag}</Text>
                </View>
              )}
            </View>
          </View>

        </View>

        {/* Micro-Tree Subtask Checklist */}
        {expandedSubtasks && item.subtasks && item.subtasks.length > 0 && (
          <View style={styles.treeSubtasksContainer}>
            {item.subtasks.map((st, index) => {
              const isLastSubtask = index === item.subtasks!.length - 1;
              return (
                <View key={st.id} style={styles.treeSubtaskItem}>
                  {/* Tree Hierarchy Branch Indicator */}
                  <View style={styles.treeBranchContainer}>
                    {/* Vertical Line */}
                    <View
                      style={[
                        styles.treeVerticalLine,
                        isLastSubtask ? styles.treeVerticalLineLast : null,
                        { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                      ]}
                    />
                    {/* Horizontal Branch Line */}
                    <View
                      style={[
                        styles.treeHorizontalLine,
                        { backgroundColor: isDark ? '#334155' : '#CBD5E1' },
                      ]}
                    />
                  </View>

                  {/* Subtask Row Content */}
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleSubtaskToggle(st.id)}
                    style={styles.subtaskTouchableRow}>
                    {/* Mini Checkbox */}
                    {st.completed ? (
                      <LinearGradient
                        colors={sectionConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.miniCheckboxFilled}>
                        <Ionicons name="checkmark" size={11} color={sectionConfig.onGradient} />
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.miniCheckboxEmpty,
                          {
                            borderColor: isDark ? '#64748B' : '#94A3B8',
                          },
                        ]}
                      />
                    )}

                    {/* Subtask Text */}
                    <Text
                      style={[
                        styles.subtaskTitle,
                        { color: theme.text },
                        st.completed && [styles.completedText, { color: theme.textMuted }],
                      ]}>
                      {st.title}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}

          </View>
        )}

        {/* Task Notes Snippet & Clickable Links */}
        {item.notes && (
          <View
            style={[
              styles.notesContainer,
              { backgroundColor: isDark ? '#0F172A' : 'rgba(241, 245, 249, 0.7)' },
            ]}>
            <Ionicons name="document-text-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.notesText, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.notes}
            </Text>
            {urlMatch && (
              <TouchableOpacity
                onPress={() => handleOpenUrl(urlMatch[0])}
                style={styles.openUrlBtn}>
                <Ionicons name="open-outline" size={12} color="#3B82F6" />
                <Text style={styles.openUrlText}>Open Link</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }
};

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    borderRadius: 8,
  },
  flowContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    position: 'relative',
  },
  leftAccentSpine: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3,
    borderRadius: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  cardContent: {
    flex: 1,
    gap: 8,
    paddingLeft: 14,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  completedContainer: {
    opacity: 0.6,
  },
  checkboxTouch: {
    marginRight: 11,
    marginTop: 1,
  },
  checkboxGradient: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 2,
  },
  checkboxEmpty: {
    width: 25,
    height: 25,
    borderRadius: 12.5,
    borderWidth: 1.8,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  pinnedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  subtaskCounterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  subtaskCounterText: {
    fontSize: 10,
    fontWeight: '700',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },
  treeSubtasksContainer: {
    marginTop: 4,
    paddingTop: 4,
    paddingLeft: 4,
    gap: 6,
  },
  treeSubtaskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  treeBranchContainer: {
    width: 22,
    height: 24,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeVerticalLine: {
    position: 'absolute',
    left: 8,
    top: 0,
    bottom: 0,
    width: 1.5,
  },
  treeVerticalLineLast: {
    bottom: 12,
  },
  treeHorizontalLine: {
    position: 'absolute',
    left: 8,
    top: 12,
    width: 12,
    height: 1.5,
  },
  subtaskTouchableRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 2,
  },
  miniCheckboxFilled: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCheckboxEmpty: {
    width: 17,
    height: 17,
    borderRadius: 8.5,
    borderWidth: 1.5,
  },
  subtaskTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  subtaskProgressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 180,
    minWidth: 140,
  },
  inlineProgressTrack: {
    flex: 1,
    height: 4.5,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  inlineProgressFill: {
    height: '100%',
    borderRadius: 9999,
  },
  inlineProgressPercentText: {
    fontSize: 11,
    fontWeight: '800',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 12,
    marginTop: 2,
  },
  notesText: {
    fontSize: 12,
    flex: 1,
  },
  openUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  openUrlText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '700',
  },
});

// Tasks are replaced only when they change, so a shallow prop comparison is enough.
export const TaskItem = React.memo(TaskItemComponent);















