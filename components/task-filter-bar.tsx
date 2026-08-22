import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { StatusFilter } from "@/types/todo";
import { SectionConfig } from "@/constants/sections";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  sectionConfig: SectionConfig;
  totalCount: number;
  pendingCount: number;
  completedCount: number;
}

const TaskFilterBarComponent: React.FC<TaskFilterBarProps> = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sectionConfig,
  totalCount,
  pendingCount,
  completedCount,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];

  const handleSelectFilter = (f: StatusFilter) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onStatusFilterChange(f);
  };

  return (
    <View style={styles.container}>
      {/* Search Input Bar with Material Pill Radius */}
      <View
        style={[
          styles.searchBar,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={17}
          color={theme.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          value={searchQuery}
          onChangeText={onSearchChange}
          placeholder="Search tasks..."
          placeholderTextColor={theme.textMuted}
          style={[styles.searchInput, { color: theme.text }]}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onSearchChange("")}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Status Chips Row */}
      <View style={styles.filterChipsRow}>
        {/* All Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectFilter("all")}
          style={styles.chipTouchable}
        >
          {statusFilter === "all" ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipActive}
            >
              <Text style={styles.chipTextActive}>All ({totalCount})</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.chipTextInactive,
                  { color: theme.textSecondary },
                ]}
              >
                All ({totalCount})
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Pending Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectFilter("pending")}
          style={styles.chipTouchable}
        >
          {statusFilter === "pending" ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipActive}
            >
              <Text style={styles.chipTextActive}>
                Pending ({pendingCount})
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.chipTextInactive,
                  { color: theme.textSecondary },
                ]}
              >
                Pending ({pendingCount})
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Completed Chip */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleSelectFilter("completed")}
          style={styles.chipTouchable}
        >
          {statusFilter === "completed" ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chipActive}
            >
              <Text style={styles.chipTextActive}>Done ({completedCount})</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.chipInactive,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.chipTextInactive,
                  { color: theme.textSecondary },
                ]}
              >
                Done ({completedCount})
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
    marginBottom: 10,
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 46,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    height: "100%",
  },
  clearBtn: {
    padding: 4,
  },
  filterChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chipTouchable: {
    flex: 1,
  },
  chipActive: {
    paddingVertical: 9,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  chipInactive: {
    paddingVertical: 9,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  chipTextInactive: {
    fontSize: 12,
    fontWeight: "600",
  },
});

export const TaskFilterBar = React.memo(
  TaskFilterBarComponent,
  (prev, next) => {
    return (
      prev.searchQuery === next.searchQuery &&
      prev.statusFilter === next.statusFilter &&
      prev.totalCount === next.totalCount &&
      prev.pendingCount === next.pendingCount &&
      prev.completedCount === next.completedCount &&
      prev.sectionConfig.color === next.sectionConfig.color
    );
  },
);
