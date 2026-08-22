import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  getTodayKey,
  getYesterdayKey,
  getTomorrowKey,
  addDaysToDateKey,
  formatDateForDisplay,
} from '@/utils/date';

interface DateNavigatorProps {
  selectedDate: string;
  sectionConfig: SectionConfig;
  onSelectDate: (dateKey: string) => void;
  onOpenCalendar?: () => void;
}

const DateNavigatorComponent: React.FC<DateNavigatorProps> = ({
  selectedDate,
  sectionConfig,
  onSelectDate,
  onOpenCalendar,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const tomorrow = getTomorrowKey();

  const handlePrevDay = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const prev = addDaysToDateKey(selectedDate, -1);
    onSelectDate(prev);
  };

  const handleNextDay = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const next = addDaysToDateKey(selectedDate, 1);
    onSelectDate(next);
  };

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelectDate(key);
  };

  const handleTitlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (onOpenCalendar) {
      onOpenCalendar();
    } else {
      onSelectDate(today);
    }
  };

  const isYesterday = selectedDate === yesterday;
  const isToday = selectedDate === today;
  const isTomorrow = selectedDate === tomorrow;

  return (
    <View style={styles.container}>
      {/* Date Header Card with Prev / Next Navigation & Calendar Trigger */}
      <View
        style={[
          styles.dateHeaderRow,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Previous day"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          onPress={handlePrevDay}
          style={[styles.stepBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="chevron-back" size={16} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleTitlePress}
          style={styles.dateTitleContainer}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={sectionConfig.color}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.dateTitleText, { color: theme.text }]}>
            {formatDateForDisplay(selectedDate)}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={theme.textSecondary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Next day"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
          onPress={handleNextDay}
          style={[styles.stepBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="chevron-forward" size={16} color={theme.text} />
        </TouchableOpacity>
      </View>

      {/* Quick Day Chips: Yesterday | Today | Tomorrow */}
      <View style={styles.chipsRow}>
        {/* Yesterday */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect(yesterday)}
          style={styles.chipTouchable}>
          {isYesterday ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipGradient}>
              <Text style={styles.chipTextActive}>Yesterday</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <Text style={[styles.chipTextInactive, { color: theme.textSecondary }]}>
                Yesterday
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Today */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect(today)}
          style={styles.chipTouchable}>
          {isToday ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipGradient}>
              <Text style={styles.chipTextActive}>Today</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <Text style={[styles.chipTextInactive, { color: theme.textSecondary }]}>
                Today
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tomorrow */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelect(tomorrow)}
          style={styles.chipTouchable}>
          {isTomorrow ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipGradient}>
              <Text style={styles.chipTextActive}>Tomorrow</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <Text style={[styles.chipTextInactive, { color: theme.textSecondary }]}>
                Tomorrow
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 10,
  },
  dateTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateTitleText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chipTouchable: {
    flex: 1,
  },
  chipGradient: {
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
  chipInactive: {
    paddingVertical: 10,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextInactive: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export const DateNavigator = React.memo(DateNavigatorComponent, (prev, next) => {
  return (
    prev.selectedDate === next.selectedDate &&
    prev.sectionConfig.color === next.sectionConfig.color &&
    prev.sectionConfig.key === next.sectionConfig.key
  );
});

