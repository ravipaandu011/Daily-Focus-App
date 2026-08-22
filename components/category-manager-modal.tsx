import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useCategories } from '@/context/category-context';
import { GRADIENT_PALETTES, CATEGORY_EMOJIS, GradientPalette } from '@/constants/category-palettes';
import { CustomCategory } from '@/types/todo';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectCategory?: (key: string) => void;
  initialEditingKey?: string | null;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  visible,
  onClose,
  onSelectCategory,
  initialEditingKey,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 16
  );
  const scrollViewRef = useRef<ScrollView>(null);

  const { customCategories, addCategory, updateCategory, deleteCategory } = useCategories();

  const [editingCategoryKey, setEditingCategoryKey] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🚀');
  const [selectedPalette, setSelectedPalette] = useState<GradientPalette>(GRADIENT_PALETTES[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ key: string; title: string } | null>(null);

  // Initialize or reset form when modal opens or initialEditingKey changes
  useEffect(() => {
    if (visible) {
      if (initialEditingKey) {
        const cat = customCategories.find((c) => c.key === initialEditingKey);
        if (cat) {
          handleStartEdit(cat);
          return;
        }
      }
      handleCancelEdit();
    }
  }, [visible, initialEditingKey, customCategories]);

  const handleStartEdit = (cat: CustomCategory) => {
    setEditingCategoryKey(cat.key);
    setTitle(cat.title);
    setSelectedEmoji(cat.emoji);
    const matchingPalette =
      GRADIENT_PALETTES.find((p) => p.color === cat.color || p.gradient[0] === cat.gradient[0]) ||
      GRADIENT_PALETTES[0];
    setSelectedPalette(matchingPalette);
    setErrorMessage(null);
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleCancelEdit = () => {
    setEditingCategoryKey(null);
    setTitle('');
    setSelectedEmoji('🚀');
    setSelectedPalette(GRADIENT_PALETTES[0]);
    setErrorMessage(null);
  };

  const handleSubmitCategory = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMessage('Please enter a category title.');
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    if (editingCategoryKey) {
      // Update existing category
      await updateCategory(editingCategoryKey, {
        title: trimmedTitle,
        emoji: selectedEmoji,
        color: selectedPalette.color,
        gradient: selectedPalette.gradient,
        lightBg: selectedPalette.lightBg,
        accentColor: selectedPalette.accentColor,
      });

      const updatedKey = editingCategoryKey;
      handleCancelEdit();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      if (updatedKey) {
        onSelectCategory?.(updatedKey);
      }
      onClose();
    } else {
      // Create brand new category
      const generatedKey = `custom_${trimmedTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36).slice(-4)}`;

      const created = await addCategory({
        key: generatedKey,
        title: trimmedTitle,
        emoji: selectedEmoji,
        color: selectedPalette.color,
        gradient: selectedPalette.gradient,
        lightBg: selectedPalette.lightBg,
        accentColor: selectedPalette.accentColor,
        iconName: 'folder-outline',
      });

      handleCancelEdit();
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      onSelectCategory?.(created.key);
      onClose();
    }
  };

  const handleDeleteCategory = (key: string, catTitle: string) => {
    setDeleteTarget({ key, title: catTitle });
  };

  const executeDeleteCategory = async () => {
    if (!deleteTarget) return;
    const { key } = deleteTarget;
    if (editingCategoryKey === key) {
      handleCancelEdit();
    }
    await deleteCategory(key);
    setDeleteTarget(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View
          style={[
            styles.modalHeader,
            {
              paddingTop: topInset + 10,
              borderBottomColor: theme.cardBorder,
            },
          ]}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={selectedPalette.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconBadge}>
              <Ionicons
                name={editingCategoryKey ? 'pencil' : 'pricetag'}
                size={18}
                color="#FFFFFF"
              />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {editingCategoryKey ? 'Edit Category' : 'Manage Categories'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {editingCategoryKey ? 'Modify name, emoji & color' : 'Create & customize personal sections'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Live Preview Card */}
          <View style={styles.previewContainer}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              {editingCategoryKey ? 'EDITING PREVIEW' : 'LIVE PREVIEW'}
            </Text>
            <LinearGradient
              colors={selectedPalette.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.previewBadge}>
              <Text style={styles.previewEmoji}>{selectedEmoji}</Text>
              <View>
                <Text style={styles.previewTitle}>
                  {title.trim() ? `${title.trim()} Todo` : 'My Custom Section Todo'}
                </Text>
                <Text style={styles.previewSubtitle}>
                  {selectedPalette.name} Palette • {title.trim() || 'New Category'}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Category Title Input */}
          <View style={styles.inputGroup}>
            <View style={styles.inputLabelRow}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                CATEGORY TITLE
              </Text>
              {editingCategoryKey && (
                <TouchableOpacity onPress={handleCancelEdit}>
                  <Text style={styles.cancelEditText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.card, borderColor: errorMessage ? '#EF4444' : theme.cardBorder },
              ]}>
              <Ionicons name="pricetag-outline" size={18} color={selectedPalette.color} />
              <TextInput
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="e.g. Side Hustle, Finance, Reading..."
                placeholderTextColor={theme.textMuted}
                maxLength={24}
                style={[styles.input, { color: theme.text }]}
              />
              {title.length > 0 && (
                <TouchableOpacity onPress={() => setTitle('')}>
                  <Ionicons name="close-circle" size={16} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
          </View>

          {/* Emoji Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              CHOOSE ICON / EMOJI
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.emojiRow}>
              {CATEGORY_EMOJIS.map((emoji) => {
                const isSelected = selectedEmoji === emoji;
                return (
                  <TouchableOpacity
                    key={emoji}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setSelectedEmoji(emoji);
                    }}
                    style={[
                      styles.emojiChip,
                      {
                        backgroundColor: isSelected ? theme.inputBg : theme.card,
                        borderColor: isSelected ? selectedPalette.color : theme.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}>
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Color Gradient Palette Picker */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
              CHOOSE COLOR & GRADIENT
            </Text>
            <View style={styles.palettesGrid}>
              {GRADIENT_PALETTES.map((pal) => {
                const isSelected = selectedPalette.id === pal.id;
                return (
                  <TouchableOpacity
                    key={pal.id}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.selectionAsync();
                      setSelectedPalette(pal);
                    }}
                    style={[
                      styles.paletteCard,
                      {
                        backgroundColor: isSelected
                          ? colorScheme === 'dark'
                            ? '#1E293B'
                            : '#F1F5F9'
                          : theme.card,
                        borderColor: isSelected ? pal.color : theme.cardBorder,
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}>
                    <LinearGradient
                      colors={pal.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.paletteGradientBadge}>
                      {isSelected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                    </LinearGradient>
                    <Text
                      style={[
                        styles.paletteName,
                        { color: isSelected ? pal.color : theme.text, fontWeight: isSelected ? '700' : '500' },
                      ]}
                      numberOfLines={1}>
                      {pal.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Button: Create or Save Changes */}
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSubmitCategory}
            style={styles.createBtnTouchable}>
            <LinearGradient
              colors={selectedPalette.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.createBtnGradient}>
              <Ionicons
                name={editingCategoryKey ? 'checkmark-circle-outline' : 'add-circle-outline'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.createBtnText}>
                {editingCategoryKey ? 'Save Changes' : 'Create Category'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Existing Custom Categories List */}
          {customCategories.length > 0 && (
            <View style={styles.existingSection}>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                YOUR CUSTOM CATEGORIES ({customCategories.length})
              </Text>
              <View style={styles.existingList}>
                {customCategories.map((cat) => {
                  const isBeingEdited = editingCategoryKey === cat.key;
                  return (
                    <View
                      key={cat.id}
                      style={[
                        styles.existingItemCard,
                        {
                          backgroundColor: isBeingEdited
                            ? colorScheme === 'dark'
                              ? '#1E1B4B'
                              : '#EEF2FF'
                            : theme.card,
                          borderColor: isBeingEdited ? '#6366F1' : theme.cardBorder,
                          borderWidth: isBeingEdited ? 2 : 1,
                        },
                      ]}>
                      <LinearGradient
                        colors={cat.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.existingBadge}>
                        <Text style={styles.existingEmoji}>{cat.emoji}</Text>
                      </LinearGradient>

                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync();
                          onSelectCategory?.(cat.key);
                          onClose();
                        }}
                        style={styles.existingInfo}>
                        <Text style={[styles.existingTitle, { color: theme.text }]}>{cat.title}</Text>
                        <Text style={[styles.existingKey, { color: theme.textSecondary }]}>
                          Tap to open • Tap ✏️ to edit
                        </Text>
                      </TouchableOpacity>

                      {/* Action Buttons Row: Edit & Delete */}
                      <View style={styles.categoryActionsRow}>
                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Edit ${cat.title}`}
                          onPress={() => handleStartEdit(cat)}
                          style={[
                            styles.actionIconButton,
                            { backgroundColor: colorScheme === 'dark' ? '#1E3A8A' : '#EFF6FF' },
                          ]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="pencil" size={14} color="#3B82F6" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          accessibilityRole="button"
                          accessibilityLabel={`Delete ${cat.title}`}
                          onPress={() => handleDeleteCategory(cat.key, cat.title)}
                          style={[
                            styles.actionIconButton,
                            { backgroundColor: colorScheme === 'dark' ? '#450A0A' : '#FEF2F2' },
                          ]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Custom Material 3 Delete Category Confirmation Dialog */}
        <ConfirmDialog
          visible={deleteTarget !== null}
          title="Delete Category?"
          message={`Are you sure you want to remove "${deleteTarget?.title}"? Tasks inside this category will remain preserved.`}
          confirmText="Delete Category"
          cancelText="Cancel"
          variant="danger"
          iconName="trash"
          onConfirm={executeDeleteCategory}
          onCancel={() => setDeleteTarget(null)}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    gap: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  previewContainer: {
    width: '100%',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  previewSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    marginTop: 2,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  emojiRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  emojiChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  palettesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  paletteCard: {
    width: '31%',
    padding: 10,
    borderRadius: 18,
    alignItems: 'center',
    gap: 6,
  },
  paletteGradientBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteName: {
    fontSize: 11,
    textAlign: 'center',
  },
  createBtnTouchable: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  createBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 9999,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  existingSection: {
    marginTop: 8,
    gap: 10,
  },
  existingList: {
    gap: 10,
  },
  existingItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
  },
  existingBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  existingEmoji: {
    fontSize: 18,
  },
  existingInfo: {
    flex: 1,
  },
  existingTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  existingKey: {
    fontSize: 11,
    marginTop: 2,
  },
  categoryActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
