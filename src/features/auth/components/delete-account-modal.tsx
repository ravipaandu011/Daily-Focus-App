import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/features/auth/auth-context';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  /** Called once the account is gone (the app then shows the sign-in screen). */
  onDeleted: () => void;
}

/** Asks for the password, then permanently deletes the account and all its data. */
export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ visible, onClose, onDeleted }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const { user, deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const close = () => {
    if (deleting) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    const result = await deleteAccount(password);
    setDeleting(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPassword('');
    onDeleted();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent statusBarTranslucent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <View style={styles.iconCircle}>
            <Ionicons name="warning" size={24} color="#EF4444" />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Delete account?</Text>
          <Text style={[styles.message, { color: theme.textSecondary }]}>
            This permanently deletes <Text style={{ fontWeight: '700', color: theme.text }}>{user?.email}</Text> and
            all its tasks and notes, from the cloud and from this phone. It can&apos;t be undone.
            {'\n\n'}
            Want to keep your data? Close this and use Save Backup first.
          </Text>

          <TextInput
            value={password}
            onChangeText={(t) => {
              setPassword(t);
              setError(null);
            }}
            placeholder="Enter your password to confirm"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: error ? '#EF4444' : theme.inputBorder,
                color: theme.text,
              },
            ]}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.btnRow}>
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              disabled={deleting}
              onPress={close}
              style={[styles.cancelBtn, { backgroundColor: theme.inputBg }]}>
              <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Delete account permanently"
              activeOpacity={0.8}
              disabled={!password || deleting}
              onPress={handleDelete}
              style={[styles.deleteBtn, { opacity: !password || deleting ? 0.5 : 1 }]}>
              {deleting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteText}>Delete Forever</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 30,
    borderWidth: 1,
    padding: 22,
    elevation: 20,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 15,
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    flex: 1.4,
    height: 46,
    borderRadius: 9999,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
