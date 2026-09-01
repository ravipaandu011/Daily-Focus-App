import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  BackHandler,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategories } from '@/context/category-context';
import { CategoryManagerModal } from '@/components/category-manager-modal';
import { useRouter } from 'expo-router';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface DockTabItemProps {
  conf: any;
  isFocused: boolean;
  isCustom: boolean;
  isDark: boolean;
  itemWidth?: number;
  onPress: () => void;
  onLongPress: () => void;
}

const DockTabItem: React.FC<DockTabItemProps> = ({
  conf,
  isFocused,
  isCustom,
  isDark,
  itemWidth,
  onPress,
  onLongPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isFocused) {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 90,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 70,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused]);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
      style={[
        styles.tabItem,
        itemWidth ? { width: itemWidth } : { minWidth: 48 },
      ]}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        {isFocused ? (
          <LinearGradient
            colors={conf.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.iconContainer,
              {
                shadowColor: conf.gradient[0],
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.35,
                shadowRadius: 5,
                elevation: 4,
              },
            ]}>
            {isCustom ? (
              <Text style={styles.tabEmoji}>{conf.emoji}</Text>
            ) : (
              <Ionicons name={conf.activeIconName} size={17} color="#FFFFFF" />
            )}
          </LinearGradient>
        ) : (
          <View style={styles.iconContainer}>
            {isCustom ? (
              <Text style={[styles.tabEmoji, { opacity: 0.6 }]}>{conf.emoji}</Text>
            ) : (
              <Ionicons
                name={conf.iconName}
                size={17}
                color={isDark ? '#64748B' : '#94A3B8'}
              />
            )}
          </View>
        )}
      </Animated.View>
      <Text
        style={[
          styles.tabLabel,
          {
            color: isFocused ? conf.color : (isDark ? '#94A3B8' : '#64748B'),
            fontWeight: isFocused ? '800' : '600',
          },
        ]}
        numberOfLines={1}>
        {conf.tabLabel}
      </Text>
    </TouchableOpacity>
  );
};

