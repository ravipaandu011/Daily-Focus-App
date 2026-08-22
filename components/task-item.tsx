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
import { TodoItem } from '@/types/todo';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TaskItemProps {
  item: TodoItem;
  sectionConfig: SectionConfig;
  isSelected?: boolean;
  onSelectTask?: (id: string) => void;
  onToggle: (id: string) => void;
  onToggleSubtask?: (todoId: string, subtaskId: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
}

const TaskItemComponent: React.FC<TaskItemProps> = ({
  item,
  sectionConfig,
  isSelected,
  onSelectTask,
  onToggle,
  onToggleSubtask,
  onMoveUp,
  onMoveDown,
}) => {
  const hasSubtasks = Boolean(item.subtasks && item.subtasks.length > 0);
  const [expandedSubtasks, setExpandedSubtasks] = useState<boolean>(hasSubtasks);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const handleToggleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggle(item.id);
  };

  const handleCardPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelectTask?.(item.id);
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
  const urlMatch = item.notes?.match(/https?:\/\/[^\s]+/);

  const isChecked = Boolean(item.completed);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handleCardPress}
      style={[
        styles.container,
        {
          backgroundColor:
            colorScheme === 'dark' ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
          borderColor: isSelected
            ? sectionConfig.color
            : item.pinned
            ? '#F59E0B'
            : item.completed
            ? theme.cardBorder
            : colorScheme === 'dark'
            ? 'rgba(51, 65, 85, 0.65)'
            : 'rgba(226, 232, 240, 0.9)',
          borderWidth: isSelected ? 1.8 : 1,
          shadowColor: isSelected ? sectionConfig.color : '#000000',
          shadowOpacity: isSelected
            ? colorScheme === 'dark'
              ? 0.35
              : 0.12
            : colorScheme === 'dark'
            ? 0.2
            : 0.04,
          shadowRadius: isSelected ? 8 : 6,
        },
        item.completed && styles.completedContainer,
      ]}>
      {/* Main Row: Rounded Checkbox, Text, Badges */}
      <View style={styles.mainRow}>
        {/* Checkbox: Radiant Gradient Checkmark (Style 2) */}
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
                  borderColor: isSelected
                    ? sectionConfig.color
                    : colorScheme === 'dark'
                    ? '#64748B'
                    : '#CBD5E1',
                  backgroundColor: 'transparent',
                },
              ]}
            />
          )}
        </TouchableOpacity>

        {/* Task Text & Badges */}
        <View style={styles.textContainer}>
          {(item.pinned || (item.priority && item.priority !== 'none') || (item.recurrence && item.recurrence !== 'none') || subtasksTotal > 0) && (
            <View style={styles.badgeRow}>
              {item.pinned && (
                <View style={styles.pinnedBadge}>
                  <Ionicons name="star" size={10} color="#F59E0B" />
                  <Text style={styles.pinnedBadgeText}>PINNED</Text>
                </View>
              )}

              {item.priority && item.priority !== 'none' && (
                <View
                  style={[
                    styles.priorityBadge,
                    {
                      backgroundColor:
                        item.priority === 'high'
                          ? colorScheme === 'dark'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : '#FEF2F2'
                          : item.priority === 'medium'
                          ? colorScheme === 'dark'
                            ? 'rgba(245, 158, 11, 0.2)'
                            : '#FFFBEB'
                          : colorScheme === 'dark'
                          ? 'rgba(59, 130, 246, 0.2)'
                          : '#EFF6FF',
                      borderColor:
                        item.priority === 'high'
                          ? '#EF4444'
                          : item.priority === 'medium'
                          ? '#F59E0B'
                          : '#3B82F6',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.priorityBadgeText,
                      {
                        color:
                          item.priority === 'high'
                            ? '#EF4444'
                            : item.priority === 'medium'
                            ? '#F59E0B'
                            : '#3B82F6',
                      },
                    ]}>
                    {item.priority === 'high' ? '🔴 HIGH' : item.priority === 'medium' ? '🟡 MED' : '🔵 LOW'}
                  </Text>
                </View>
              )}

              {item.recurrence && item.recurrence !== 'none' && (
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: colorScheme === 'dark' ? '#3B200A' : '#FFF7ED',
                      borderColor: '#F97316',
                    },
                  ]}>
                  <Text style={[styles.tagBadgeText, { color: '#F97316' }]}>
                    🔁 {item.recurrence.toUpperCase()}
                  </Text>
                </View>
              )}

              {subtasksTotal > 0 && (
                <TouchableOpacity
                  onPress={() => setExpandedSubtasks((p) => !p)}
                  style={[
                    styles.subtaskProgressBadge,
                    {
                      backgroundColor:
                        subtasksDone === subtasksTotal
                          ? colorScheme === 'dark'
                            ? '#064E3B'
                            : '#ECFDF5'
                          : theme.inputBg,
                      borderColor: subtasksDone === subtasksTotal ? '#10B981' : theme.cardBorder,
                    },
                  ]}>
                  <Ionicons
                    name={subtasksDone === subtasksTotal ? 'checkmark-circle' : 'list'}
                    size={10}
                    color={subtasksDone === subtasksTotal ? '#10B981' : theme.textSecondary}
                  />
                  <Text
                    style={[
                      styles.subtaskProgressText,
                      {
                        color:
                          subtasksDone === subtasksTotal ? '#10B981' : theme.textSecondary,
                      },
                    ]}>
                    {subtasksDone}/{subtasksTotal}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text
            numberOfLines={4}
            style={[
              styles.text,
              { color: theme.text },
              item.completed && [styles.completedText, { color: theme.textMuted }],
            ]}>
            {item.text}
          </Text>
        </View>

        {/* Reorder Chevrons when selected */}
        {isSelected && (onMoveUp || onMoveDown) && (
          <View style={styles.reorderColumn}>
            {onMoveUp && (
              <TouchableOpacity
                onPress={() => onMoveUp(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.reorderBtn, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="chevron-up" size={13} color={sectionConfig.color} />
              </TouchableOpacity>
            )}
            {onMoveDown && (
              <TouchableOpacity
                onPress={() => onMoveDown(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={[styles.reorderBtn, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="chevron-down" size={13} color={sectionConfig.color} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Expandable Subtasks Checklist */}
      {expandedSubtasks && item.subtasks && item.subtasks.length > 0 && (
        <View style={[styles.subtasksContainer, { backgroundColor: theme.inputBg }]}>
          {item.subtasks.map((st) => (
            <TouchableOpacity
              key={st.id}
              activeOpacity={0.7}
              onPress={() => handleSubtaskToggle(st.id)}
              style={styles.subtaskRow}>
              <Ionicons
                name={st.completed ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={st.completed ? '#10B981' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.subtaskTitle,
                  { color: theme.text },
                  st.completed && styles.completedText,
                ]}>
                {st.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Task Notes Snippet & Clickable Links */}
      {item.notes && (
        <View style={[styles.notesContainer, { backgroundColor: theme.inputBg }]}>
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
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 9,
    borderRadius: 21,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
    gap: 8,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completedContainer: {
    opacity: 0.6,
  },
  checkboxTouch: {
    marginRight: 12,
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
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  pinnedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
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
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tagBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3B82F6',
  },
  subtaskProgressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 9999,
    borderWidth: 1,
  },
  subtaskProgressText: {
    fontSize: 10,
    fontWeight: '700',
  },
  text: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 21,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  subtasksContainer: {
    padding: 12,
    borderRadius: 18,
    gap: 8,
    marginTop: 2,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtaskTitle: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 14,
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
  reorderColumn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginLeft: 6,
  },
  reorderBtn: {
    width: 24,
    height: 20,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const TaskItem = React.memo(TaskItemComponent, (prevProps, nextProps) => {
  return (
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.sectionConfig.color === nextProps.sectionConfig.color &&
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

