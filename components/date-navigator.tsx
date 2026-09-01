import React, { useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  useWindowDimensions,
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

const CHIP_SIZE = 44;
const CHIP_GAP = 6;

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
  const { width: screenWidth } = useWindowDimensions();

  const today = getTodayKey();
  const monthYearLabel = useMemo(() => formatMonthYear(selectedDate), [selectedDate]);

  // Generate a window of 22 surrounding days centered around today/selectedDate
  const dateKeys = useMemo(() => {
    return getSurroundingDateKeys(today, 7, 14);
  }, [today]);

  // Auto-scroll to center the selected date precisely on load and selection change
  useEffect(() => {
    const selectedIndex = dateKeys.indexOf(selectedDate);
    if (selectedIndex >= 0 && scrollViewRef.current) {
      const cardWidth = screenWidth - 32;
      const itemOffset = selectedIndex * (CHIP_SIZE + CHIP_GAP) + 16;
      const scrollX = Math.max(0, itemOffset - cardWidth / 2 + CHIP_SIZE / 2);
      scrollViewRef.current.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedDate, dateKeys, screenWidth]);

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
    <View style={styles.container}>
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
            size={12}
            color={theme.textSecondary}
            style={{ marginLeft: 3 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Open monthly calendar"
          activeOpacity={0.75}
          onPress={handleCalendarPress}
          style={[styles.calendarIconBtn, { backgroundColor: isDark ? 'rgba(51, 65, 85, 0.5)' : 'rgba(241, 245, 249, 0.9)' }]}>
          <Ionicons name="calendar-outline" size={13} color={sectionConfig.color} />
        </TouchableOpacity>
      </View>

      {/* Horizontal Date Ribbon - Perfect Circles */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.ribbonScroll}
        keyboardShouldPersistTaps="handled">
        {dateKeys.map((dateKey) => {
          const isSelected = dateKey === selectedDate;
          const isToday = dateKey === today;
          const { weekday, dayNumber } = getDateParts(dateKey);

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
                </LinearGradient>
              ) : (
                <View
                  style={[
                    styles.dateChipInactive,
                    {
                      backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                      borderColor: isToday ? sectionConfig.color : (isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)'),
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
  container: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingTop: 2,
    paddingBottom: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: 6,
  },
  monthSelectorTouch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  monthYearTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  calendarIconBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ribbonScroll: {
    paddingHorizontal: 2,
    gap: CHIP_GAP,
    alignItems: 'center',
    paddingBottom: 2,
  },
  dateChipWrapper: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipActive: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  dateChipInactive: {
    width: CHIP_SIZE,
    height: CHIP_SIZE,
    borderRadius: CHIP_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  weekdayTextActive: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 0.5,
  },
  dayNumberActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
    lineHeight: 16,
  },
  weekdayTextInactive: {
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
    marginBottom: 0.5,
  },
  dayNumberInactive: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    lineHeight: 16,
  },
});

export const DateNavigator = React.memo(DateNavigatorComponent, (prev, next) => {
  return (
    prev.selectedDate === next.selectedDate &&
    prev.sectionConfig.color === next.sectionConfig.color &&
    prev.sectionConfig.key === next.sectionConfig.key
  );
});
