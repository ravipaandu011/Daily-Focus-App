import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TodoItem } from '@/types/todo';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { computeAnalytics } from '@/utils/analytics';
import { computeAchievements } from '@/utils/achievements';

interface AnalyticsModalProps {
  visible: boolean;
  todos: TodoItem[];
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  visible,
  todos,
  onClose,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 16
  );

  const [activeTab, setActiveTab] = useState<'insights' | 'badges'>('insights');

  const analytics = useMemo(() => computeAnalytics(todos), [todos]);
  const achievements = useMemo(() => computeAchievements(todos), [todos]);

  const maxBarValue = Math.max(
    ...analytics.weeklyActivity.map((d) => d.completed),
    1
  );

  const unlockedCount = achievements.filter((b) => b.unlocked).length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
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
          <View style={styles.headerTitleContainer}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconBadge}>
              <Ionicons name="bar-chart" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Productivity & Gamification
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Insights, activity & achievement trophies
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close analytics"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Tab Switcher: Insights vs Badges */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('insights')}
            style={styles.tabBtn}>
            {activeTab === 'insights' ? (
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabActive}>
                <Ionicons name="stats-chart" size={14} color="#FFFFFF" />
                <Text style={styles.tabTextActive}>Insights & Trends</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.tabInactive, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Ionicons name="stats-chart-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.tabTextInactive, { color: theme.textSecondary }]}>
                  Insights & Trends
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab('badges')}
            style={styles.tabBtn}>
            {activeTab === 'badges' ? (
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tabActive}>
                <Ionicons name="trophy" size={14} color="#FFFFFF" />
                <Text style={styles.tabTextActive}>
                  Badges ({unlockedCount}/{achievements.length})
                </Text>
              </LinearGradient>
            ) : (
              <View style={[styles.tabInactive, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                <Ionicons name="trophy-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.tabTextInactive, { color: theme.textSecondary }]}>
                  Badges ({unlockedCount}/{achievements.length})
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {activeTab === 'insights' ? (
            <>
              {/* Top Quick Stats Grid */}
              <View style={styles.statsGrid}>
                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}>
                  <Text style={[styles.statValue, { color: '#3B82F6' }]}>
                    {analytics.completedTasks}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Completed
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}>
                  <Text style={[styles.statValue, { color: '#10B981' }]}>
                    {analytics.completionRate}%
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Completion Rate
                  </Text>
                </View>

                <View
                  style={[
                    styles.statCard,
                    { backgroundColor: theme.card, borderColor: theme.cardBorder },
                  ]}>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>
                    {analytics.currentStreak}d 🔥
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Daily Streak
                  </Text>
                </View>
              </View>

              {/* 7-Day Activity Bar Chart */}
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    7-Day Activity
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    Tasks completed
                  </Text>
                </View>

                <View style={styles.chartRow}>
                  {analytics.weeklyActivity.map((day) => {
                    const heightPercent = Math.max(
                      (day.completed / maxBarValue) * 100,
                      6
                    );

                    return (
                      <View key={day.dateKey} style={styles.barCol}>
                        <Text style={[styles.barValueText, { color: theme.textSecondary }]}>
                          {day.completed}
                        </Text>

                        <View style={[styles.barTrack, { backgroundColor: theme.inputBg }]}>
                          <LinearGradient
                            colors={
                              day.completed > 0
                                ? ['#3B82F6', '#60A5FA']
                                : ['transparent', 'transparent']
                            }
                            start={{ x: 0, y: 1 }}
                            end={{ x: 0, y: 0 }}
                            style={[
                              styles.barFill,
                              { height: `${heightPercent}%` },
                            ]}
                          />
                        </View>

                        <Text
                          style={[
                            styles.dayLabelText,
                            {
                              color:
                                day.dayLabel === 'Today'
                                  ? '#3B82F6'
                                  : theme.textSecondary,
                              fontWeight: day.dayLabel === 'Today' ? '700' : '500',
                            },
                          ]}>
                          {day.dayLabel}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Category Breakdown */}
              <View
                style={[
                  styles.sectionCard,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    Category Distribution
                  </Text>
                  <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    Top: {analytics.mostProductiveCategory}
                  </Text>
                </View>

                <View style={styles.categoryList}>
                  {analytics.categoryBreakdown.map((cat) => (
                    <View key={cat.sectionKey} style={styles.catRow}>
                      <View style={styles.catLabelRow}>
                        <Text style={[styles.catName, { color: theme.text }]}>
                          {cat.emoji} {cat.title}
                        </Text>
                        <Text style={[styles.catCountText, { color: theme.textSecondary }]}>
                          {cat.completedCount} / {cat.totalCount} completed ({cat.percentage}%)
                        </Text>
                      </View>

                      {/* Progress bar */}
                      <View style={[styles.catTrack, { backgroundColor: theme.inputBg }]}>
                        <LinearGradient
                          colors={cat.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={[
                            styles.catFill,
                            { width: `${Math.max(cat.percentage, 0)}%` },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          ) : (
            /* Badges & Achievements Tab */
            <View style={styles.badgesList}>
              {achievements.map((badge) => {
                const percent = Math.round((badge.progress / badge.maxProgress) * 100);

                return (
                  <View
                    key={badge.id}
                    style={[
                      styles.badgeCard,
                      {
                        backgroundColor: theme.card,
                        borderColor: badge.unlocked ? '#F59E0B' : theme.cardBorder,
                      },
                    ]}>
                    <View style={styles.badgeLeftRow}>
                      <LinearGradient
                        colors={
                          badge.unlocked
                            ? ['#F59E0B', '#D97706']
                            : ['#64748B', '#475569']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badgeIconSquare}>
                        <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                      </LinearGradient>

                      <View style={styles.badgeTextGroup}>
                        <View style={styles.badgeTitleRow}>
                          <Text style={[styles.badgeTitle, { color: theme.text }]}>
                            {badge.title}
                          </Text>
                          {badge.unlocked && (
                            <View style={styles.unlockedTag}>
                              <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                              <Text style={styles.unlockedTagText}>UNLOCKED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.badgeDesc, { color: theme.textSecondary }]}>
                          {badge.description}
                        </Text>

                        {/* Progress Bar */}
                        <View style={styles.badgeProgressContainer}>
                          <View style={[styles.badgeTrack, { backgroundColor: theme.inputBg }]}>
                            <View
                              style={[
                                styles.badgeFill,
                                {
                                  width: `${Math.min(percent, 100)}%`,
                                  backgroundColor: badge.unlocked ? '#F59E0B' : '#64748B',
                                },
                              ]}
                            />
                          </View>
                          <Text style={[styles.badgeProgressText, { color: theme.textSecondary }]}>
                            {badge.progress}/{badge.maxProgress}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  modalSubtitle: {
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
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  tabBtn: {
    flex: 1,
  },
  tabActive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabInactive: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tabTextInactive: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionCard: {
    padding: 16,
    borderRadius: 26,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 10,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barValueText: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  barTrack: {
    width: 22,
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  barFill: {
    width: '100%',
    borderRadius: 10,
  },
  dayLabelText: {
    fontSize: 11,
  },
  categoryList: {
    gap: 14,
  },
  catRow: {
    gap: 6,
  },
  catLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  catCountText: {
    fontSize: 12,
    fontWeight: '500',
  },
  catTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  catFill: {
    height: '100%',
    borderRadius: 4,
  },
  badgesList: {
    gap: 12,
  },
  badgeCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  badgeLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badgeIconSquare: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 22,
  },
  badgeTextGroup: {
    flex: 1,
  },
  badgeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  badgeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  unlockedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  badgeDesc: {
    fontSize: 12,
    marginBottom: 8,
  },
  badgeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  badgeFill: {
    height: '100%',
    borderRadius: 3,
  },
  badgeProgressText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
