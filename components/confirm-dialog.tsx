import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export type DialogVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
  iconName?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  iconName,
  onConfirm,
  onCancel,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const handleConfirm = () => {
    if (Platform.OS !== 'web') {
      if (variant === 'danger') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.selectionAsync();
      }
    }
    onConfirm();
  };

  const handleCancel = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onCancel?.();
  }, [onCancel]);

  React.useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true;
    });
    return () => backSub.remove();
  }, [visible, handleCancel]);

  const isDanger = variant === 'danger';
  const isWarning = variant === 'warning';
  const isSuccess = variant === 'success';

  const defaultIcon: keyof typeof Ionicons.glyphMap = isDanger
    ? 'alert-circle'
    : isWarning
    ? 'warning'
    : isSuccess
    ? 'checkmark-circle'
    : 'information-circle';

  const badgeIcon = iconName || defaultIcon;

  const gradientColors: [string, string] = isDanger
    ? ['#EF4444', '#DC2626']
    : isWarning
    ? ['#F59E0B', '#D97706']
    : isSuccess
    ? ['#10B981', '#059669']
    : ['#3B82F6', '#2563EB'];

  const badgeBg = isDanger
    ? colorScheme === 'dark'
      ? 'rgba(239, 68, 68, 0.18)'
      : '#FEE2E2'
    : isWarning
    ? colorScheme === 'dark'
      ? 'rgba(245, 158, 11, 0.18)'
      : '#FEF3C7'
    : isSuccess
    ? colorScheme === 'dark'
      ? 'rgba(16, 185, 129, 0.18)'
      : '#D1FAE5'
    : colorScheme === 'dark'
    ? 'rgba(59, 130, 246, 0.18)'
    : '#EFF6FF';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleCancel}>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <View
              style={[
                styles.dialogCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              {/* Top Icon Badge */}
              <View style={[styles.iconBadgeOuter, { backgroundColor: badgeBg }]}>
                <LinearGradient
                  colors={gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBadge}>
                  <Ionicons name={badgeIcon} size={22} color="#FFFFFF" />
                </LinearGradient>
              </View>

              {/* Title & Description */}
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

              {/* Action Buttons Row */}
              <View style={styles.buttonsRow}>
                {/* Cancel Button (optional) */}
                {onCancel && (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel={cancelText}
                    activeOpacity={0.75}
                    onPress={handleCancel}
                    style={[
                      styles.cancelBtn,
                      {
                        backgroundColor: theme.inputBg,
                        borderColor: theme.cardBorder,
                      },
                    ]}>
                    <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>
                      {cancelText}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Confirm / Action Button */}
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={confirmText}
                  activeOpacity={0.85}
                  onPress={handleConfirm}
                  style={[
                    styles.confirmBtnTouchable,
                    !onCancel && { flex: 1 },
                  ]}>
                  <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.confirmBtnGradient}>
                    <Text style={styles.confirmBtnText}>{confirmText}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 24,
  },
  iconBadgeOuter: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmBtnTouchable: {
    flex: 1.3,
    height: 48,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnGradient: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
