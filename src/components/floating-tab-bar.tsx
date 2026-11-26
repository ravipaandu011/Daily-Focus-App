import React, { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { TODO_CONFIG } from '@/constants/sections';

const BAR_HEIGHT = 64;
const FAB_SIZE = 64;
const SIDE_GAP = 16;
const FAB_GAP = 12;
const BAR_PADDING = 6;
const TAB_GAP = 6;

/**
 * Shared layout for the floating dock: the tab pill sits on the left and each screen
 * renders its own round add button (FAB) on the right at the same height.
 */
export function useFloatingBarLayout() {
  const insets = useSafeAreaInsets();
  const bottom = insets.bottom > 0 ? insets.bottom : 14;
  return {
    bottom,
    barHeight: BAR_HEIGHT,
    fabSize: FAB_SIZE,
    fabRight: SIDE_GAP,
    /** Bottom padding lists need so their last item clears the dock. */
    contentInset: bottom + BAR_HEIGHT + 24,
  };
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { label: string; icon: IconName; activeIcon: IconName }> = {
  index: { label: 'Todo', icon: 'checkmark-done-circle-outline', activeIcon: 'checkmark-done-circle' },
  notes: { label: 'Notes', icon: 'document-text-outline', activeIcon: 'document-text' },
};

/** The bubble behind the active tab: the brand gradient with a glossy glass highlight on top. */
function GradientBubble() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.bubbleShape]}>
      <LinearGradient
        colors={TODO_CONFIG.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Highlight along the top edge, like light catching curved glass. */}
      <LinearGradient
        colors={['rgba(255, 255, 255, 0.38)', 'rgba(255, 255, 255, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function FloatingTabBar({ state, emitter, navigateToTab }: BottomTabBarProps) {
  const isDark = useColorScheme() === 'dark';
  const { bottom } = useFloatingBarLayout();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // The gradient bubble slides behind the active tab.
  const tabCount = state.routes.length;
  const tabWidth = barWidth > 0 ? (barWidth - 2 - BAR_PADDING * 2 - TAB_GAP * (tabCount - 1)) / tabCount : 0;
  const bubbleX = useSharedValue(0);
  useEffect(() => {
    bubbleX.value = withSpring(state.index * (tabWidth + TAB_GAP), { damping: 18, stiffness: 180, mass: 0.8 });
  }, [state.index, tabWidth, bubbleX]);
  const bubbleStyle = useAnimatedStyle(() => ({ transform: [{ translateX: bubbleX.value }] }));

  if (keyboardVisible) return null;

  const activeTint = TODO_CONFIG.onGradient; // dark ink, readable on the gradient
  const inactiveTint = isDark ? '#94A3B8' : '#64748B';

  return (
    <View
      onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          bottom,
          backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
          borderColor: isDark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(226, 232, 240, 0.9)',
          shadowColor: isDark ? '#000000' : '#64748B',
        },
      ]}>
      {tabWidth > 0 && (
        <Animated.View pointerEvents="none" style={[styles.bubble, bubbleStyle, { width: tabWidth }]}>
          <GradientBubble />
        </Animated.View>
      )}

      {state.routes.map((route, index) => {
        const config = TAB_CONFIG[route.name];
        if (!config) return null;
        const isFocused = state.index === index;

        const onPress = () => {
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            if (Platform.OS !== 'web') Haptics.selectionAsync();
            navigateToTab(route.key);
          }
        };

        const tint = isFocused ? activeTint : inactiveTint;
        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={config.label}
            activeOpacity={0.7}
            onPress={onPress}
            style={styles.tab}>
            <Ionicons name={isFocused ? config.activeIcon : config.icon} size={19} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{config.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: SIDE_GAP,
    right: SIDE_GAP + FAB_SIZE + FAB_GAP,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: BAR_PADDING,
    gap: TAB_GAP,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  bubble: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
  },
  bubbleShape: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    height: '100%',
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
});
