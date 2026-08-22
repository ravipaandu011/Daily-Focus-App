import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
  formatMonthYear,
  getDateParts,
  getSurroundingDateKeys,
} from '@/utils/date';

interface DateNavigatorProps {
  selectedDate: string;
  sectionConfig: SectionConfig;
  onSelectDate: (dateKey: string) => void;
  onOpenCalendar?: () => void;
}

const CHIP_WIDTH = 48;
const CHIP_GAP = 7;

const DateNavigatorComponent: React.FC<DateNavigatorProps> = ({
  selectedDate,
  sectionConfig,
  onSelectDate,
  onOpenCalendar,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);

  const today = getTodayKey();
  const monthYearLabel = useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  // Generate a window of 22 surrounding days centered around today/selectedDate
  const dateKeys = useMemo(() => {
    return getSurroundingDateKeys(today, 7, 14);
  }, [today]);

  // Auto-scroll to center the selected date on load and when selectedDate changes
  useEffect(() => {
    const selectedIndex = dateKeys.indexOf(selectedDate);
    if (selectedIndex >= 0 && scrollViewRef.current) {
      const scrollX = Math.max(0, selectedIndex * (CHIP_WIDTH + CHIP_GAP) - (CHIP_WIDTH * 2));
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedDate, dateKeys]);

  const handleSelect = (key: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onSelectDate(key);
  };

  const handleCalendarPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onOpenCalendar?.();
  };

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.cardBorder,
        },
      ]}>
      {/* Month & Year Header + Calendar Trigger */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCalendarPress}
          style={styles.monthSelectorTouch}>
          <Text style={[styles.monthYearTitle, { color: theme.text }]}>
            {monthYearLabel}
          </Text>
          <Ionicons
            name="chevron-down"
            size={14}
            color={theme.textSecondary}
            style={{ marginLeft: 4 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open monthly calendar"
          activeOpacity={0.75}
          onPress={handleCalendarPress}
          style={[styles.calendarIconBtn, { backgroundColor: theme.inputBg }]}>
          <Ionicons name="calendar-outline" size={17} color={sectionConfig.color} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Date Ribbon */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ribbonScroll}
        keyboardShouldPersistTaps="handled">
        {dateKeys.map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === today;
          const { weekday, dayNumber, month } = getDateParts(dateKey);

          return (
            <TouchableOpacity
              key={dateKey}
              activeOpacity={0.8}
              onPress={() => handleSelect(dateKey)}
              style={styles.dateChipWrapper}>
              {isSelected ? (
                <LinearGradient
                  colors={sectionConfig.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.dateChipActive,
                    {
                      shadowColor: sectionConfig.color,
                    },
                  ]}>
                  <Text style={styles.weekdayTextActive}>
                    {isToday ? 'Today' : weekday}
                  </Text>
                  <Text style={styles.dayNumberActive}>{dayNumber}</Text>
                  <Text style={styles.monthTextActive}>{month}</Text>
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.dateChipInactive,
                    {
                      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : '#F8FAFC',
                      borderColor: isToday ? sectionConfig.color : theme.cardBorder,
                      borderWidth: isToday ? 1.5 : 1,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.weekdayTextInactive,
                      { color: isToday ? sectionConfig.color : theme.textSecondary },
                    ]}>
                    {isToday ? 'Today' : weekday}
                  </Text>
                  <Text style={[styles.dayNumberInactive, { color: theme.text }]}>
                    {dayNumber}
                  </Text>
                  <Text style={[styles.monthTextInactive, { color: theme.textMuted }]}>
                    {month}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    marginHorizontal: 16,
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  monthSelectorTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthYearTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  calendarIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonScroll: {
    paddingHorizontal: 10,
    gap: CHIP_GAP,
    alignItems: 'center',
  },
  dateChipWrapper: {
    width: CHIP_WIDTH,
  },
  dateChipActive: {
    width: CHIP_WIDTH,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  dateChipInactive: {
    width: CHIP_WIDTH,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
  },
  weekdayTextActive: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 9.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  dayNumberActive: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  monthTextActive: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
  weekdayTextInactive: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 1,
  },
  dayNumberInactive: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  monthTextInactive: {
    fontSize: 9.5,
    fontWeight: '500',
    marginTop: 1,
  },
});

export const DateNavigator = React.memo(DateNavigatorComponent, (prev, next) => {
  return (
    prev.selectedDate === next.selectedDate &&
    prev.sectionConfig.color === next.sectionConfig.color &&
    prev.sectionConfig.key === next.sectionConfig.key
  );
});

