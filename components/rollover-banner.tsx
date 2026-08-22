import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SectionConfig } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface RolloverBannerProps {
  pendingCount: number;
  sectionConfig: SectionConfig;
  onRollover: () => void;
}

export const RolloverBanner: React.FC<RolloverBannerProps> = ({
  pendingCount,
  sectionConfig,
  onRollover,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  if (pendingCount <= 0) return null;

  const handleRollover = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onRollover();
  };

  return (
    <View
      style={[
        styles.bannerCard,
        {
          backgroundColor: theme.card,
          borderColor: colorScheme === 'dark' ? '#334155' : '#E2E8F0',
        },
      ]}>
      <View style={styles.leftRow}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconCircle}>
          <Ionicons name="repeat" size={16} color="#FFFFFF" />
        </LinearGradient>
        <View style={styles.textContainer}>
          <Text style={[styles.bannerTitle, { color: theme.text }]}>
            {pendingCount} unfinished {pendingCount === 1 ? 'task' : 'tasks'} from past
          </Text>
          <Text style={[styles.bannerSubtitle, { color: theme.textSecondary }]}>
            Carry over to today&apos;s list
          </Text>
        </View>
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Move past tasks to today"
        activeOpacity={0.8}
        onPress={handleRollover}
        style={styles.rolloverTouchable}>
        <LinearGradient
          colors={sectionConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.rolloverBtn}>
          <Text style={styles.rolloverBtnText}>Move to Today</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  rolloverTouchable: {
    marginLeft: 8,
  },
  rolloverBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  rolloverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
