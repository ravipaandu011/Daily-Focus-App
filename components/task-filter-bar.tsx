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
import { StatusFilter, PriorityLevel } from "@/types/todo";
import { SectionConfig } from "@/constants/sections";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

interface TaskFilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  priorityFilter?: PriorityLevel | 'all';
  onPriorityFilterChange?: (p: PriorityLevel | 'all') => void;
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
  priorityFilter = 'all',
  onPriorityFilterChange,
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

  const handleCyclePriority = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    const order: (PriorityLevel | 'all')[] = ['all', 'high', 'medium', 'low'];
    const currentIndex = order.indexOf(priorityFilter || 'all');
    const nextPriority = order[(currentIndex + 1) % order.length];
    onPriorityFilterChange?.(nextPriority);
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

      {/* Filter Status Chips Row + Priority Filter + Search Pill */}
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

        {/* Priority Filter Pill Button */}
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Filter by priority"
          activeOpacity={0.8}
          onPress={handleCyclePriority}
          style={styles.searchPillTouchable}
        >
          {priorityFilter !== 'all' ? (
            <View
              style={[
                styles.searchPillActive,
                {
                  backgroundColor:
                    priorityFilter === 'high'
                      ? '#EF4444'
                      : priorityFilter === 'medium'
                      ? '#F59E0B'
                      : '#3B82F6',
                  borderColor: 'rgba(255, 255, 255, 0.45)',
                  shadowColor:
                    priorityFilter === 'high'
                      ? '#EF4444'
                      : priorityFilter === 'medium'
                      ? '#F59E0B'
                      : '#3B82F6',
                },
              ]}
            >
              <Ionicons name="flag" size={13} color="#FFFFFF" />
            </View>
          ) : (
            <View
              style={[
                styles.searchPillInactive,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              <Ionicons
                name="flag-outline"
                size={13}
                color={theme.textSecondary}
              />
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
              <Ionicons name="search" size={14} color="#FFFFFF" />
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
                size={14}
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
    marginBottom: 6,
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
    height: 31,
    borderRadius: 9999,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  chipInactive: {
    height: 31,
    borderRadius: 9999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  chipTextInactive: {
    fontSize: 11.5,
    fontWeight: "600",
    letterSpacing: -0.1,
  },
  searchPillTouchable: {
    width: 31,
  },
  searchPillActive: {
    height: 31,
    width: 31,
    borderRadius: 15.5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  searchPillInactive: {
    height: 31,
    width: 31,
    borderRadius: 15.5,
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
      prev.priorityFilter === next.priorityFilter &&
      prev.totalCount === next.totalCount &&
      prev.pendingCount === next.pendingCount &&
      prev.completedCount === next.completedCount &&
      prev.isSearchVisible === next.isSearchVisible &&
      prev.sectionConfig.color === next.sectionConfig.color
    );
  },
);
