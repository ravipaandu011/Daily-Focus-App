import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Linking,
  PanResponder,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/types/todo';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TaskItemProps {
  item: TodoItem;
  sectionConfig: SectionConfig;
  isSelected?: boolean;
  isSelectionMode?: boolean;
  isReorderMode?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onSelectTask?: (id: string) => void;
  onLongPressSelect?: (id: string) => void;
  onToggle: (id: string) => void;
  onEdit?: (item: TodoItem) => void;
  onToggleSubtask?: (todoId: string, subtaskId: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

const TaskItemComponent: React.FC<TaskItemProps> = ({
  item,
  sectionConfig,
  isSelected,
  isSelectionMode,
  isReorderMode = false,
  isFirst,
  isLast,
  onSelectTask,
  onLongPressSelect,
  onToggle,
  onEdit,
  onToggleSubtask,
  onMoveUp,
  onMoveDown,
}) => {
  const hasSubtasks = Boolean(item.subtasks && item.subtasks.length > 0);
  const [expandedSubtasks, setExpandedSubtasks] = useState<boolean>(hasSubtasks);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';
  const theme = Colors[colorScheme];

  // Scale animation for drag lift effect
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // gestureState.dy is CUMULATIVE from gesture start (not per-frame delta).
  // We track lastDyRef to compute per-frame delta accurately.
  const bucketRef = useRef<number>(0);  // fractional px accumulator
  const lastDyRef = useRef<number>(0);  // previous frame cumulative dy
  const SLOT_HEIGHT = 56;               // approximate card height in px

  // dragHandleResponder is ONLY attached to the visible drag handle icon.
  // Normal card taps will never trigger drag logic.
  const dragHandleResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setIsDragging(true);
        bucketRef.current = 0;
        lastDyRef.current = 0;
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Animated.spring(scaleAnim, { toValue: 1.03, friction: 6, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        const delta = gestureState.dy - lastDyRef.current;
        lastDyRef.current = gestureState.dy;
        bucketRef.current += delta;

        if (bucketRef.current <= -SLOT_HEIGHT) {
          bucketRef.current += SLOT_HEIGHT;
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMoveUp?.(item.id);
        } else if (bucketRef.current >= SLOT_HEIGHT) {
          bucketRef.current -= SLOT_HEIGHT;
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onMoveDown?.(item.id);
        }
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        bucketRef.current = 0;
        lastDyRef.current = 0;
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        bucketRef.current = 0;
        lastDyRef.current = 0;
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, useNativeDriver: true }).start();
      },
    })
  ).current;
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
    <Animated.View

      style={[
        { transform: [{ scale: scaleAnim }] },
        isReorderMode && { zIndex: isDragging ? 999 : 1 },
      ]}>
      {isReorderMode ? (
        <View
          style={[
            styles.wrapper,
            item.completed && styles.completedContainer,
            isDragging && [
              styles.draggingWrapper,
              {
                backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                borderColor: sectionConfig.color,
                borderWidth: 1.5,
              },
            ],
            !isDragging && {
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
              borderRadius: 12,
              marginVertical: 3,
              backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(241, 245, 249, 0.6)',
            },
          ]}>
          <View style={styles.flowContainer}>
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
        </View>
      ) : (
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
                ? (isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)')
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
      )}
    </Animated.View>
  );
  function renderCardContent() {
    return (
      <View style={styles.cardContent}>
        {/* Main Row: Checkbox / Selection Circle, Text, Badges, Drag Handle */}
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
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
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
                  <Ionicons name="checkmark" size={14} color="#FFFFFF" />
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
                    onPress={() => setExpandedSubtasks((prev) => !prev)}
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

          {/* Drag Handle - attached ONLY here, not on whole card */}
          {isReorderMode && (
            <View
              {...dragHandleResponder.panHandlers}
              hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }}
              style={styles.dragHandleArea}>
              <Ionicons
                name="reorder-three-outline"
                size={24}
                color={isDragging ? sectionConfig.color : (isDark ? '#64748B' : '#94A3B8')}
              />
            </View>
          )}
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
                        <Ionicons name="checkmark" size={11} color="#FFFFFF" />
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
  draggingWrapper: {
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    borderRadius: 12,
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
  dragHandleArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 4,
  },
  reorderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 6,
  },
  reorderButtonsCol: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 1,
  },
  shiftBtn: {
    padding: 2,
    borderRadius: 4,
  },
  shiftBtnDisabled: {
    opacity: 0.25,
  },
  dragHandleTouch: {
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandlePill: {
    paddingHorizontal: 5,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
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

export const TaskItem = React.memo(TaskItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isSelectionMode === nextProps.isSelectionMode &&
    prevProps.isReorderMode === nextProps.isReorderMode &&
    prevProps.isFirst === nextProps.isFirst &&
    prevProps.isLast === nextProps.isLast &&
    prevProps.sectionConfig.color === nextProps.sectionConfig.color &&
    JSON.stringify(prevProps.sectionConfig.gradient) === JSON.stringify(nextProps.sectionConfig.gradient) &&
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.text === nextProps.item.text &&
    prevProps.item.completed === nextProps.item.completed &&
    prevProps.item.pinned === nextProps.item.pinned &&
    prevProps.item.priority === nextProps.item.priority &&
    prevProps.item.order === nextProps.item.order &&
    prevProps.item.tag === nextProps.item.tag &&
    prevProps.item.recurrence === nextProps.item.recurrence &&
    prevProps.item.notes === nextProps.item.notes &&
    prevProps.item.date === nextProps.item.date &&
    JSON.stringify(prevProps.item.subtasks) === JSON.stringify(nextProps.item.subtasks)
  );
});















