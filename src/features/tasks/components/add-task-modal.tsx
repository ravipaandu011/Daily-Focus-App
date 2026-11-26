import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  ScrollView,
  BackHandler,
  Keyboard,
} from 'react-native';
import type { TextInputInstance } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionConfig } from '@/constants/sections';
import { SubtaskItem, PriorityLevel } from '@/features/tasks/types';
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
    priority?: PriorityLevel;
    tag?: string;
    subtasks?: SubtaskItem[];
    notes?: string;
  }) => void;
  onAddBatch?: (texts: string[], date: string, tag?: string, priority?: PriorityLevel) => void;
}

export const PRIORITY_OPTIONS: { key: PriorityLevel; label: string; color: string }[] = [
  { key: 'none', label: 'None', color: '#64748B' },
  { key: 'low', label: '🔵 Low', color: '#3B82F6' },
  { key: 'medium', label: '🟡 Med', color: '#F59E0B' },
  { key: 'high', label: '🔴 High', color: '#EF4444' },
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
  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>('none');
  const [notes, setNotes] = useState('');
  const [subtasks, setSubtasks] = useState<SubtaskItem[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const inputRef = useRef<TextInputInstance>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const tomorrow = getTomorrowKey();

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
      onAddBatch(lines, targetDate, undefined, selectedPriority);
    } else {
      onAdd({
        text: lines[0] || trimmed,
        date: targetDate,
        priority: selectedPriority !== 'none' ? selectedPriority : undefined,
        subtasks: finalSubtasks.length > 0 ? finalSubtasks : undefined,
        notes: notes.trim() || undefined,
      });
    }

    setText('');
    setSelectedPriority('none');
    setSubtaskInput('');
    setSubtasks([]);
    Keyboard.dismiss(); // otherwise the keyboard stays open over the screen behind
    onClose();
  };

  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        setKeyboardHeight(0);
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const handleClose = React.useCallback(() => {
    inputRef.current?.blur();
    Keyboard.dismiss();
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

  const lineCount = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0).length;

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={[styles.backdrop, { paddingBottom: keyboardHeight }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  bounces={false}
                  contentContainerStyle={styles.scrollBody}>
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
                          color={sectionConfig.onGradient}
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
                                <Text style={[styles.dateChipTextActive, { color: sectionConfig.onGradient }]}>{item.label}</Text>
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

                  {/* Priority Selector */}
                  <View style={styles.dateSelectorContainer}>
                    <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                      Priority:
                    </Text>
                    <View style={styles.dateChipsRow}>
                      {PRIORITY_OPTIONS.map((p) => {
                        const isSel = selectedPriority === p.key;
                        return (
                          <TouchableOpacity
                            key={p.key}
                            activeOpacity={0.75}
                            onPress={() => setSelectedPriority(p.key)}
                            style={styles.dateChipTouchable}>
                            <View
                              style={[
                                styles.dateChipInactive,
                                {
                                  backgroundColor: isSel
                                    ? p.key === 'high'
                                      ? '#EF4444'
                                      : p.key === 'medium'
                                      ? '#F59E0B'
                                      : p.key === 'low'
                                      ? '#3B82F6'
                                      : colorScheme === 'dark' ? '#475569' : '#334155'
                                    : theme.inputBg,
                                  borderColor: isSel ? p.color : theme.cardBorder,
                                },
                              ]}>
                              <Text
                                style={[
                                  styles.dateChipTextInactive,
                                  {
                                    color: isSel ? '#FFFFFF' : theme.textSecondary,
                                    fontWeight: isSel ? '800' : '600',
                                  },
                                ]}>
                                {p.label}
                              </Text>
                            </View>
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
                        {showAdvanced ? 'Hide Advanced Options' : '+ Subtasks & Notes'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {showAdvanced && !isBatchMode && (
                    <View style={styles.advancedSection}>
                      {/* Subtasks Builder */}
                      <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
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
                    style={[styles.submitTouchable, { shadowColor: sectionConfig.color }]}>
                    <LinearGradient
                      colors={sectionConfig.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[
                        styles.submitBtnGradient,
                        { opacity: text.trim() ? 1 : 0.45 },
                      ]}>
                      <Text style={[styles.submitBtnText, { color: sectionConfig.onGradient }]}>
                        {lineCount > 1 ? `Add ${lineCount} Tasks` : 'Add Task'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  scrollBody: {
    paddingBottom: 8,
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
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnGradient: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
