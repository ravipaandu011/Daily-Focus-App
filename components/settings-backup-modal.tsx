import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Platform,
  StatusBar,
  Share,
  Switch,
  BackHandler,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { TodoItem } from "@/types/todo";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAppTheme, ThemeMode } from "@/context/theme-context";
import { generateBackupJson, parseAndValidateBackup } from "@/utils/backup";
import {
  getReminderSettings,
  setDailyReminder,
  formatTime12Hour,
  sendTestNotification,
} from "@/utils/notifications";
import { useAuth } from "@/context/auth-context";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TimePickerModal } from "@/components/time-picker-modal";

interface SettingsBackupModalProps {
  visible: boolean;
  todos: TodoItem[];
  binTodos: TodoItem[];
  selectedDate?: string;
  onClose: () => void;
  onImportBackup: (todos: TodoItem[], binTodos: TodoItem[]) => Promise<void>;
  onOpenAuth?: () => void;
  onOpenBin?: () => void;
}

export const SettingsBackupModal: React.FC<SettingsBackupModalProps> = ({
  visible,
  todos,
  binTodos,
  onClose,
  onImportBackup,
  onOpenAuth,
  onOpenBin,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 16,
  );
  const { themeMode, setThemeMode } = useAppTheme();
  const { user, signOut, promptAuthModal } = useAuth();

  const [copiedBackup, setCopiedBackup] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [restoreConfirmVisible, setRestoreConfirmVisible] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<{
    todos: TodoItem[];
    binTodos: TodoItem[];
  } | null>(null);

  const [morningReminder, setMorningReminder] = useState(false);
  const [morningTime, setMorningTime] = useState("09:00");
  const [eveningReminder, setEveningReminder] = useState(false);
  const [eveningTime, setEveningTime] = useState("20:00");

  const [timePickerConfig, setTimePickerConfig] = useState<{
    visible: boolean;
    type: "morning" | "evening";
    title: string;
    initialTime: string;
    presets: { label: string; time: string }[];
  }>({
    visible: false,
    type: "morning",
    title: "Morning Reminder Time",
    initialTime: "09:00",
    presets: [],
  });

  const [testNotifSending, setTestNotifSending] = useState(false);
  const [testNotifStatus, setTestNotifStatus] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      (async () => {
        const settings = await getReminderSettings();
        setMorningReminder(settings.morning);
        setMorningTime(settings.morningTime);
        setEveningReminder(settings.evening);
        setEveningTime(settings.eveningTime);
      })();
    }
  }, [visible]);

  const handleToggleMorning = async (val: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setMorningReminder(val);
    await setDailyReminder("morning", val, morningTime);
  };

  const handleToggleEvening = async (val: boolean) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setEveningReminder(val);
    await setDailyReminder("evening", val, eveningTime);
  };

  const handleOpenMorningTimePicker = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setTimePickerConfig({
      visible: true,
      type: "morning",
      title: "Morning Focus Reminder",
      initialTime: morningTime,
      presets: [
        { label: "6:30 AM", time: "06:30" },
        { label: "7:00 AM", time: "07:00" },
        { label: "8:00 AM", time: "08:00" },
        { label: "8:30 AM", time: "08:30" },
        { label: "9:00 AM", time: "09:00" },
        { label: "9:30 AM", time: "09:30" },
      ],
    });
  };

  const handleOpenEveningTimePicker = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setTimePickerConfig({
      visible: true,
      type: "evening",
      title: "Evening Recap Reminder",
      initialTime: eveningTime,
      presets: [
        { label: "6:00 PM", time: "18:00" },
        { label: "7:00 PM", time: "19:00" },
        { label: "8:00 PM", time: "20:00" },
        { label: "8:30 PM", time: "20:30" },
        { label: "9:00 PM", time: "21:00" },
        { label: "10:00 PM", time: "22:00" },
      ],
    });
  };

  const handleSaveReminderTime = async (newTime: string) => {
    if (timePickerConfig.type === "morning") {
      setMorningTime(newTime);
      if (morningReminder) {
        await setDailyReminder("morning", true, newTime);
      }
    } else {
      setEveningTime(newTime);
      if (eveningReminder) {
        await setDailyReminder("evening", true, newTime);
      }
    }
  };

  const handleSendTestNotification = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setTestNotifSending(true);
    setTestNotifStatus(null);
    const success = await sendTestNotification();
    setTestNotifSending(false);
    if (success) {
      setTestNotifStatus("Notification sent! Check your notification tray 📲");
      setTimeout(() => setTestNotifStatus(null), 4500);
    } else {
      setTestNotifStatus("Permission required: Please enable notifications in device settings.");
      setTimeout(() => setTestNotifStatus(null), 5000);
    }
  };

  const backupJson = generateBackupJson(todos, binTodos);

  const handleSetTheme = async (mode: ThemeMode) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    await setThemeMode(mode);
  };

  const handleExportBackup = async () => {
    await Clipboard.setStringAsync(backupJson);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setCopiedBackup(true);
    setTimeout(() => setCopiedBackup(false), 2500);

    try {
      await Share.share({
        message: backupJson,
        title: "Personal Todo Backup JSON",
      });
    } catch (e) {
      console.error("Failed to share backup", e);
    }
  };

  const handleOpenImport = () => {
    setImportJsonText("");
    setImportError(null);
    setImportModalVisible(true);
  };

  const handleConfirmImport = async () => {
    setImportError(null);
    const result = parseAndValidateBackup(importJsonText);

    if (!result.success) {
      setImportError(result.error);
      return;
    }

    const { todos: newTodos, binTodos: newBin } = result.data;
    setPendingRestoreData({ todos: newTodos, binTodos: newBin });
    setRestoreConfirmVisible(true);
  };

  const executeRestore = async () => {
    if (!pendingRestoreData) return;
    const { todos: newTodos, binTodos: newBin } = pendingRestoreData;
    await onImportBackup(newTodos, newBin);
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setRestoreConfirmVisible(false);
    setPendingRestoreData(null);
    setImportModalVisible(false);
    onClose();
  };

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (importModalVisible) {
        setImportModalVisible(false);
        return true;
      }
      handleClose();
      return true;
    });
    return () => backSub.remove();
  }, [visible, importModalVisible, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'ios' ? 'slide' : 'fade'}
      presentationStyle="pageSheet"
      statusBarTranslucent={true}
      onRequestClose={handleClose}
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
          <View style={styles.headerTitleContainer}>
            <LinearGradient
              colors={["#8B5CF6", "#6D28D9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconBadge}
            >
              <Ionicons name="settings-sharp" size={18} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Settings & Hub
              </Text>
              <Text
                style={[styles.modalSubtitle, { color: theme.textSecondary }]}
              >
                Theme, Notifications & Backups
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close settings"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
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
          {/* Cloud Account & Realtime Sync Section */}
          <View
            style={[
              styles.sectionCard,
              {
                backgroundColor: theme.card,
                borderColor: user ? "#3B82F6" : theme.cardBorder,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name={user ? "cloud-done-outline" : "cloud-outline"}
                  size={18}
                  color={user ? "#3B82F6" : theme.textSecondary}
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Cloud Sync & Account
                </Text>
              </View>
              {user && (
                <View style={styles.syncedBadge}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.syncedBadgeText}>LIVE</Text>
                </View>
              )}
            </View>

            {user ? (
              <View style={styles.accountInfoCol}>
                <Text
                  style={[styles.accountEmailText, { color: theme.text }]}
                  numberOfLines={1}
                >
                  {user.email}
                </Text>
                <Text
                  style={[
                    styles.accountSubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  Supabase PostgreSQL Realtime Sync Active
                </Text>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                    onClose();
                    await signOut();
                  }}
                  style={[
                    styles.signOutBtn,
                    { backgroundColor: theme.inputBg },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={15} color="#EF4444" />
                  <Text style={styles.signOutBtnText}>
                    Sign Out & Lock Data
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.accountInfoCol}>
                <Text
                  style={[
                    styles.accountSubtext,
                    { color: theme.textSecondary },
                  ]}
                >
                  You are currently in Offline Mode. Sign in to enable
                  multi-device sync and automatic cloud backups.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.selectionAsync();
                    }
                    onClose();
                    if (onOpenAuth) {
                      setTimeout(onOpenAuth, 200);
                    } else {
                      setTimeout(promptAuthModal, 200);
                    }
                  }}
                  style={styles.signInBtnTouchable}
                >
                  <LinearGradient
                    colors={["#3B82F6", "#1D4ED8"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.signInBtnGradient}
                  >
                    <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                    <Text style={styles.signInBtnText}>
                      Sign In / Sync to Cloud
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Theme Switcher Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="moon-outline" size={18} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Appearance
                </Text>
              </View>
              <Text
                style={[styles.sectionSubtitle, { color: theme.textSecondary }]}
              >
                {themeMode.toUpperCase()}
              </Text>
            </View>

            <View style={styles.themeChipsRow}>
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => {
                const isActive = themeMode === mode;
                const iconName =
                  mode === "system"
                    ? "phone-portrait-outline"
                    : mode === "light"
                      ? "sunny-outline"
                      : "moon-outline";

                return (
                  <TouchableOpacity
                    key={mode}
                    activeOpacity={0.8}
                    onPress={() => handleSetTheme(mode)}
                    style={styles.themeChipTouchable}
                  >
                    {isActive ? (
                      <LinearGradient
                        colors={["#8B5CF6", "#6D28D9"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.themeChipActive}
                      >
                        <Ionicons name={iconName} size={15} color="#FFFFFF" />
                        <Text style={styles.themeChipTextActive}>
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.themeChipInactive,
                          {
                            backgroundColor: theme.inputBg,
                            borderColor: theme.cardBorder,
                          },
                        ]}
                      >
                        <Ionicons
                          name={iconName}
                          size={15}
                          color={theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.themeChipTextInactive,
                            { color: theme.textSecondary },
                          ]}
                        >
                          {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Daily Notifications Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="notifications-outline"
                  size={18}
                  color="#F59E0B"
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Daily Reminders
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Get daily alert pushes with sound to keep your productivity streak alive. Tap any time pill to customize the schedule.
            </Text>

            <View style={styles.notifRows}>
              {/* Morning Reminder Block */}
              <View style={styles.notifBlock}>
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifLabel, { color: theme.text }]}>
                      🌅 Morning Focus
                    </Text>
                    <Text
                      style={[styles.notifSub, { color: theme.textSecondary }]}
                    >
                      Review and prioritize your daily goals
                    </Text>
                  </View>
                  <Switch
                    value={morningReminder}
                    onValueChange={handleToggleMorning}
                    trackColor={{ false: "#475569", true: "#8B5CF6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Morning Time Selector Pill */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Change morning reminder time"
                  activeOpacity={0.75}
                  onPress={handleOpenMorningTimePicker}
                  style={[
                    styles.timePillBtn,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#1E1B4B" : "#F5F3FF",
                      borderColor: "#8B5CF6",
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={15} color="#8B5CF6" />
                  <Text style={[styles.timePillText, { color: theme.text }]}>
                    {formatTime12Hour(morningTime)}
                  </Text>
                  <View style={styles.timePillEditBadge}>
                    <Ionicons name="pencil" size={11} color="#8B5CF6" />
                    <Text style={styles.timePillEditText}>Change Time</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.notifDivider,
                  { backgroundColor: theme.cardBorder },
                ]}
              />

              {/* Evening Reminder Block */}
              <View style={styles.notifBlock}>
                <View style={styles.notifRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.notifLabel, { color: theme.text }]}>
                      🌙 Evening Recap
                    </Text>
                    <Text
                      style={[styles.notifSub, { color: theme.textSecondary }]}
                    >
                      Check off completed wins & plan tomorrow
                    </Text>
                  </View>
                  <Switch
                    value={eveningReminder}
                    onValueChange={handleToggleEvening}
                    trackColor={{ false: "#475569", true: "#8B5CF6" }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Evening Time Selector Pill */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Change evening reminder time"
                  activeOpacity={0.75}
                  onPress={handleOpenEveningTimePicker}
                  style={[
                    styles.timePillBtn,
                    {
                      backgroundColor:
                        colorScheme === "dark" ? "#1E1B4B" : "#F5F3FF",
                      borderColor: "#8B5CF6",
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={15} color="#8B5CF6" />
                  <Text style={[styles.timePillText, { color: theme.text }]}>
                    {formatTime12Hour(eveningTime)}
                  </Text>
                  <View style={styles.timePillEditBadge}>
                    <Ionicons name="pencil" size={11} color="#8B5CF6" />
                    <Text style={styles.timePillEditText}>Change Time</Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.notifDivider,
                  { backgroundColor: theme.cardBorder },
                ]}
              />

              {/* Instant Test Push Notification Action */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Send instant test notification"
                activeOpacity={0.8}
                onPress={handleSendTestNotification}
                disabled={testNotifSending}
                style={[
                  styles.testNotifBtn,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                    borderColor: theme.cardBorder,
                  },
                ]}
              >
                <Ionicons
                  name={testNotifSending ? "hourglass-outline" : "notifications"}
                  size={16}
                  color="#8B5CF6"
                />
                <Text style={[styles.testNotifBtnText, { color: theme.text }]}>
                  {testNotifSending
                    ? "Sending Notification..."
                    : "🔔 Send Instant Test Notification"}
                </Text>
              </TouchableOpacity>

              {testNotifStatus && (
                <Text
                  style={[
                    styles.testNotifStatusText,
                    {
                      color: testNotifStatus.includes("sent")
                        ? "#10B981"
                        : "#EF4444",
                    },
                  ]}
                >
                  {testNotifStatus}
                </Text>
              )}
            </View>
          </View>

          {/* Backup & Restore Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="cloud-download-outline"
                  size={18}
                  color="#10B981"
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Data Backup & Restore
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Export your tasks into a JSON file to transfer between devices, or
              restore an existing backup.
            </Text>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Export backup"
                activeOpacity={0.75}
                onPress={handleExportBackup}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#064E3B" : "#ECFDF5",
                  },
                ]}
              >
                <Ionicons
                  name={
                    copiedBackup ? "checkmark-circle" : "cloud-upload-outline"
                  }
                  size={15}
                  color="#10B981"
                />
                <Text style={[styles.actionBtnText, { color: "#10B981" }]}>
                  {copiedBackup ? "JSON Copied!" : "Export JSON"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Restore backup"
                activeOpacity={0.75}
                onPress={handleOpenImport}
                style={[
                  styles.actionBtn,
                  {
                    backgroundColor:
                      colorScheme === "dark" ? "#1E293B" : "#F1F5F9",
                  },
                ]}
              >
                <Ionicons
                  name="download-outline"
                  size={15}
                  color={theme.text}
                />
                <Text style={[styles.actionBtnText, { color: theme.text }]}>
                  Import JSON
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recycle Bin Section */}
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleRow}>
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color="#EF4444"
                />
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Recycle Bin
                </Text>
              </View>
              {binTodos.length > 0 && (
                <View
                  style={{
                    backgroundColor: "rgba(239, 68, 68, 0.15)",
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 9999,
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <Text style={{ color: "#EF4444", fontSize: 11, fontWeight: "700" }}>
                    {binTodos.length} items
                  </Text>
                </View>
              )}
            </View>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              {binTodos.length > 0
                ? `${binTodos.length} deleted task${binTodos.length > 1 ? "s" : ""} available to restore or delete permanently.`
                : "Deleted tasks are safely stored here for recovery before permanent deletion."}
            </Text>

            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Open Recycle Bin"
              activeOpacity={0.75}
              onPress={() => {
                onClose();
                onOpenBin?.();
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.cardBorder,
                backgroundColor: colorScheme === "dark" ? "#1E293B" : "#F8FAFC",
                marginTop: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: "rgba(239, 68, 68, 0.12)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="trash-bin-outline" size={17} color="#EF4444" />
                </View>
                <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>
                  View Deleted Tasks
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Sub-modal: Import JSON Backup */}
        <Modal
          visible={importModalVisible}
          animationType="fade"
          transparent={true}
          statusBarTranslucent={true}
          onRequestClose={() => setImportModalVisible(false)}
        >
          <View style={styles.importBackdrop}>
            <View
              style={[
                styles.importModalCard,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text style={[styles.importTitle, { color: theme.text }]}>
                Restore Data Backup
              </Text>
              <Text
                style={[styles.importSubtitle, { color: theme.textSecondary }]}
              >
                Paste your backup JSON below to restore your tasks and bin.
              </Text>

              <TextInput
                value={importJsonText}
                onChangeText={(t) => {
                  setImportJsonText(t);
                  setImportError(null);
                }}
                placeholder='{"version": 1, "todos": [...]}'
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={8}
                style={[
                  styles.importTextInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: importError ? "#EF4444" : theme.inputBorder,
                    color: theme.text,
                  },
                ]}
              />

              {importError && (
                <Text style={styles.errorText}>{importError}</Text>
              )}

              <View style={styles.importBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setImportModalVisible(false)}
                  style={[
                    styles.importCancelBtn,
                    { backgroundColor: theme.inputBg },
                  ]}
                >
                  <Text
                    style={[
                      styles.importCancelText,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={!importJsonText.trim()}
                  activeOpacity={0.8}
                  onPress={handleConfirmImport}
                  style={[
                    styles.importConfirmBtn,
                    { opacity: importJsonText.trim() ? 1 : 0.45 },
                  ]}
                >
                  <Text style={styles.importConfirmText}>Restore Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Custom Material 3 Restore Confirmation Dialog */}
        <ConfirmDialog
          visible={restoreConfirmVisible}
          title="Confirm Restore"
          message={`Restoring this backup will replace current tasks with ${pendingRestoreData?.todos.length ?? 0} tasks and ${pendingRestoreData?.binTodos.length ?? 0} bin items. Continue?`}
          confirmText="Restore Backup"
          cancelText="Cancel"
          variant="warning"
          iconName="cloud-download"
          onConfirm={executeRestore}
          onCancel={() => {
            setRestoreConfirmVisible(false);
            setPendingRestoreData(null);
          }}
        />

        {/* Custom Material 3 Time Picker Modal */}
        <TimePickerModal
          visible={timePickerConfig.visible}
          title={timePickerConfig.title}
          initialTime={timePickerConfig.initialTime}
          presets={timePickerConfig.presets}
          onClose={() =>
            setTimePickerConfig((prev) => ({ ...prev, visible: false }))
          }
          onSave={handleSaveReminderTime}
        />
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
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
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },
  sectionCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  themeChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  themeChipTouchable: {
    flex: 1,
  },
  themeChipActive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  themeChipInactive: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  themeChipTextActive: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  themeChipTextInactive: {
    fontSize: 13,
    fontWeight: "600",
  },
  notifRows: {
    gap: 12,
  },
  notifBlock: {
    gap: 10,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  notifLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  notifSub: {
    fontSize: 12,
    marginTop: 2,
  },
  timePillBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  timePillText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.2,
    flex: 1,
  },
  timePillEditBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timePillEditText: {
    color: "#8B5CF6",
    fontSize: 11,
    fontWeight: "700",
  },
  testNotifBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  testNotifBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  testNotifStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 2,
  },
  notifDivider: {
    height: 1,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  importBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  importModalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 20,
  },
  importTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  importSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  importTextInput: {
    height: 140,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    fontSize: 12,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlignVertical: "top",
    marginBottom: 10,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  importBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  importCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
  },
  importCancelText: {
    fontSize: 14,
    fontWeight: "600",
  },
  importConfirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 9999,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  importConfirmText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  syncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#10B98120",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  syncedBadgeText: {
    color: "#10B981",
    fontSize: 10,
    fontWeight: "800",
  },
  accountInfoCol: {
    gap: 6,
    marginTop: 4,
  },
  accountEmailText: {
    fontSize: 15,
    fontWeight: "700",
  },
  accountSubtext: {
    fontSize: 12,
    lineHeight: 17,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    marginTop: 6,
  },
  signOutBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
  signInBtnTouchable: {
    marginTop: 6,
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  signInBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    borderRadius: 14,
  },
  signInBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
