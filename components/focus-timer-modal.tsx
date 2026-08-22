import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
  TextInput,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/types/todo';
import { SECTIONS } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

import { startTimerAlarmLoop, stopTimerAlarmLoop } from '@/utils/audio';

interface FocusTimerModalProps {
  visible: boolean;
  item: TodoItem | null;
  onClose: () => void;
  onCompleteTask: (id: string) => void;
}

const PRESET_DURATIONS = [
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
  { label: '45m', minutes: 45 },
  { label: '60m', minutes: 60 },
];

export const FocusTimerModal: React.FC<FocusTimerModalProps> = ({
  visible,
  item,
  onClose,
  onCompleteTask,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 16
  );

  const [selectedDuration, setSelectedDuration] = useState<number>(25 * 60); // in seconds
  const [timeLeft, setTimeLeft] = useState<number>(25 * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMinutesInput, setCustomMinutesInput] = useState<string>('25');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sectionConfig = item ? SECTIONS[item.section] || SECTIONS.work : SECTIONS.work;

  const handleFinish = useCallback(() => {
    setIsRunning(false);
    setIsFinished(true);
    startTimerAlarmLoop();
  }, []);

  const handleStopAlarm = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    stopTimerAlarmLoop();
  }, []);

  const handleCloseModal = useCallback(() => {
    stopTimerAlarmLoop();
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCloseModal();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleCloseModal]);

  useEffect(() => {
    if (visible) {
      setTimeLeft(selectedDuration);
      setIsRunning(false);
      setIsFinished(false);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setIsRunning(false);
      stopTimerAlarmLoop();
    }
  }, [visible, selectedDuration]);

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            handleFinish();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopTimerAlarmLoop();
    };
  }, [isRunning, handleFinish]);

  const toggleTimer = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopTimerAlarmLoop();
    if (isFinished) {
      setTimeLeft(selectedDuration);
      setIsFinished(false);
      setIsRunning(true);
    } else {
      setIsRunning((prev) => !prev);
    }
  };

  const handleReset = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    stopTimerAlarmLoop();
    setIsRunning(false);
    setIsFinished(false);
    setTimeLeft(selectedDuration);
  };

  const handleChangeDuration = (minutes: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const clamped = Math.max(1, Math.min(180, minutes));
    const secs = clamped * 60;
    setSelectedDuration(secs);
    setTimeLeft(secs);
    setIsRunning(false);
    setIsFinished(false);
    setCustomMinutesInput(String(clamped));
  };

  const handleAdjustCustomMinutes = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const currentMins = Math.floor(selectedDuration / 60);
    handleChangeDuration(currentMins + delta);
  };

  const handleCustomInputSubmit = () => {
    const parsed = parseInt(customMinutesInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 180) {
      handleChangeDuration(parsed);
    } else {
      setCustomMinutesInput(String(Math.floor(selectedDuration / 60)));
    }
  };

  const handleCompleteAndClose = () => {
    stopTimerAlarmLoop();
    if (item) {
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onCompleteTask(item.id);
    }
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const progressPercent = selectedDuration > 0
    ? Math.round(((selectedDuration - timeLeft) / selectedDuration) * 100)
    : 0;

  const currentMinutes = Math.floor(selectedDuration / 60);

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      presentationStyle="pageSheet"
      statusBarTranslucent={true}
      onRequestClose={handleCloseModal}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: topInset + 10 }]}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBadge}>
              <Ionicons name="timer-outline" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Focus Timer</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Deep work session
              </Text>
            </View>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={handleCloseModal}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Active Task Card */}
          {item ? (
            <View
              style={[
                styles.taskPreviewCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}>
              <View style={styles.taskCardHeader}>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: sectionConfig.lightBg },
                  ]}>
                  <Text style={[styles.tagText, { color: sectionConfig.accentColor }]}>
                    {sectionConfig.tabLabel}
                  </Text>
                </View>
                {item.tag && (
                  <View style={[styles.tagBadge, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.tagText, { color: theme.textSecondary }]}>
                      {item.tag}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={[styles.taskTitleText, { color: theme.text }]} numberOfLines={2}>
                {item.text}
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.taskPreviewCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}>
              <Text style={[styles.taskTitleText, { color: theme.text }]}>
                ⚡ Freestyle Deep Work Session
              </Text>
            </View>
          )}

          {/* Duration Selector & Custom Mode Stepper */}
          <View style={styles.durationSection}>
            <View style={styles.durationHeaderRow}>
              <Text style={[styles.durationSectionTitle, { color: theme.textSecondary }]}>
                SESSION DURATION: {currentMinutes} MIN
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                  setIsCustomMode(!isCustomMode);
                }}>
                <Text style={[styles.customToggleText, { color: sectionConfig.color }]}>
                  {isCustomMode ? 'Presets' : 'Custom'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Presets Row */}
            {!isCustomMode ? (
              <View style={styles.presetChipsRow}>
                {PRESET_DURATIONS.map((preset) => {
                  const isSelected = selectedDuration === preset.minutes * 60;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      activeOpacity={0.75}
                      onPress={() => handleChangeDuration(preset.minutes)}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected
                            ? colorScheme === 'dark'
                              ? '#1E3A8A'
                              : '#EFF6FF'
                            : theme.card,
                          borderColor: isSelected ? sectionConfig.color : theme.cardBorder,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color: isSelected ? sectionConfig.color : theme.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              /* Custom Duration Stepper & Input */
              <View
                style={[
                  styles.customStepperContainer,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}>
                <View style={styles.stepperSubRow}>
                  <TouchableOpacity
                    onPress={() => handleAdjustCustomMinutes(-5)}
                    style={[styles.stepperBtn, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.stepperBtnText, { color: theme.text }]}>-5</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustCustomMinutes(-1)}
                    style={[styles.stepperBtn, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.stepperBtnText, { color: theme.text }]}>-1</Text>
                  </TouchableOpacity>

                  <View style={styles.stepperInputWrapper}>
                    <TextInput
                      value={customMinutesInput}
                      onChangeText={(t) => setCustomMinutesInput(t.replace(/[^0-9]/g, ''))}
                      onBlur={handleCustomInputSubmit}
                      onSubmitEditing={handleCustomInputSubmit}
                      keyboardType="numeric"
                      maxLength={3}
                      style={[styles.stepperInput, { color: theme.text }]}
                    />
                    <Text style={[styles.stepperMinUnit, { color: theme.textMuted }]}>min</Text>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleAdjustCustomMinutes(1)}
                    style={[styles.stepperBtn, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.stepperBtnText, { color: theme.text }]}>+1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleAdjustCustomMinutes(5)}
                    style={[styles.stepperBtn, { backgroundColor: theme.inputBg }]}>
                    <Text style={[styles.stepperBtnText, { color: theme.text }]}>+5</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Large Countdown Display */}
          <View style={styles.timerCircleContainer}>
            <View
              style={[
                styles.timerOuterRing,
                {
                  borderColor: isRunning
                    ? sectionConfig.color
                    : colorScheme === 'dark'
                    ? '#334155'
                    : '#E2E8F0',
                  backgroundColor: theme.card,
                },
              ]}>
              <Text
                style={[
                  styles.timerText,
                  { color: isFinished ? '#10B981' : theme.text },
                ]}>
                {formatTime(timeLeft)}
              </Text>
              <Text style={[styles.progressSubtitle, { color: theme.textSecondary }]}>
                {isFinished ? '🎉 Session Complete!' : `${progressPercent}% completed`}
              </Text>
            </View>
          </View>

          {/* Finished State: Stop Alarm & Reset Banner */}
          {isFinished && (
            <View style={styles.alarmActionRow}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleStopAlarm}
                style={styles.stopAlarmBtn}>
                <LinearGradient
                  colors={['#EF4444', '#DC2626']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.stopAlarmGradient}>
                  <Ionicons name="volume-mute" size={20} color="#FFFFFF" />
                  <Text style={styles.stopAlarmText}>🔕 Stop Alarm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Timer Controls: Play/Pause and Reset */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleReset}
              style={[styles.resetBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="refresh" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={toggleTimer}
              style={[styles.playBtnTouchable, { shadowColor: sectionConfig.color }]}>
              <LinearGradient
                colors={sectionConfig.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.playBtnGradient}>
                <Ionicons
                  name={isFinished ? 'refresh' : isRunning ? 'pause' : 'play'}
                  size={28}
                  color="#FFFFFF"
                  style={!isRunning && !isFinished ? { marginLeft: 3 } : undefined}
                />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleFinish}
              style={[styles.resetBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="play-skip-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Complete Task Button */}
          {item && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleCompleteAndClose}
              style={styles.completeActionTouchable}>
              <View
                style={[
                  styles.completeActionBtn,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#064E3B' : '#ECFDF5',
                    borderColor: '#10B981',
                  },
                ]}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <Text style={styles.completeActionText}>Mark Task Completed & Close</Text>
              </View>
            </TouchableOpacity>
          )}
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  taskPreviewCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
    gap: 8,
  },
  taskCardHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitleText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  durationSection: {
    gap: 10,
  },
  durationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  durationSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  customToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetChipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetChipText: {
    fontSize: 13,
  },
  customStepperContainer: {
    padding: 12,
    borderRadius: 24,
    borderWidth: 1,
  },
  stepperSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
  },
  stepperBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepperInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperInput: {
    fontSize: 20,
    fontWeight: '800',
    minWidth: 40,
    textAlign: 'center',
  },
  stepperMinUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  timerCircleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  timerOuterRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  timerText: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  progressSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  alarmActionRow: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stopAlarmBtn: {
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  stopAlarmGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    height: 44,
    gap: 8,
    borderRadius: 22,
  },
  stopAlarmText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  resetBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnTouchable: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 8,
  },
  playBtnGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  completeActionTouchable: {
    marginTop: 4,
  },
  completeActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 9999,
    borderWidth: 1,
  },
  completeActionText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '700',
  },
});
