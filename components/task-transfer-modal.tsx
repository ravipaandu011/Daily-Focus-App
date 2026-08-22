import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { TodoItem, SectionKey } from "@/types/todo";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useCategories } from "@/context/category-context";
import { getTodayKey, getTomorrowKey, addDaysToDateKey } from "@/utils/date";

interface TaskTransferModalProps {
  visible: boolean;
  item: TodoItem | null;
  onClose: () => void;
  onMoveSection: (id: string, newSection: SectionKey) => Promise<void>;
  onDuplicate: (
    id: string,
    targetDate: string,
    targetSection?: SectionKey,
  ) => Promise<void>;
}

export const TaskTransferModal: React.FC<TaskTransferModalProps> = ({
  visible,
  item,
  onClose,
  onMoveSection,
  onDuplicate,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 16,
  );
  const { allCategoryKeys, getCategoryConfig } = useCategories();

  if (!item) return null;

  const sectionKeys = allCategoryKeys;

  const handleMove = async (targetSection: SectionKey) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await onMoveSection(item.id, targetSection);
    onClose();
  };

  const handleDuplicate = async (targetDate: string) => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    await onDuplicate(item.id, targetDate);
    onClose();
  };

  const today = getTodayKey();
  const tomorrow = getTomorrowKey();
  const nextWeek = addDaysToDateKey(today, 7);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { paddingTop: topInset + 10 }]}>
          <View style={styles.headerTitleRow}>
            <LinearGradient
              colors={["#3B82F6", "#8B5CF6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerBadge}
            >
              <Ionicons name="swap-horizontal" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                Move & Duplicate Task
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: theme.textSecondary }]}
              >
                Reorganize your workflow
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

        <View style={styles.content}>
          {/* Task Preview */}
          <View
            style={[
              styles.previewCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
              TASK
            </Text>
            <Text
              style={[styles.previewText, { color: theme.text }]}
              numberOfLines={2}
            >
              {item.text}
            </Text>
          </View>

          {/* Transfer Category Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              🔀 Transfer Category
            </Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Move this task to a different tab:
            </Text>

            <View style={styles.categoriesGrid}>
              {sectionKeys.map((key) => {
                const conf = getCategoryConfig(key);
                const isCurrent = item.section === key;

                return (
                  <TouchableOpacity
                    key={key}
                    disabled={isCurrent}
                    activeOpacity={0.8}
                    onPress={() => handleMove(key as SectionKey)}
                    style={[
                      styles.catBtn,
                      {
                        backgroundColor: isCurrent ? theme.inputBg : theme.card,
                        borderColor: isCurrent ? theme.cardBorder : conf.color,
                        opacity: isCurrent ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.catEmoji}>{conf.emoji}</Text>
                    <Text style={[styles.catName, { color: theme.text }]}>
                      {conf.tabLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Duplicate Task Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              📑 Duplicate Task
            </Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Clone this task to a future date:
            </Text>

            <View style={styles.duplicateRow}>
              {[
                { label: "Today", date: today },
                { label: "Tomorrow", date: tomorrow },
                { label: "Next Week", date: nextWeek },
              ].map((d) => (
                <TouchableOpacity
                  key={d.label}
                  activeOpacity={0.8}
                  onPress={() => handleDuplicate(d.date)}
                  style={[
                    styles.dupBtn,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.cardBorder,
                    },
                  ]}
                >
                  <Ionicons name="copy-outline" size={14} color="#3B82F6" />
                  <Text style={[styles.dupBtnText, { color: theme.text }]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
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
  },
  headerTitleRow: {
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
  content: {
    padding: 16,
    gap: 14,
  },
  previewCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  previewText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 12,
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  catBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  catEmoji: {
    fontSize: 16,
  },
  catName: {
    fontSize: 13,
    fontWeight: "600",
  },
  duplicateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dupBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  dupBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
