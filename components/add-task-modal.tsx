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
  Keyboard,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionConfig } from '@/constants/sections';
import { RecurrenceType, SubtaskItem } from '@/types/todo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
} from '@/utils/date';

interface AddTaskModalProps {
  visible: boolean;
  sectionConfig: SectionConfig;
  initialDate?: string;
  onClose: () => void;
  onAdd: (params: {
    text: string;
    date: string;
    tag?: string;
    recurrence?: RecurrenceType;
    subtasks?: SubtaskItem[];
    notes?: string;
  }) => void;
  onAddBatch?: (texts: string[], date: string, tag?: string) => void;
}

export const RECURRENCE_OPTIONS: { key: RecurrenceType; label: string }[] = [
  { key: 'none', label: 'None' },
  { key: 'daily', label: '🔁 Daily' },
  { key: 'weekdays', label: '💼 Mon-Fri' },
  { key: 'weekly', label: '📅 Weekly' },
  { key: 'monthly', label: '💳 Monthly' },
];

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  sectionConfig,
  initialDate,
  onClose,
  onAdd,
  onAddBatch,
}) => {
  const [text, setText] = useState('');
  const [targetDate, setTargetDate] = useState(initialDate || getTodayKey());
  const [selectedRecurrence, setSelectedRecurrence] = useState<RecurrenceType>('none');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const inputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const tomorrow = getTomorrowKey();

  useEffect(() => {
    if (visible) {
      setText('');
      setSelectedRecurrence('none');
      setNotes('');
      setSubtasks([]);
      setSubtaskInput('');
      setIsBatchMode(false);
      setShowAdvanced(false);
      setTargetDate(initialDate || getTodayKey());
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, initialDate]);

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
    if (!trimmed) return;

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

    const lines = trimmed
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length > 1 && onAddBatch) {
      onAddBatch(lines, targetDate);
    } else {
      onAdd({
        text: lines[0] || trimmed,
        date: targetDate,
        recurrence: selectedRecurrence !== 'none' ? selectedRecurrence : undefined,
        subtasks: finalSubtasks.length > 0 ? finalSubtasks : undefined,
        notes: notes.trim() || undefined,
      });
    }

    setText('');
    setSubtaskInput('');
    setSubtasks([]);
    onClose();
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const lineCount = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}>
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
                      <Ionicons
                        name={sectionConfig.activeIconName}
                        size={18}
                        color="#FFFFFF"
                      />
                    </LinearGradient>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                      {isBatchMode ? 'Batch Task Input' : 'New Task'}
                    </Text>
                  </View>

                  <View style={styles.headerActions}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setIsBatchMode((prev) => !prev)}
                      style={[
                        styles.modeToggleBtn,
                        {
                          backgroundColor: isBatchMode
                            ? colorScheme === 'dark'
                              ? '#1E3A8A'
                              : '#EFF6FF'
                            : theme.inputBg,
                        },
                      ]}>
                      <Ionicons
                        name={isBatchMode ? 'list' : 'list-outline'}
                        size={14}
                        color={isBatchMode ? '#3B82F6' : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.modeToggleText,
                          {
                            color: isBatchMode ? '#3B82F6' : theme.textSecondary,
                          },
                        ]}>
                        {isBatchMode ? 'Multi-line' : 'Single'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleClose}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
                      <Ionicons name="close" size={18} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Day Selection Chips */}
                <View style={styles.dateSelectorContainer}>
                  <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                    Schedule for:
                  </Text>
                  <View style={styles.dateChipsRow}>
                    {[
                      { key: yesterday, label: 'Yesterday' },
                      { key: today, label: 'Today' },
                      { key: tomorrow, label: 'Tomorrow' },
                    ].map((item) => {
                      const isActive = targetDate === item.key;
                      return (
                        <TouchableOpacity
                          key={item.key}
                          activeOpacity={0.75}
                          onPress={() => setTargetDate(item.key)}
                          style={styles.dateChipTouchable}>
                          {isActive ? (
                            <LinearGradient
                              colors={sectionConfig.gradient}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                              style={styles.dateChipActive}>
                              <Text style={styles.dateChipTextActive}>{item.label}</Text>
                            </LinearGradient>
                          ) : (
                            <View
                              style={[
                                styles.dateChipInactive,
                                {
                                  backgroundColor: theme.inputBg,
                                  borderColor: theme.cardBorder,
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.dateChipTextInactive,
                                  { color: theme.textSecondary },
                                ]}>
                                {item.label}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Input (Single or Multi-line) */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    ref={inputRef}
                    value={text}
                    onChangeText={setText}
                    placeholder={
                      isBatchMode
                        ? 'Paste multiple tasks (one per line)...'
                        : 'What do you need to do?'
                    }
                    placeholderTextColor={theme.textMuted}
                    style={[
                      styles.input,
                      isBatchMode && styles.inputBatch,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.inputBorder,
                        color: theme.text,
                      },
                    ]}
                    multiline={isBatchMode}
                    numberOfLines={isBatchMode ? 4 : 1}
                    returnKeyType={isBatchMode ? 'default' : 'done'}
                    onSubmitEditing={!isBatchMode ? handleSubmit : undefined}
                    blurOnSubmit={!isBatchMode}
                  />
                </View>

                {/* Advanced Options Toggle */}
                {!isBatchMode && (
                  <TouchableOpacity
                    onPress={() => setShowAdvanced((p) => !p)}
                    style={styles.advancedToggle}>
                    <Ionicons
                      name={showAdvanced ? 'chevron-up' : 'options-outline'}
                      size={14}
                      color="#3B82F6"
                    />
                    <Text style={styles.advancedToggleText}>
                      {showAdvanced ? 'Hide Advanced Options' : '+ Subtasks, Recurrence & Notes'}
                    </Text>
                  </TouchableOpacity>
                )}

                {showAdvanced && !isBatchMode && (
                  <View style={styles.advancedSection}>
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
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 10 }]}>
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
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 10 }]}>
                      Notes & Links (Optional):
                    </Text>
                    <TextInput
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Add reference links, notes..."
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
                  </View>
                )}

                {/* Add Task Button with Material Rounded Radius */}
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
                    <Text style={styles.submitBtnText}>
                      {lineCount > 1 ? `Add ${lineCount} Tasks` : 'Add Task'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    width: '100%',
  },
  modalContent: {
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  dateSelectorContainer: {
    marginBottom: 12,
  },
  dateChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dateChipTouchable: {
    flex: 1,
  },
  dateChipActive: {
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  dateChipInactive: {
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dateChipTextInactive: {
    fontSize: 12,
    fontWeight: '600',
  },
  tagsContainer: {
    marginBottom: 14,
  },
  tagsScroll: {
    flexDirection: 'row',
    gap: 6,
  },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
  },
  inputWrapper: {
    marginBottom: 12,
  },
  input: {
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 18,
    fontSize: 15,
    fontWeight: '500',
  },
  inputBatch: {
    height: 90,
    borderRadius: 22,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  advancedToggleText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '700',
  },
  advancedSection: {
    marginBottom: 16,
    gap: 6,
  },
  subtaskInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  subtaskInput: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 13,
  },
  addSubtaskBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  subtaskPillText: {
    fontSize: 12,
  },
  notesInput: {
    height: 58,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  submitTouchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnGradient: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