const DynamicBottomTabBarComponent: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    allCategoryKeys,
    activeCategoryKey,
    setActiveCategoryKey,
    getCategoryConfig,
    deleteCategory,
    isCustomCategory,
    triggerOpenAddModal,
  } = useCategories();

  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [actionMenuCategory, setActionMenuCategory] = useState<{
    key: string;
    title: string;
    emoji?: string;
  } | null>(null);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState<{
    key: string;
    title: string;
  } | null>(null);
  const [pillWidth, setPillWidth] = useState<number>(0);

  const scrollViewRef = useRef<ScrollView>(null);

  const bottomInset = insets.bottom > 0 ? insets.bottom : 14;
  const isDark = colorScheme === 'dark';
  const activeConfig = getCategoryConfig(activeCategoryKey);
  const isScrollable = allCategoryKeys.length > 5;
  const itemWidth = pillWidth > 0 ? Math.floor((pillWidth - 8) / 5) : undefined;

  // Auto reset scroll position to 0 whenever categories change or reset to 5
  useEffect(() => {
    if (allCategoryKeys.length <= 5 || activeCategoryKey === 'work' || activeCategoryKey === allCategoryKeys[0]) {
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
    }
  }, [allCategoryKeys.length, activeCategoryKey, allCategoryKeys]);

  const handleSelectTab = React.useCallback(
    (key: string) => {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      }
      setActiveCategoryKey(key);
    },
    [setActiveCategoryKey]
  );

  const handleLongPressTab = React.useCallback(
    (key: string, title: string) => {
      if (!isCustomCategory(key)) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setEditingCategoryKey(null);
        setCategoryModalVisible(true);
        return;
      }

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const conf = getCategoryConfig(key);
      setActionMenuCategory({
        key,
        title,
        emoji: conf.emoji || '🏷️',
      });
    },
    [isCustomCategory, getCategoryConfig]
  );

  React.useEffect(() => {
    if (!actionMenuCategory) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      setActionMenuCategory(null);
      return true;
    });
    return () => backSub.remove();
  }, [actionMenuCategory]);

  const handleOpenAddCategory = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setEditingCategoryKey(null);
    setCategoryModalVisible(true);
  }, []);

  return (
    <>
      <View style={[styles.outerWrapper, { bottom: bottomInset }]}>
        {/* Concept B: Split Floating Dock - Exactly 5 Visible Tabs per View */}
        <View
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0 && Math.abs(w - pillWidth) > 1) {
              setPillWidth(w);
            }
          }}
          style={[
            styles.leftPillContainer,
            {
              backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
              borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)',
              borderWidth: 1,
              shadowColor: isDark ? '#000000' : '#64748B',
            },
          ]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            scrollEnabled={isScrollable}
            showsHorizontalScrollIndicator={false}
            bounces={isScrollable}
            overScrollMode="never"
            contentContainerStyle={styles.scrollContent}>
            {allCategoryKeys.map((key) => {
              const conf = getCategoryConfig(key);
              const isFocused = activeCategoryKey === key;
              const isCustom = isCustomCategory(key);

              return (
                <DockTabItem
                  key={key}
                  conf={conf}
                  isFocused={isFocused}
                  isCustom={isCustom}
                  isDark={isDark}
                  itemWidth={itemWidth}
                  onPress={() => handleSelectTab(key)}
                  onLongPress={() => handleLongPressTab(key, conf.tabLabel)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Concept B: Split Floating Dock - Right Detached FAB */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
            triggerOpenAddModal();
          }}
          onLongPress={handleOpenAddCategory}
          delayLongPress={350}
          style={[
            styles.rightFabTouchable,
            { shadowColor: activeConfig.color },
          ]}>
          <LinearGradient
            colors={activeConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.rightFabGradient}>
            <Ionicons name="add" size={26} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setEditingCategoryKey(null);
        }}
        initialEditingKey={editingCategoryKey}
        onSelectCategory={(key) => handleSelectTab(key)}
      />

      {/* Custom Material 3 Category Action Sheet Dialog */}
      <Modal
        visible={actionMenuCategory !== null}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setActionMenuCategory(null)}>
        <TouchableWithoutFeedback onPress={() => setActionMenuCategory(null)}>
          <View style={styles.actionBackdrop}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
              <View
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
                    borderColor: isDark ? '#334155' : '#E2E8F0',
                  },
                ]}>
                {/* Glowing Top Badge with Category Emoji */}
                <View style={styles.actionBadgeContainer}>
                  <View
                    style={[
                      styles.actionEmojiBadge,
                      {
                        backgroundColor: isDark
                          ? 'rgba(59, 130, 246, 0.2)'
                          : '#EFF6FF',
                        borderColor: isDark ? '#3B82F6' : '#BFDBFE',
                      },
                    ]}>
                    <Text style={styles.actionEmojiText}>
                      {actionMenuCategory?.emoji || '🏷️'}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    styles.actionTitle,
                    { color: isDark ? '#F8FAFC' : '#0F172A' },
                  ]}>
                  Category Options
                </Text>
                <Text
                  style={[
                    styles.actionSubtitle,
                    { color: isDark ? '#94A3B8' : '#64748B' },
                  ]}>
                  Manage &ldquo;{actionMenuCategory?.title}&rdquo;
                </Text>

                {/* Edit Category Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    const keyToEdit = actionMenuCategory?.key || null;
                    setActionMenuCategory(null);
                    setEditingCategoryKey(keyToEdit);
                    setCategoryModalVisible(true);
                  }}
                  style={styles.actionBtnTouchable}>
                  <LinearGradient
                    colors={['#3B82F6', '#2563EB']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionBtnGradient}>
                    <Ionicons name="pencil" size={17} color="#FFFFFF" />
                    <Text style={styles.actionBtnGradientText}>
                      Edit Category
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Delete Category Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                    const catToDelete = actionMenuCategory;
                    setActionMenuCategory(null);
                    if (catToDelete) {
                      setDeleteConfirmCategory({
                        key: catToDelete.key,
                        title: catToDelete.title,
                      });
                    }
                  }}
                  style={styles.actionBtnTouchable}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionBtnGradient}>
                    <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.actionBtnGradientText}>
                      Delete Category
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Cancel Button */}
                <TouchableOpacity
                  activeOpacity={0.75}
                  onPress={() => setActionMenuCategory(null)}
                  style={[
                    styles.actionCancelBtn,
                    {
                      backgroundColor: isDark ? '#0F172A' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.actionCancelText,
                      { color: isDark ? '#94A3B8' : '#64748B' },
                    ]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Custom Material 3 Delete Category Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirmCategory !== null}
        title="Delete Category"
        message={`Are you sure you want to delete "${deleteConfirmCategory?.title}"? All tasks inside will remain safely preserved.`}
        confirmText="Delete Category"
        cancelText="Cancel"
        variant="danger"
        iconName="trash-outline"
        onConfirm={async () => {
          if (deleteConfirmCategory) {
            await deleteCategory(deleteConfirmCategory.key);
            setDeleteConfirmCategory(null);
          }
        }}
        onCancel={() => setDeleteConfirmCategory(null)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 100,
    gap: 10,
  },
  leftPillContainer: {
    flex: 1,
    borderRadius: 9999,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tabEmoji: {
    fontSize: 15,
    textAlign: 'center',
  },
  tabLabel: {
    fontSize: 9,
    marginTop: 1.5,
    textAlign: 'center',
  },
  rightFabTouchable: {
    width: 52,
    height: 52,
    borderRadius: 26,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  rightFabGradient: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  actionCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  actionBadgeContainer: {
    marginTop: -42,
    marginBottom: 12,
  },
  actionEmojiBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  actionEmojiText: {
    fontSize: 30,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  actionSubtitle: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  actionBtnTouchable: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 10,
  },
  actionBtnGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
  },
  actionBtnGradientText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  actionCancelBtn: {
    width: '100%',
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  actionCancelText: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export const DynamicBottomTabBar = React.memo(DynamicBottomTabBarComponent);






