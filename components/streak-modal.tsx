import React, { useMemo } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TodoItem } from "@/types/todo";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getTodayKey, addDaysToDateKey, parseDateKey } from "@/utils/date";

interface StreakModalProps {
  visible: boolean;
  streak: number;
  todos: TodoItem[];
  onClose: () => void;
  onOpenAnalytics?: () => void;
}

export const StreakModal: React.FC<StreakModalProps> = ({
  visible,
  streak,
  todos,
  onClose,
  onOpenAnalytics,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 16,
  );
  const todayKey = getTodayKey();

  // Calculate completed dates
  const completedDatesSet = useMemo(() => {
    const set = new Set<string>();
    todos.forEach((t) => {
      if (t.completed && t.date) {
        set.add(t.date);
      }
    });
    return set;
  }, [todos]);

  // Last 7 days consistency array
  const last7Days = useMemo(() => {
    const days: {
      dateKey: string;
      dayLabel: string;
      completed: boolean;
      isToday: boolean;
    }[] = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    for (let i = 6; i >= 0; i--) {
      const dKey = addDaysToDateKey(todayKey, -i);
      const dObj = parseDateKey(dKey);
      const dayName = i === 0 ? "Today" : dayNames[dObj.getDay()];
      days.push({
        dateKey: dKey,
        dayLabel: dayName,
        completed: completedDatesSet.has(dKey),
        isToday: i === 0,
      });
    }
    return days;
  }, [todayKey, completedDatesSet]);

  const hasCompletedToday = completedDatesSet.has(todayKey);

  const streakMilestones = [
    {
      target: 3,
      title: "3-Day Spark",
      emoji: "⚡",
      desc: "Build initial momentum",
    },
    {
      target: 7,
      title: "7-Day Habit",
      emoji: "🔥",
      desc: "1 full week of daily progress",
    },
    {
      target: 14,
      title: "14-Day Inferno",
      emoji: "💥",
      desc: "2 solid weeks of consistency",
    },
    {
      target: 30,
      title: "30-Day Legend",
      emoji: "👑",
      desc: "Unstoppable daily productivity",
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
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
          ]}
        >
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={["#F97316", "#EA580C"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBadge}
            >
              <Text style={styles.headerEmoji}>🔥</Text>
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Daily Streak
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: theme.textSecondary }]}
              >
                Consistency is your superpower
              </Text>
            </View>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}
          >
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Big Glowing Streak Hero Card */}
          <LinearGradient
            colors={
              colorScheme === "dark"
                ? ["#431407", "#290E05"]
                : ["#FFF7ED", "#FFEDD5"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.heroCard,
              { borderColor: colorScheme === "dark" ? "#7C2D12" : "#FDBA74" },
            ]}
          >
            <View style={styles.flameCircle}>
              <Text style={styles.flameBigEmoji}>🔥</Text>
            </View>

            <Text style={[styles.streakNumberText, { color: "#EA580C" }]}>
              {streak} {streak === 1 ? "Day" : "Days"}
            </Text>
            <Text style={[styles.streakHeadline, { color: theme.text }]}>
              {streak > 0
                ? hasCompletedToday
                  ? "Your flame is roaring today! 🏆"
                  : "Complete a task today to keep the flame alive! ⚡"
                : "Complete your first task today to start a streak!"}
            </Text>

            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: hasCompletedToday
                    ? "#10B98120"
                    : "#F9731620",
                  borderColor: hasCompletedToday ? "#10B981" : "#F97316",
                },
              ]}
            >
              <Ionicons
                name={hasCompletedToday ? "checkmark-circle" : "time-outline"}
                size={14}
                color={hasCompletedToday ? "#10B981" : "#F97316"}
              />
              <Text
                style={[
                  styles.statusPillText,
                  { color: hasCompletedToday ? "#10B981" : "#EA580C" },
                ]}
              >
                {hasCompletedToday ? "Today Completed" : "Pending Today"}
              </Text>
            </View>
          </LinearGradient>

          {/* 7-Day Consistency Week Matrix */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                7-Day Consistency Tracker
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
              >
                Past week
              </Text>
            </View>

            <View style={styles.weekGrid}>
              {last7Days.map((day) => (
                <View key={day.dateKey} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayCircle,
                      day.completed
                        ? styles.dayCircleCompleted
                        : [
                            styles.dayCirclePending,
                            {
                              backgroundColor: theme.inputBg,
                              borderColor: theme.cardBorder,
                            },
                          ],
                      day.isToday && { borderWidth: 2, borderColor: "#EA580C" },
                    ]}
                  >
                    {day.completed ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.dayNameText,
                      {
                        color: day.isToday ? "#EA580C" : theme.textSecondary,
                        fontWeight: day.isToday ? "800" : "600",
                      },
                    ]}
                  >
                    {day.dayLabel}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Streak Milestone Trophies */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text, marginBottom: 12 },
              ]}
            >
              Milestone Trophies
            </Text>

            <View style={styles.milestonesList}>
              {streakMilestones.map((m) => {
                const isUnlocked = streak >= m.target;

                return (
                  <View
                    key={m.target}
                    style={[
                      styles.milestoneCard,
                      {
                        backgroundColor: isUnlocked
                          ? colorScheme === "dark"
                            ? "#2A1805"
                            : "#FFFBEB"
                          : theme.inputBg,
                        borderColor: isUnlocked ? "#F59E0B" : theme.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.milestoneLeft}>
                      <Text style={styles.milestoneEmoji}>{m.emoji}</Text>
                      <View>
                        <View style={styles.milestoneTitleRow}>
                          <Text
                            style={[
                              styles.milestoneTitle,
                              { color: theme.text },
                            ]}
                          >
                            {m.title}
                          </Text>
                          {isUnlocked && (
                            <View style={styles.unlockedTag}>
                              <Text style={styles.unlockedTagText}>
                                UNLOCKED
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.milestoneDesc,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {m.desc}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.milestoneProgress,
                        { color: isUnlocked ? "#F59E0B" : theme.textSecondary },
                      ]}
                    >
                      {streak}/{m.target}d
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Full Analytics Button */}
          {onOpenAnalytics && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.selectionAsync();
                }
                onClose();
                setTimeout(onOpenAnalytics, 150);
              }}
              style={styles.analyticsBtn}
            >
              <LinearGradient
                colors={["#3B82F6", "#1D4ED8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.analyticsBtnGradient}
              >
                <Ionicons name="bar-chart" size={16} color="#FFFFFF" />
                <Text style={styles.analyticsBtnText}>
                  View Full Productivity Analytics & Badges
                </Text>
              </LinearGradient>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerEmoji: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
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
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    padding: 24,
    borderRadius: 30,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  flameCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#EA580C20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  flameBigEmoji: {
    fontSize: 34,
  },
  streakNumberText: {
    fontSize: 36,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  streakHeadline: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 280,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  sectionCard: {
    padding: 16,
    borderRadius: 26,
    borderWidth: 1,
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "500",
  },
  weekGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: {
    alignItems: "center",
    gap: 6,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleCompleted: {
    backgroundColor: "#10B981",
  },
  dayCirclePending: {
    borderWidth: 1,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  dayNameText: {
    fontSize: 11,
  },
  milestonesList: {
    gap: 8,
  },
  milestoneCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  milestoneLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  milestoneEmoji: {
    fontSize: 22,
  },
  milestoneTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  unlockedTag: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unlockedTagText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  milestoneDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  milestoneProgress: {
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 8,
  },
  analyticsBtn: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 4,
  },
  analyticsBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 16,
  },
  analyticsBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
