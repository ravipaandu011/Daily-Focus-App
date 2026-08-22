import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { TodoItem } from '@/types/todo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { formatDateKey, parseDateKey, getTodayKey } from '@/utils/date';

interface CalendarModalProps {
  visible: boolean;
  selectedDate: string;
  todos: TodoItem[];
  onSelectDate: (dateKey: string) => void;
  onClose: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  selectedDate,
  todos,
  onSelectDate,
  onClose,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const todayKey = getTodayKey();

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => parseDateKey(selectedDate));

  // Compute tasks per date for activity dots
  const taskDatesMap = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    todos.forEach((t) => {
      if (!map[t.date]) {
        map[t.date] = { total: 0, completed: 0 };
      }
      map[t.date].total++;
      if (t.completed) map[t.date].completed++;
    });
    return map;
  }, [todos]);

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

  const weekDayLabels = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
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
              <Text key={idx} style={[styles.weekDayText, { color: theme.textSecondary }]}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Days Grid */}
          <View style={styles.daysGrid}>
            {daysArray.map((dayNum, index) => {
              if (dayNum === null) {
                return <View key={`empty_${index}`} style={styles.dayCell} />;
              }

              const cellDate = new Date(year, month, dayNum);
              const cellDateKey = formatDateKey(cellDate);
              const isSelected = cellDateKey === selectedDate;
              const isToday = cellDateKey === todayKey;
              const stats = taskDatesMap[cellDateKey];

              return (
                <TouchableOpacity
                  key={`day_${dayNum}`}
                  activeOpacity={0.7}
                  onPress={() => handleSelectDay(dayNum)}
                  style={styles.dayCell}>
                  {isSelected ? (
                    <LinearGradient
                      colors={['#3B82F6', '#1D4ED8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.selectedDayGradient}>
                      <Text style={styles.selectedDayText}>{dayNum}</Text>
                    </LinearGradient>
                  ) : (
                    <View
                      style={[
                        styles.normalDayCircle,
                        isToday && {
                          borderColor: '#3B82F6',
                          borderWidth: 1.5,
                          backgroundColor: theme.inputBg,
                        },
                      ]}>
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: isToday ? '#3B82F6' : theme.text,
                            fontWeight: isToday ? '700' : '500',
                          },
                        ]}>
                        {dayNum}
                      </Text>
                    </View>
                  )}

                  {/* Task activity dot */}
                  {stats && stats.total > 0 && !isSelected && (
                    <View
                      style={[
                        styles.activityDot,
                        {
                          backgroundColor:
                            stats.completed === stats.total ? '#10B981' : '#3B82F6',
                        },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
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
              <Text style={[styles.jumpBtnText, { color: '#3B82F6' }]}>Jump to Today</Text>
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
  weekDaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    width: 40,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  dayCell: {
    width: '14.28%',
    height: 44,
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
    shadowColor: '#3B82F6',
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
    bottom: 2,
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
