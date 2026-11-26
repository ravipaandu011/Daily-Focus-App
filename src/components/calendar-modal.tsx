import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateKey, parseDateKey, getTodayKey } from '@/utils/date';
import { TODO_CONFIG } from '@/constants/sections';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string;
  /** Dot color per day (`YYYY-MM-DD`) for days that have items; days without an entry get no dot. */
  dotColors: Record<string, string>;
  onSelectDate: (dateKey: string) => void;
  onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  dotColors,
  onSelectDate,
  onClose,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const todayKey = getTodayKey();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => parseDateKey(selectedDate));

  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0 - 11

  const monthName = currentMonthDate.toLocaleString('default', { month: 'long' });

  const handlePrevMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (dayNum: number) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const d = new Date(year, month, dayNum);
    const dKey = formatDateKey(d);
    onSelectDate(dKey);
    onClose();
  };

  // Calendar matrix calculations
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }
  // Pad only to the end of the last week, so every row has 7 cells (keeps columns aligned)
  // without an empty extra row in 4- or 5-week months.
  while (daysArray.length % 7 !== 0) {
    daysArray.push(null);
  }
  // Render one row per week: 7 flex cells per row can never wrap or drift out of their columns.
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < daysArray.length; i += 7) {
    weeks.push(daysArray.slice(i, i + 7));
  }

  const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  React.useEffect(() => {
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
      animationType="fade"
      transparent={true}
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}>
          {/* Calendar Header with Month Navigation */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.navBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="chevron-back" size={18} color={theme.text} />
            </TouchableOpacity>

            <Text style={[styles.monthTitle, { color: theme.text }]}>
              {monthName} {year}
            </Text>

            <TouchableOpacity
              onPress={handleNextMonth}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.navBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Weekday Row */}
          <View style={styles.weekDaysRow}>
            {weekDayLabels.map((wd, idx) => (
              <View key={idx} style={styles.weekDayCell}>
                <Text style={[styles.weekDayText, { color: theme.textSecondary }]}>{wd}</Text>
              </View>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {weeks.map((week, weekIndex) => (
              <View key={`week_${weekIndex}`} style={styles.weekRow}>
                {week.map((dayNum, dayIndex) => {
                  if (dayNum === null) {
                    return <View key={`empty_${dayIndex}`} style={styles.dayCell} />;
                  }

                  const cellDate = new Date(year, month, dayNum);
                  const cellDateKey = formatDateKey(cellDate);
                  const isSelected = cellDateKey === selectedDate;
                  const isToday = cellDateKey === todayKey;
                  const dotColor = dotColors[cellDateKey];

                  return (
                    <TouchableOpacity
                      key={`day_${dayNum}`}
                      activeOpacity={0.7}
                      onPress={() => handleSelectDay(dayNum)}
                      style={styles.dayCell}>
                      {isSelected ? (
                        <LinearGradient
                          colors={TODO_CONFIG.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.selectedDayGradient}>
                          <Text style={[styles.selectedDayText, { color: TODO_CONFIG.onGradient }]}>{dayNum}</Text>
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.normalDayCircle,
                            isToday && {
                              borderColor: TODO_CONFIG.color,
                              borderWidth: 1.5,
                              backgroundColor: theme.inputBg,
                            },
                          ]}>
                          <Text
                            style={[
                              styles.dayText,
                              {
                                color: isToday ? TODO_CONFIG.color : theme.text,
                                fontWeight: isToday ? '700' : '500',
                              },
                            ]}>
                            {dayNum}
                          </Text>
                        </View>
                      )}

                      {/* Activity dot */}
                      {dotColor && !isSelected && (
                        <View style={[styles.activityDot, { backgroundColor: dotColor }]} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>

          {/* Quick Jump Buttons */}
          <View style={styles.footerRow}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                onSelectDate(todayKey);
                onClose();
              }}
              style={[styles.jumpBtn, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.jumpBtnText, { color: TODO_CONFIG.color }]}>Jump to Today</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onClose}
              style={[styles.closeModalBtn, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.closeModalText, { color: theme.textSecondary }]}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28, // Material 3 Rounded Modal
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  // Weekday labels and day cells are both flex: 1 in 7-cell rows, so their columns line up exactly.
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekDayText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'column',
  },
  weekRow: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  normalDayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDayGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TODO_CONFIG.color,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedDayText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  dayText: {
    fontSize: 14,
  },
  activityDot: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  jumpBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeModalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeModalText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
