import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth, SocialProvider } from '@/context/auth-context';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ visible, onClose }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  const { signIn, signUp, signInWithSocial } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeDialog, setNoticeDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const handleSocialSignIn = async (provider: SocialProvider) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setErrorMessage(null);
    setSocialLoading(provider);

    const { error } = await signInWithSocial(provider);
    setSocialLoading(null);

    if (error) {
      if (!error.message.toLowerCase().includes('cancel') && !error.message.toLowerCase().includes('dismiss')) {
        if (
          error.message.toLowerCase().includes('not enabled') ||
          error.message.toLowerCase().includes('unsupported provider')
        ) {
          setNoticeDialog({
            visible: true,
            title: 'Google Sign-In Notice',
            message: 'Google Sign-In is not enabled yet in your Supabase Auth dashboard.\n\nPlease sign in or create an account using Email & Password below!',
          });
          setErrorMessage(
            'Google provider is not enabled yet in Supabase. Please sign in or create an account with Email & Password below.'
          );
        } else {
          setErrorMessage(error.message || `Failed to sign in with ${provider}`);
        }
      }
    } else {
      onClose();
    }
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (mode === 'signup') {
      const { error } = await signUp(trimmedEmail, password, displayName);
      setIsLoading(false);
      if (error) {
        setErrorMessage(error.message);
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setNoticeDialog({
          visible: true,
          title: 'Account Created! 🎉',
          message: 'Your account is ready! If you have email confirmation enabled in Supabase, please verify your email before logging in.',
          onConfirm: () => onClose(),
        });
      }
    } else {
      const { error } = await signIn(trimmedEmail, password);
      setIsLoading(false);
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Email not confirmed yet. Check your inbox or verify your email.');
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Incorrect email or password. Please try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onClose();
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: theme.cardBorder, backgroundColor: theme.card },
          ]}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={['#3B82F6', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerIconBadge}>
              <Ionicons name="cloud-done" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View>
              <Text style={[styles.headerTitle, { color: theme.text }]}>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Sync tasks across all your devices
              </Text>
            </View>
          </View>

          <TouchableOpacity
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: theme.inputBg }]}>
            <Ionicons name="close" size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Social Sign-In Button */}
          <View style={styles.socialRowContainer}>
            {/* Google */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={socialLoading !== null}
              onPress={() => handleSocialSignIn('google')}
              style={[
                styles.googleBtn,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={[styles.googleBtnText, { color: theme.text }]}>Continue with Google</Text>
              {socialLoading === 'google' && <ActivityIndicator size="small" color="#3B82F6" style={{ marginLeft: 8 }} />}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>or email</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          </View>

          {/* Mode Switcher Tabs */}
          <View
            style={[
              styles.tabSwitcher,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              style={[
                styles.tabBtn,
                mode === 'signin' && {
                  backgroundColor: colorScheme === 'dark' ? '#1E3A8A' : '#EFF6FF',
                  borderColor: '#3B82F6',
                  borderWidth: 1,
                },
              ]}>
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'signin' ? '#3B82F6' : theme.textSecondary },
                  mode === 'signin' && { fontWeight: '700' },
                ]}>
                Sign In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              style={[
                styles.tabBtn,
                mode === 'signup' && {
                  backgroundColor: colorScheme === 'dark' ? '#1E3A8A' : '#EFF6FF',
                  borderColor: '#3B82F6',
                  borderWidth: 1,
                },
              ]}>
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'signup' ? '#3B82F6' : theme.textSecondary },
                  mode === 'signup' && { fontWeight: '700' },
                ]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Box */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colorScheme === 'dark' ? '#450A0A' : '#FEF2F2',
                  borderColor: '#EF4444',
                },
              ]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Sign Up Full Name */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}>
                <Ionicons name="person-outline" size={18} color={theme.textSecondary} />
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Alex Morgan"
                  placeholderTextColor={theme.textMuted}
                  autoCapitalize="words"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            </View>
          )}

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>EMAIL ADDRESS</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}>
              <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={[styles.input, { color: theme.text }]}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PASSWORD</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}>
              <Ionicons name="lock-closed-outline" size={18} color={theme.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                style={[styles.input, { color: theme.text }]}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up Confirm Password */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                CONFIRM PASSWORD
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.card, borderColor: theme.cardBorder },
                ]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.textSecondary} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat password"
                  placeholderTextColor={theme.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  style={[styles.input, { color: theme.text }]}
                />
              </View>
            </View>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isLoading}
            onPress={handleSubmit}
            style={styles.submitBtnTouchable}>
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={mode === 'signin' ? 'log-in-outline' : 'person-add-outline'}
                    size={18}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Free Account'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Material 3 Notice / Success Dialog */}
      <ConfirmDialog
        visible={noticeDialog.visible}
        title={noticeDialog.title}
        message={noticeDialog.message}
        confirmText="Got it!"
        variant="info"
        iconName="information-circle"
        onConfirm={() => {
          setNoticeDialog((prev) => ({ ...prev, visible: false }));
          if (noticeDialog.onConfirm) {
            noticeDialog.onConfirm();
          }
        }}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 20 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
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
    gap: 14,
  },
  socialRowContainer: {
    width: '100%',
  },
  googleBtn: {
    width: '100%',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    height: '100%',
  },
  submitBtnTouchable: {
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
