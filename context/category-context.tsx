import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomCategory, SectionKey } from '@/types/todo';
import { SECTIONS, SectionConfig, SECTION_KEYS } from '@/constants/sections';
import { useAuth } from '@/context/auth-context';

interface CategoryContextType {
  customCategories: CustomCategory[];
  allCategoryKeys: string[];
  activeCategoryKey: string;
  setActiveCategoryKey: (key: string) => void;
  getCategoryConfig: (key: string) => SectionConfig;
  addCategory: (category: Omit<CustomCategory, 'id' | 'createdAt'>) => Promise<CustomCategory>;
  updateCategory: (key: string, updates: Partial<Omit<CustomCategory, 'id' | 'key' | 'createdAt'>>) => Promise<CustomCategory | null>;
  deleteCategory: (key: string) => Promise<void>;
  isCustomCategory: (key: string) => boolean;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export const CategoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [activeCategoryKey, setActiveCategoryKey] = useState<string>('work');

  const storageKey = useMemo(() => {
    return user ? `@personal_todo_custom_categories_u_${user.id}` : '@personal_todo_custom_categories_local';
  }, [user]);

  // Load custom categories on mount / user change
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setCustomCategories(parsed);
          }
        } else {
          setCustomCategories([]);
        }
      } catch (e) {
        console.error('Failed to load custom categories', e);
      }
    })();
  }, [storageKey]);

  // Save to storage
  const saveCustomCategories = async (updated: CustomCategory[]) => {
    setCustomCategories(updated);
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist custom categories', e);
    }
  };

  const addCategory = useCallback(
    async (cat: Omit<CustomCategory, 'id' | 'createdAt'>): Promise<CustomCategory> => {
      const newCategory: CustomCategory = {
        ...cat,
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        createdAt: Date.now(),
      };
      const updated = [...customCategories, newCategory];
      await saveCustomCategories(updated);
      setActiveCategoryKey(newCategory.key);
      return newCategory;
    },
    [customCategories, storageKey]
  );

  const updateCategory = useCallback(
    async (
      key: string,
      updates: Partial<Omit<CustomCategory, 'id' | 'key' | 'createdAt'>>
    ): Promise<CustomCategory | null> => {
      let updatedCategory: CustomCategory | null = null;
      const updated = customCategories.map((c) => {
        if (c.key === key) {
          updatedCategory = { ...c, ...updates };
          return updatedCategory;
        }
        return c;
      });
      if (updatedCategory) {
        await saveCustomCategories(updated);
      }
      return updatedCategory;
    },
    [customCategories, storageKey]
  );

  const deleteCategory = useCallback(
    async (key: string) => {
      const updated = customCategories.filter((c) => c.key !== key);
      await saveCustomCategories(updated);
      setActiveCategoryKey((prev) => (prev === key ? 'work' : prev));
    },
    [customCategories, storageKey]
  );

  const isCustomCategory = useCallback(
    (key: string) => {
      return customCategories.some((c) => c.key === key);
    },
    [customCategories]
  );

  const getCategoryConfig = useCallback(
    (key: string): SectionConfig => {
      if (SECTIONS[key as keyof typeof SECTIONS]) {
        return SECTIONS[key as keyof typeof SECTIONS];
      }

      const custom = customCategories.find((c) => c.key === key);
      if (custom) {
        return {
          key: custom.key as SectionKey,
          title: `${custom.title} Todo`,
          emoji: custom.emoji,
          tabLabel: custom.title,
          color: custom.color,
          gradient: custom.gradient,
          lightBg: custom.lightBg,
          accentColor: custom.accentColor,
          iconName: (custom.iconName || 'folder-outline') as any,
          activeIconName: (custom.iconName ? custom.iconName.replace('-outline', '') : 'folder') as any,
        };
      }

      // Default fallback to Work
      return SECTIONS.work;
    },
    [customCategories]
  );

  const allCategoryKeys = useMemo(() => {
    return [...SECTION_KEYS, ...customCategories.map((c) => c.key)];
  }, [customCategories]);

  return (
    <CategoryContext.Provider
      value={{
        customCategories,
        allCategoryKeys,
        activeCategoryKey,
        setActiveCategoryKey,
        getCategoryConfig,
        addCategory,
        updateCategory,
        deleteCategory,
        isCustomCategory,
      }}>
      {children}
    </CategoryContext.Provider>
  );
};

export function useCategories() {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoryProvider');
  }
  return context;
}
