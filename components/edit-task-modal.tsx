import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem, RecurrenceType, SubtaskItem } from '@/types/todo';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { RECURRENCE_OPTIONS } from '@/components/add-task-modal';

interface EditTaskModalProps {
  visible: boolean;
  item: TodoItem | null;
  sectionConfig: SectionConfig;
  onClose: () => void;
  onSave: (params: {
    id: string;
    text: string;
    tag?: string;
    recurrence?: RecurrenceType;
    subtasks?: SubtaskItem[];
    notes?: string;
  }) => void;
}

export const EditTaskModal: React.FC<EditTaskModalProps> = ({
  visible,
  item,
  sectionConfig,
  onClose,
  onSave,
}) => {
  const [text, setText] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceType>('none');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const inputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  useEffect(() => {
    if (item && visible) {
      setText(item.text);
      setNotes(item.notes || '');
      setSelectedRecurrence(item.recurrence || 'none');
      setSubtasks(item.subtasks || []);
      setSubtaskInput('');
    }
  }, [item, visible]);

  const handleAddSubtask = () => {
    const trimmed = subtaskInput.trim();
    if (!trimmed) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newItems: SubtaskItem[] = lines.map((l, idx) => ({
      id: `st_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      title: l,
      completed: false,
    }));

    setSubtasks((prev) => [...prev, ...newItems]);
    setSubtaskInput('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || !item) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Auto-flush any subtask currently in the text box
    const currentSubtaskText = subtaskInput.trim();
    let finalSubtasks = [...subtasks];
    if (currentSubtaskText) {
      const extraLines = currentSubtaskText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      extraLines.forEach((l, idx) => {
        finalSubtasks.push({
          id: `st_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          title: l,
          completed: false,
        });
      });
    }

    onSave({
      id: item.id,
      text: trimmed,
      tag: item.tag,
      recurrence: selectedRecurrence !== 'none' ? selectedRecurrence : undefined,
      subtasks: finalSubtasks.length > 0 ? finalSubtasks : undefined,
      notes: notes.trim() || undefined,
    });
    setSubtaskInput('');
    onClose();
  };

  const handleClose = React.useCallback(() => {
    inputRef.current?.blur();
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

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}>
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.cardBorder,
                  },
                ]}>
                {/* Header */}
                <View style={styles.headerRow}>
                  <View style={styles.titleContainer}>
                    <LinearGradient
                      colors={sectionConfig.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.headerIconGradient}>
                      <Ionicons name="pencil" size={16} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                      Edit Task
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleClose}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  {/* Task Text Input */}
                  <View style={styles.inputWrapper}>
                    <TextInput
                      ref={inputRef}
                      value={text}
                      onChangeText={setText}
                      placeholder="Task description"
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.input,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.inputBorder,
                          color: theme.text,
                        },
                      ]}
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit}
                    />
                  </View>

                  {/* Recurrence Selector */}
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Auto-Repeat Recurrence:
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.tagsScroll}>
                    {RECURRENCE_OPTIONS.map((rec) => {
                      const isSel = selectedRecurrence === rec.key;
                      return (
                        <TouchableOpacity
                          key={rec.key}
                          onPress={() => setSelectedRecurrence(rec.key)}
                          style={[
                            styles.tagChip,
                            {
                              backgroundColor: isSel ? sectionConfig.color : theme.inputBg,
                              borderColor: isSel ? sectionConfig.color : theme.cardBorder,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.tagText,
                              {
                                color: isSel ? '#FFFFFF' : theme.textSecondary,
                                fontWeight: isSel ? '700' : '500',
                              },
                            ]}>
                            {rec.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Subtasks Builder */}
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                    Subtasks & Checklist:
                  </Text>
                  <View style={styles.subtaskInputRow}>
                    <TextInput
                      value={subtaskInput}
                      onChangeText={setSubtaskInput}
                      placeholder="Add a subtask..."
                      placeholderTextColor={theme.textMuted}
                      style={[
                        styles.subtaskInput,
                        {
                          backgroundColor: theme.inputBg,
                          borderColor: theme.inputBorder,
                          color: theme.text,
                        },
                      ]}
                      onSubmitEditing={handleAddSubtask}
                    />
                    <TouchableOpacity
                      onPress={handleAddSubtask}
                      disabled={!subtaskInput.trim()}
                      style={[styles.addSubtaskBtn, { backgroundColor: theme.inputBg }]}>
                      <Ionicons name="add" size={18} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {subtasks.length > 0 && (
                    <View style={styles.subtasksList}>
                      {subtasks.map((st) => (
                        <View key={st.id} style={[styles.subtaskPill, { backgroundColor: theme.inputBg }]}>
                          <Ionicons name="checkbox-outline" size={13} color={theme.textSecondary} />
                          <Text style={[styles.subtaskPillText, { color: theme.text }]}>
                            {st.title}
                          </Text>
                          <TouchableOpacity onPress={() => handleRemoveSubtask(st.id)}>
                            <Ionicons name="close" size={14} color={theme.textMuted} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Notes Input */}
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 12 }]}>
                    Notes & Links:
                  </Text>
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add reference notes, links..."
                    placeholderTextColor={theme.textMuted}
                    multiline
                    numberOfLines={2}
                    style={[
                      styles.notesInput,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                  />
                </ScrollView>

                {/* Save Button */}
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!text.trim()}
                  activeOpacity={0.85}
                  style={styles.submitTouchable}>
                  <LinearGradient
                    colors={sectionConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.submitBtnGradient,
                      { opacity: text.trim() ? 1 : 0.45 },
                    ]}>
                    <Text style={styles.submitBtnText}>Save Changes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    maxHeight: '90%',
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconGradient: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputWrapper: {
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 18, // Material 3 Pill Input
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  addSubtaskBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtasksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  subtaskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  subtaskPillText: {
    fontSize: 12,
  },
  notesInput: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    fontSize: 12,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  submitTouchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 10,
  },
  submitBtnGradient: {
    height: 52,
    borderRadius: 18, // Material 3 Rounded Button
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
