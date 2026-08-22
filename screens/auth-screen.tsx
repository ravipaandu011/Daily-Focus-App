import { Colors } from '@/constants/theme';
import { SocialProvider, useAuth } from '@/context/auth-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConfirmDialog } from '@/components/confirm-dialog';

export const AuthScreen: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';

  const { signIn, signUp, signInWithSocial, sendPasswordReset } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot password state
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const [noticeDialog, setNoticeDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    variant: 'info' | 'warning' | 'danger';
    iconName?: keyof typeof Ionicons.glyphMap;
  }>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
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
            variant: 'info',
            iconName: 'information-circle',
          });
          setErrorMessage(
            'Google provider is not enabled yet in Supabase. Please sign in or create an account with Email & Password below.'
          );
        } else {
          setErrorMessage(error.message || `Failed to sign in with ${provider}`);
        }
      }
    }
  };

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
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
          message: 'Your account is ready! If your Supabase project has email verification enabled, check your inbox to confirm your email before signing in.',
          variant: 'info',
          iconName: 'checkmark-circle',
        });
      }
    } else {
      const { error } = await signIn(trimmedEmail, password);
      setIsLoading(false);
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          setErrorMessage('Email not confirmed yet. Check your inbox or verify your email in Supabase Auth.');
        } else if (error.message.toLowerCase().includes('invalid login credentials')) {
          setErrorMessage('Incorrect email or password. Please try again.');
        } else {
          setErrorMessage(error.message);
        }
      } else {
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    }
  };

  const handleSendReset = async () => {
    const trimmed = resetEmail.trim();
    if (!trimmed) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetError(null);
    setIsResetting(true);

    const { error } = await sendPasswordReset(trimmed);
    setIsResetting(false);

    if (error) {
      setResetError(error.message);
    } else {
      setResetSuccess(true);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  };

  const timeGreeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return { greeting: 'Good morning', emoji: '☀️', subtitle: 'Start your day with clarity & focus' };
    } else if (hour >= 12 && hour < 17) {
      return { greeting: 'Good afternoon', emoji: '🌤️', subtitle: 'Keep your momentum going strong' };
    } else if (hour >= 17 && hour < 22) {
      return { greeting: 'Good evening', emoji: '🌆', subtitle: 'Wrap up your daily achievements' };
    } else {
      return { greeting: 'Good night', emoji: '🌙', subtitle: 'Plan ahead & prepare for tomorrow' };
    }
  }, []);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.screen, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (Platform.OS === 'ios' ? 20 : 12),
            paddingBottom: insets.bottom + 32,
          },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Compact Brand Hero */}
        <View style={styles.brandContainer}>
          <LinearGradient
            colors={['#7C3AED', '#C026D3', '#F97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradientBadge}>
            <Ionicons name="checkmark-done" size={34} color="#FFFFFF" />
          </LinearGradient>

          <Text style={[styles.brandTitle, { color: theme.text }]}>Daily Focus</Text>

          <View
            style={[
              styles.greetingPill,
              {
                backgroundColor: isDark ? '#1E293B' : '#FDF4FF',
                borderColor: isDark ? '#334155' : '#F5D0FE',
              },
            ]}>
            <Text style={styles.greetingEmoji}>{timeGreeting.emoji}</Text>
            <Text
              style={[
                styles.greetingText,
                { color: isDark ? '#E879F9' : '#A21CAF' },
              ]}>
              {timeGreeting.greeting} — {timeGreeting.subtitle}
            </Text>
          </View>
        </View>

        {/* Unified Auth Card — everything in one clean card */}
        <View
          style={[
            styles.authCard,
            { backgroundColor: theme.card, borderColor: theme.cardBorder },
          ]}>
          {/* Mode Switcher Tabs */}
          <View
            style={[
              styles.tabSwitcher,
              { backgroundColor: theme.inputBg },
            ]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              style={[
                styles.tabBtn,
                mode === 'signin' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#3B0764' : '#FFFFFF' },
                ],
              ]}>
              <Ionicons
                name={mode === 'signin' ? 'log-in' : 'log-in-outline'}
                size={16}
                color={mode === 'signin' ? (isDark ? '#E879F9' : '#A21CAF') : theme.textMuted}
                style={{ marginBottom: 2 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'signin' ? (isDark ? '#E879F9' : '#A21CAF') : theme.textSecondary },
                  mode === 'signin' && styles.tabBtnTextActive,
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
                mode === 'signup' && [
                  styles.tabBtnActive,
                  { backgroundColor: isDark ? '#3B0764' : '#FFFFFF' },
                ],
              ]}>
              <Ionicons
                name={mode === 'signup' ? 'person-add' : 'person-add-outline'}
                size={16}
                color={mode === 'signup' ? (isDark ? '#E879F9' : '#A21CAF') : theme.textMuted}
                style={{ marginBottom: 2 }}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: mode === 'signup' ? (isDark ? '#E879F9' : '#A21CAF') : theme.textSecondary },
                  mode === 'signup' && styles.tabBtnTextActive,
                ]}>
                Create Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Google Sign In — inside the card */}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            activeOpacity={0.85}
            disabled={socialLoading !== null}
            onPress={() => handleSocialSignIn('google')}
            style={[
              styles.googleBtn,
              {
                backgroundColor: isDark ? '#1E293B' : '#FAFAFA',
                borderColor: isDark ? '#334155' : '#E2E8F0',
              },
            ]}>
            <View style={styles.socialBtnInner}>
              <Ionicons name="logo-google" size={18} color="#EA4335" />
              <Text style={[styles.googleBtnText, { color: theme.text }]}>Continue with Google</Text>
            </View>
            {socialLoading === 'google' && (
              <ActivityIndicator size="small" color="#C026D3" style={styles.socialSpinner} />
            )}
          </TouchableOpacity>

          {/* Inline Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.cardBorder }]} />
          </View>

          {/* Error Banner */}
          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: isDark ? '#450A0A' : '#FEF2F2',
                  borderColor: '#EF4444',
                },
              ]}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Sign Up: Name Field */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>FULL NAME</Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}>
                <Ionicons name="person-outline" size={17} color={theme.textSecondary} />
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

          {/* Email Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>EMAIL</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}>
              <Ionicons name="mail-outline" size={17} color={theme.textSecondary} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="alex@example.com"
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                style={[styles.input, { color: theme.text }]}
              />
            </View>
          </View>

          {/* Password Field */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PASSWORD</Text>
            <View
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
              ]}>
              <Ionicons name="lock-closed-outline" size={17} color={theme.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 6 characters"
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
                  size={17}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign Up: Confirm Password */}
          {mode === 'signup' && (
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                CONFIRM PASSWORD
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}>
                <Ionicons name="shield-checkmark-outline" size={17} color={theme.textSecondary} />
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Repeat your password"
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
            activeOpacity={0.88}
            disabled={isLoading}
            onPress={handleSubmit}
            style={styles.submitBtnTouchable}>
            <LinearGradient
              colors={['#7C3AED', '#C026D3', '#F97316']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={mode === 'signin' ? 'log-in-outline' : 'person-add-outline'}
                    size={19}
                    color="#FFFFFF"
                  />
                  <Text style={styles.submitBtnText}>
                    {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Forgot Password — below submit, centered, sign in only */}
          {mode === 'signin' && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setResetEmail(email);
                setResetSuccess(false);
                setResetError(null);
                setResetModalVisible(true);
              }}
              style={styles.forgotBtn}>
              <Text style={styles.forgotText}>Forgot your password?</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={resetModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setResetModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.card, borderColor: theme.cardBorder },
            ]}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <LinearGradient
                  colors={['#7C3AED', '#C026D3']}
                  style={styles.resetIconBadge}>
                  <Ionicons name="key-outline" size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Reset Password</Text>
              </View>
              <TouchableOpacity
                onPress={() => setResetModalVisible(false)}
                style={[styles.modalCloseBtn, { backgroundColor: theme.inputBg }]}>
                <Ionicons name="close" size={16} color={theme.text} />
              </TouchableOpacity>
            </View>

            {resetSuccess ? (
              <View style={styles.resetSuccessContainer}>
                <Ionicons name="mail-unread-outline" size={42} color="#10B981" />
                <Text style={[styles.resetSuccessTitle, { color: theme.text }]}>
                  Reset Link Sent!
                </Text>
                <Text style={[styles.resetSuccessSub, { color: theme.textSecondary }]}>
                  We've sent a password reset email to {resetEmail}. Please check your inbox.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setResetModalVisible(false)}
                  style={styles.resetDoneBtn}>
                  <Text style={styles.resetDoneBtnText}>Back to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.resetForm}>
                <Text style={[styles.resetDesc, { color: theme.textSecondary }]}>
                  Enter the email associated with your account and we will send you a link to reset your password.
                </Text>

                {resetError && (
                  <View style={styles.resetErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#EF4444" />
                    <Text style={styles.resetErrorText}>{resetError}</Text>
                  </View>
                )}

                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                  ]}>
                  <Ionicons name="mail-outline" size={18} color={theme.textSecondary} />
                  <TextInput
                    value={resetEmail}
                    onChangeText={setResetEmail}
                    placeholder="you@example.com"
                    placeholderTextColor={theme.textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { color: theme.text }]}
                  />
                </View>

                <TouchableOpacity
                  disabled={isResetting}
                  activeOpacity={0.85}
                  onPress={handleSendReset}
                  style={styles.resetSubmitBtn}>
                  <LinearGradient
                    colors={['#7C3AED', '#C026D3', '#F97316']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.resetSubmitGradient}>
                    {isResetting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.resetSubmitText}>Send Reset Link</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Custom Material 3 Notice / Success Dialog */}
      <ConfirmDialog
        visible={noticeDialog.visible}
        title={noticeDialog.title}
        message={noticeDialog.message}
        confirmText="Got it!"
        variant={noticeDialog.variant}
        iconName={noticeDialog.iconName}
        onConfirm={() => setNoticeDialog((prev) => ({ ...prev, visible: false }))}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    alignItems: 'stretch',
    flexGrow: 1,
    justifyContent: 'center',
  },
  // ── Brand Hero (compact) ──────────────────────────
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 6,
  },
  logoGradientBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  greetingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  greetingEmoji: {
    fontSize: 12,
  },
  greetingText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  // ── Unified Auth Card ─────────────────────────────
  authCard: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  tabSwitcher: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 9999,
    gap: 2,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tabBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabBtnTextActive: {
    fontWeight: '800',
  },
  googleBtn: {
    height: 48,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  socialBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  socialSpinner: {
    marginLeft: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 9999,
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
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
    marginTop: 2,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 9999,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  forgotBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A21CAF',
  },
  // ── Reset Password Modal ──────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetForm: {
    gap: 14,
  },
  resetDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  resetErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#FEF2F2',
  },
  resetErrorText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  resetSubmitBtn: {
    marginTop: 4,
  },
  resetSubmitGradient: {
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resetSuccessContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  resetSuccessTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  resetSuccessSub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetDoneBtn: {
    marginTop: 10,
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
  resetDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

