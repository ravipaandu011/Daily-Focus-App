import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TimePickerModalProps {
  visible: boolean;
  title: string;
  initialTime: string; // 'HH:MM' 24-hour format
  presets?: { label: string; time: string }[];
  onClose: () => void;
  onSave: (time: string) => void;
}

export const TimePickerModal: React.FC<TimePickerModalProps> = ({
  visible,
  title,
  initialTime,
  presets = [],
  onClose,
  onSave,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const parseInitial = (tStr: string) => {
    const parts = (tStr || '09:00').split(':');
    let h = parseInt(parts[0], 10) || 9;
    const m = parseInt(parts[1], 10) || 0;
    const isPM = h >= 12;
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return { hour12: h12, minute: m, isPM };
  };

  const [hour12, setHour12] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [isPM, setIsPM] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      const parsed = parseInitial(initialTime);
      setHour12(parsed.hour12);
      setMinute(parsed.minute);
      setIsPM(parsed.isPM);
    }
  }, [visible, initialTime]);

  const handleAdjustHour = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setHour12((prev) => {
      let next = prev + delta;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      return next;
    });
  };

  const handleAdjustMinute = (delta: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setMinute((prev) => {
      let next = prev + delta;
      if (next >= 60) next = 0;
      if (next < 0) next = 55;
      return next;
    });
  };

  const handleToggleAMPM = (pm: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setIsPM(pm);
  };

  const handleSelectPreset = (presetTime: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const parsed = parseInitial(presetTime);
    setHour12(parsed.hour12);
    setMinute(parsed.minute);
    setIsPM(parsed.isPM);
  };

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const handleSave = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    let h24 = hour12 % 12;
    if (isPM) h24 += 12;
    const hStr = h24 < 10 ? `0${h24}` : `${h24}`;
    const mStr = minute < 10 ? `0${minute}` : `${minute}`;
    const formatted = `${hStr}:${mStr}`;
    onSave(formatted);
    handleClose();
  };

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <View
              style={[
                styles.dialogCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={styles.headerIconCircle}>
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                  <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                    Choose exact reminder time
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={onClose}
                  style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
                  <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Digital Clock Box */}
              <View style={[styles.clockDisplayBox, { backgroundColor: theme.inputBg, borderColor: '#8B5CF6' }]}>
                {/* Hour Column */}
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAdjustHour(1)}
                    style={styles.stepBtn}>
                    <Ionicons name="chevron-up" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <Text style={[styles.digitText, { color: theme.text }]}>
                    {hour12 < 10 ? `0${hour12}` : hour12}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAdjustHour(-1)}
                    style={styles.stepBtn}>
                    <Ionicons name="chevron-down" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {/* Colon Separator */}
                <Text style={[styles.colonText, { color: theme.textSecondary }]}>:</Text>

                {/* Minute Column */}
                <View style={styles.timeColumn}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAdjustMinute(5)}
                    style={styles.stepBtn}>
                    <Ionicons name="chevron-up" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <Text style={[styles.digitText, { color: theme.text }]}>
                    {minute < 10 ? `0${minute}` : minute}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleAdjustMinute(-5)}
                    style={styles.stepBtn}>
                    <Ionicons name="chevron-down" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                </View>

                {/* AM / PM Switcher */}
                <View style={styles.amPmColumn}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleToggleAMPM(false)}
                    style={[
                      styles.amPmBtn,
                      !isPM && styles.amPmBtnActive,
                      { borderColor: !isPM ? '#8B5CF6' : theme.cardBorder },
                    ]}>
                    <Text style={[styles.amPmText, { color: !isPM ? '#FFFFFF' : theme.textSecondary }]}>
                      AM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleToggleAMPM(true)}
                    style={[
                      styles.amPmBtn,
                      isPM && styles.amPmBtnActive,
                      { borderColor: isPM ? '#8B5CF6' : theme.cardBorder },
                    ]}>
                    <Text style={[styles.amPmText, { color: isPM ? '#FFFFFF' : theme.textSecondary }]}>
                      PM
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Presets */}
              {presets.length > 0 && (
                <View style={styles.presetsSection}>
                  <Text style={[styles.presetLabel, { color: theme.textSecondary }]}>
                    Quick Presets
                  </Text>
                  <View style={styles.presetsRow}>
                    {presets.map((preset) => (
                      <TouchableOpacity
                        key={preset.time}
                        activeOpacity={0.75}
                        onPress={() => handleSelectPreset(preset.time)}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.cardBorder,
                          },
                        ]}>
                        <Text style={[styles.presetChipText, { color: theme.text }]}>
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={onClose}
                  style={[
                    styles.cancelBtn,
                    { backgroundColor: theme.inputBg, borderColor: theme.cardBorder },
                  ]}>
                  <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleSave}
                  style={styles.saveBtnTouchable}>
                  <LinearGradient
                    colors={['#8B5CF6', '#6D28D9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.saveBtnGradient}>
                    <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Time</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
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
  clockDisplayBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    marginBottom: 18,
    gap: 12,
  },
  timeColumn: {
    alignItems: 'center',
    gap: 4,
  },
  stepBtn: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitText: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 1,
    minWidth: 50,
    textAlign: 'center',
  },
  colonText: {
    fontSize: 30,
    fontWeight: '800',
    marginHorizontal: 2,
    marginBottom: 4,
  },
  amPmColumn: {
    gap: 8,
    marginLeft: 8,
  },
  amPmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  amPmBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  amPmText: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetsSection: {
    marginBottom: 20,
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtnTouchable: {
    flex: 1.4,
    height: 46,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
