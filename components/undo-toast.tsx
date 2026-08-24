import React, { useEffect, useRef, useCallback } from 'react';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface UndoToastProps {
  visible: boolean;
  message?: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
  bottomOffset?: number;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  visible,
  message = 'Moved to bin',
  onUndo,
  onDismiss,
  duration = 4500,
  bottomOffset,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const isDark = colorScheme === 'dark';

  // Dynamic bottom bar has container (~64px) + margin (bottomInset) + center elevated FAB extending 24px above.
  // Total dynamic bottom bar clearance height is bottomInset + 88px.
  // Float at bottomInset + 116px for generous, comfortable clearance above the center FAB.
  const bottomInset = insets.bottom > 0 ? insets.bottom : 10;
  const computedBottom = bottomOffset ?? (bottomInset + 116);

  const translateY = useRef(new Animated.Value(40)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const handleDismiss = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 40,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  }, [opacity, translateY, onDismiss]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 16,
          stiffness: 160,
          mass: 0.8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 40,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, duration, handleDismiss, opacity, translateY]);

  const handleUndo = () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onUndo();
    handleDismiss();
  };

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastWrapper,
        {
          bottom: computedBottom,
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <View
        style={[
          styles.toastContainer,
          {
            backgroundColor: isDark ? '#1E293B' : '#0F172A',
            borderColor: isDark ? '#334155' : '#1E293B',
          },
        ]}>
        {/* Left Message Section */}
        <View style={styles.leftRow}>
          <View style={styles.iconCircle}>
            <Ionicons name="trash-outline" size={15} color="#F87171" />
          </View>
          <Text style={styles.messageText} numberOfLines={1} ellipsizeMode="tail">
            {message}
          </Text>
        </View>

        {/* Right Action Section */}
        <View style={styles.rightRow}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Undo delete task"
            activeOpacity={0.7}
            onPress={handleUndo}
            style={styles.undoButton}>
            <Ionicons name="arrow-undo" size={13} color="#60A5FA" />
            <Text style={styles.undoText}>Undo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Dismiss notice"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
            onPress={handleDismiss}
            style={styles.closeBtn}>
            <Ionicons name="close" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
    alignItems: 'center',
  },
  toastContainer: {
    width: '100%',
    maxWidth: 500,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 16,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageText: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: '600',
    flexShrink: 1,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  undoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
  },
  undoText: {
    color: '#60A5FA',
    fontSize: 12.5,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 3,
  },
});
