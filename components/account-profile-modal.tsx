import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/context/auth-context';
import { useTodos } from '@/hooks/use-todos';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface AccountProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export const AccountProfileModal: React.FC<AccountProfileModalProps> = ({
  visible,
  onClose,
  onOpenAuth,
}) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const { user, displayName, signOut, exitGuestMode } = useAuth();
  const { todos, binTodos } = useTodos();
  const [confirmSignOutVisible, setConfirmSignOutVisible] = React.useState(false);

  const handleSignOut = () => {
    setConfirmSignOutVisible(true);
  };

  const executeSignOut = async () => {
    setConfirmSignOutVisible(false);
    onClose();
    await signOut();
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleExitGuest = async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    onClose();
    await exitGuestMode();
  };

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}>
          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardHeaderTitle, { color: theme.textSecondary }]}>
              {user ? 'ACCOUNT & PROFILE' : 'GUEST MODE'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
              <Ionicons name="close" size={16} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* User Info Card */}
          {user ? (
            <View style={styles.userProfileSection}>
              <LinearGradient
                colors={['#3B82F6', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{initials}</Text>
              </LinearGradient>

              <Text style={[styles.userName, { color: theme.text }]}>{displayName}</Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user.email}
              </Text>

              {/* Status Badge */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: isDark ? '#064E3B' : '#ECFDF5' },
                ]}>
                <View style={styles.onlineDot} />
                <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>
                  Cloud Realtime Sync Active
                </Text>
              </View>

              {/* Stats Row */}
              <View
                style={[
                  styles.statsRow,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {todos.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Active Tasks
                  </Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: theme.cardBorder }]} />
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text }]}>
                    {binTodos.length}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                    Recycle Bin
                  </Text>
                </View>
              </View>

              {/* Sign Out Button */}
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Sign out of account"
                activeOpacity={0.8}
                onPress={handleSignOut}
                style={[
                  styles.signOutBtn,
                  {
                    backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                    borderColor: '#EF4444',
                  },
                ]}>
                <Ionicons name="log-out-outline" size={17} color="#EF4444" />
                <Text style={styles.signOutText}>Sign Out & Lock Data</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.guestSection}>
              <View
                style={[
                  styles.guestAvatarCircle,
                  { backgroundColor: isDark ? '#334155' : '#E2E8F0' },
                ]}>
                <Ionicons name="person-outline" size={28} color="#8B5CF6" />
              </View>

              <Text style={[styles.userName, { color: theme.text }]}>Guest Explorer</Text>
              <Text style={[styles.guestDesc, { color: theme.textSecondary }]}>
                You are using offline mode. Tasks are stored only on this device.
              </Text>

              <TouchableOpacity
                activeOpacity={0.88}
                onPress={handleExitGuest}
                style={styles.signInBtnTouchable}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.signInBtnGradient}>
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.signInBtnText}>Sign In / Create Account</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Custom Material 3 Sign Out Confirmation Dialog */}
        <ConfirmDialog
          visible={confirmSignOutVisible}
          title="Sign Out"
          message="Are you sure you want to sign out? Your tasks are safely stored in your cloud account."
          confirmText="Sign Out"
          cancelText="Cancel"
          variant="danger"
          iconName="log-out-outline"
          onConfirm={executeSignOut}
          onCancel={() => setConfirmSignOutVisible(false)}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userProfileSection: {
    alignItems: 'center',
    gap: 8,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 4,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
  },
  userEmail: {
    fontSize: 13,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#10B981',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  signOutText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  guestSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  guestAvatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  guestDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  signInBtnTouchable: {
    width: '100%',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  signInBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 16,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
