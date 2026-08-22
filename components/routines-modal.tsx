import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionKey, RoutineTemplate } from '@/types/todo';
import { SECTIONS } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DEFAULT_ROUTINES,
  loadCustomRoutines,
  saveCustomRoutine,
  deleteCustomRoutine,
} from '@/utils/routines';

interface RoutinesModalProps {
  visible: boolean;
  activeSection: SectionKey;
  onClose: () => void;
  onApplyRoutine: (routine: RoutineTemplate) => Promise<void>;
}

export const RoutinesModal: React.FC<RoutinesModalProps> = ({
  visible,
  activeSection,
  onClose,
  onApplyRoutine,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 16
  );

  const [customRoutines, setCustomRoutines] = useState<RoutineTemplate[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newEmoji, setNewEmoji] = useState<string>('⚡');
  const [newTasksText, setNewTasksText] = useState<string>('');
  const [newSection, setNewSection] = useState<SectionKey>(activeSection);

  useEffect(() => {
    if (visible) {
      (async () => {
        const loaded = await loadCustomRoutines();
        setCustomRoutines(loaded);
      })();
      setIsCreating(false);
      setNewSection(activeSection);
    }
  }, [visible, activeSection]);

  const handleSelect = async (routine: RoutineTemplate) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await onApplyRoutine(routine);
    onClose();
  };

  const handleSaveNewRoutine = async () => {
    const trimmedTitle = newTitle.trim();
    const tasks = newTasksText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (!trimmedTitle || tasks.length === 0) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const newRoutine: RoutineTemplate = {
      id: `custom_${Date.now()}`,
      title: trimmedTitle,
      emoji: newEmoji.trim() || '⚡',
      section: newSection,
      tasks,
      isCustom: true,
    };

    const updated = await saveCustomRoutine(newRoutine);
    setCustomRoutines(updated);
    setIsCreating(false);
    setNewTitle('');
    setNewTasksText('');
  };

  const handleDeleteCustom = async (id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const updated = await deleteCustomRoutine(id);
    setCustomRoutines(updated);
  };

  const allRoutines = [...customRoutines, ...DEFAULT_ROUTINES];
  const sectionKeys: SectionKey[] = ['work', 'education', 'gym', 'home', 'personal'];

  const handleClose = React.useCallback(() => {
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
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
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
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBadge}>
              <Ionicons name="flash" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Routine & Habit Templates
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                1-tap checklist bundles for today
              </Text>
            </View>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Create Custom Routine Button or Form */}
          {!isCreating ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsCreating(true)}
              style={styles.createBtnTouchable}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createBtnGradient}>
                <Ionicons name="add-circle" size={18} color="#FFFFFF" />
                <Text style={styles.createBtnText}>+ Create Custom Routine</Text>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.createFormCard,
                { backgroundColor: theme.card, borderColor: '#3B82F6' },
              ]}>
              <Text style={[styles.createFormTitle, { color: theme.text }]}>
                Create Custom Routine Template
              </Text>

              {/* Title & Emoji */}
              <View style={styles.formRow}>
                <TextInput
                  value={newEmoji}
                  onChangeText={setNewEmoji}
                  placeholder="⚡"
                  style={[
                    styles.emojiInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                  ]}
                />
                <TextInput
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Routine Title (e.g. Morning Protocol)"
                  placeholderTextColor={theme.textMuted}
                  style={[
                    styles.titleInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                  ]}
                />
              </View>

              {/* Section Picker */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Assign to Category:
              </Text>
              <View style={styles.sectionChipsRow}>
                {sectionKeys.map((k) => {
                  const conf = SECTIONS[k];
                  const isSel = newSection === k;
                  return (
                    <TouchableOpacity
                      key={k}
                      activeOpacity={0.75}
                      onPress={() => setNewSection(k)}
                      style={[
                        styles.sectionChip,
                        {
                          backgroundColor: isSel ? conf.color : theme.inputBg,
                          borderColor: isSel ? conf.color : theme.cardBorder,
                        },
                      ]}>
                      <Text style={[styles.sectionChipText, { color: isSel ? '#FFFFFF' : theme.text }]}>
                        {conf.emoji} {conf.tabLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Tasks multiline */}
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Checklist Tasks (one per line):
              </Text>
              <TextInput
                value={newTasksText}
                onChangeText={setNewTasksText}
                placeholder="1. Drink water&#10;2. 15m stretch&#10;3. Plan 3 priorities"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={4}
                style={[
                  styles.multilineInput,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder, color: theme.text },
                ]}
              />

              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  onPress={() => setIsCreating(false)}
                  style={[styles.cancelBtn, { backgroundColor: theme.inputBg }]}>
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!newTitle.trim() || !newTasksText.trim()}
                  onPress={handleSaveNewRoutine}
                  style={[
                    styles.saveBtn,
                    { opacity: newTitle.trim() && newTasksText.trim() ? 1 : 0.5 },
                  ]}>
                  <Text style={styles.saveBtnText}>Save Routine</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* List of Routines */}
          {allRoutines.map((routine) => {
            const sectionConfig = SECTIONS[routine.section] || SECTIONS.work;
            const isCurrentSection = routine.section === activeSection;

            return (
              <View
                key={routine.id}
                style={[
                  styles.routineCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: isCurrentSection
                      ? sectionConfig.color
                      : theme.cardBorder,
                  },
                ]}>
                {/* Routine Card Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.cardTitleGroup}>
                    <LinearGradient
                      colors={sectionConfig.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.routineIconBadge}>
                      <Text style={styles.routineEmoji}>{routine.emoji}</Text>
                    </LinearGradient>
                    <View>
                      <Text style={[styles.routineTitle, { color: theme.text }]}>
                        {routine.title}
                      </Text>
                      <Text
                        style={[
                          styles.routineCategory,
                          { color: sectionConfig.color },
                        ]}>
                        {sectionConfig.tabLabel} • {routine.tasks.length} tasks
                        {routine.isCustom && ' • Custom'}
                      </Text>
                    </View>
                  </View>

                  {routine.isCustom && (
                    <TouchableOpacity
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => handleDeleteCustom(routine.id)}
                      style={[styles.deleteCustomBtn, { backgroundColor: theme.inputBg }]}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Task items preview */}
                <View style={[styles.tasksPreview, { backgroundColor: theme.inputBg }]}>
                  {routine.tasks.map((task, idx) => (
                    <View key={idx} style={styles.taskPreviewRow}>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={14}
                        color={theme.textSecondary}
                      />
                      <Text
                        style={[styles.taskPreviewText, { color: theme.text }]}
                        numberOfLines={1}>
                        {task}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Apply Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => handleSelect(routine)}
                  style={styles.applyBtnTouchable}>
                  <LinearGradient
                    colors={sectionConfig.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.applyBtnGradient}>
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.applyBtnText}>
                      Add to {sectionConfig.tabLabel} Today
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  createBtnTouchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  createFormCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1.5,
    gap: 10,
  },
  createFormTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emojiInput: {
    width: 48,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    textAlign: 'center',
    fontSize: 18,
  },
  titleInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  sectionChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sectionChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  sectionChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  multilineInput: {
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  formBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  routineCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  routineIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineEmoji: {
    fontSize: 20,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  routineCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },
  deleteCustomBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tasksPreview: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    gap: 6,
  },
  taskPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskPreviewText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  applyBtnTouchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  applyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
