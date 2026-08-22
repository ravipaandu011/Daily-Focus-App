import React, { useState } from "react";
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
  isSearchVisible?: boolean;
  onCloseSearch?: () => void;
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
  isSearchVisible = false,
  onCloseSearch,
}) => {
  const colorScheme = useColorScheme() ?? "light";
  const theme = Colors[colorScheme];
  const [internalSearchOpen, setInternalSearchOpen] = useState(false);

  const showSearch = isSearchVisible || internalSearchOpen || searchQuery.length > 0;

  const handleSelectFilter = (f: StatusFilter) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    onStatusFilterChange(f);
  };

  const handleToggleSearch = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    if (showSearch) {
      onSearchChange("");
      setInternalSearchOpen(false);
      onCloseSearch?.();
    } else {
      setInternalSearchOpen(true);
    }
  };

  const handleClearSearch = () => {
    onSearchChange("");
    setInternalSearchOpen(false);
    onCloseSearch?.();
  };

  return (
    <View style={styles.container}>
      {/* Collapsible Search Input Bar */}
      {showSearch && (
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
            color={sectionConfig.color}
            style={styles.searchIcon}
          />
          <TextInput
            value={searchQuery}
            onChangeText={onSearchChange}
            placeholder="Search tasks..."
            placeholderTextColor={theme.textMuted}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
            autoFocus={true}
            clearButtonMode="while-editing"
          />
          <TouchableOpacity
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={handleClearSearch}
            style={styles.clearBtn}
          >
            <Ionicons name="close-circle" size={17} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      {/* Filter Status Chips Row + Search Pill */}
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
              style={[styles.chipActive, { shadowColor: sectionConfig.color }]}
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
              style={[styles.chipActive, { shadowColor: sectionConfig.color }]}
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
              style={[styles.chipActive, { shadowColor: sectionConfig.color }]}
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

        {/* Search Pill Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Toggle search"
          activeOpacity={0.8}
          onPress={handleToggleSearch}
          style={styles.searchPillTouchable}
        >
          {showSearch ? (
            <LinearGradient
              colors={sectionConfig.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.searchPillActive,
                { shadowColor: sectionConfig.color },
              ]}
            >
              <Ionicons name="search" size={15} color="#FFFFFF" />
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.searchPillInactive,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={15}
                color={theme.textSecondary}
              />
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
    height: 42,
    borderRadius: 9999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
    fontWeight: "500",
  },
  clearBtn: {
    padding: 4,
    marginLeft: 4,
  },
  filterChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipTouchable: {
    flex: 1,
  },
  chipActive: {
    height: 38,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  chipInactive: {
    height: 38,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  chipTextInactive: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  searchPillTouchable: {
    width: 38,
  },
  searchPillActive: {
    height: 38,
    width: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  searchPillInactive: {
    height: 38,
    width: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
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
      prev.isSearchVisible === next.isSearchVisible &&
      prev.sectionConfig.color === next.sectionConfig.color
    );
  },
);
