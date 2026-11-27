import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  autoCheckForUpdate,
  createApkUpdateDownloader,
  dismissUpdate,
  DownloadProgress,
  formatMegabytes,
  getCurrentVersion,
  openUpdateInBrowser,
  ReleaseInfo,
  subscribeToUpdateModal,
  type UpdateDownloadController,
} from '@/features/updates/update-check';

const GRADIENT_COLORS: [string, string] = ['#7C3AED', '#2563EB'];

/** Renders **bold** spans inside a line. */
function renderInline(text: string, boldColor: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
      <Text key={i} style={{ fontWeight: '700', color: boldColor }}>
        {part.slice(2, -2)}
      </Text>
    ) : (
      part
    )
  );
}

/**
 * The GitHub release notes, with the bits of Markdown they use: "#"/"##" headings,
 * "-"/"*" bullets and **bold**. Anything else shows as plain text.
 */
const ReleaseNotes: React.FC<{ notes: string; textColor: string; headingColor: string }> = ({
  notes,
  textColor,
  headingColor,
}) => (
  <View style={styles.notesList}>
    {notes.split(/\r?\n/).map((raw, i) => {
      const line = raw.trim();
      if (!line) return <View key={i} style={styles.notesGap} />;
      const heading = /^#{1,6}\s+(.*)$/.exec(line);
      if (heading) {
        return (
          <Text key={i} style={[styles.notesHeading, { color: headingColor }]}>
            {renderInline(heading[1], headingColor)}
          </Text>
        );
      }
      const bullet = /^[-*]\s+(.*)$/.exec(line);
      if (bullet) {
        return (
          <View key={i} style={styles.notesBulletRow}>
            <Text style={[styles.notesText, { color: textColor }]}>•</Text>
            <Text style={[styles.notesText, styles.notesBulletText, { color: textColor }]}>
              {renderInline(bullet[1], headingColor)}
            </Text>
          </View>
        );
      }
      return (
        <Text key={i} style={[styles.notesText, { color: textColor }]}>
          {renderInline(line, headingColor)}
        </Text>
      );
    })}
  </View>
);

/** Checks GitHub for a newer release on launch and AppState resume, with in-app APK download + installer. */
export const UpdatePrompt: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const isDark = colorScheme === 'dark';

  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress>({
    writtenBytes: 0,
    totalBytes: 0,
    fraction: 0,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const downloaderRef = useRef<UpdateDownloadController | null>(null);
  const isCheckingRef = useRef(false);
  const visibleRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const showReleaseModal = useCallback((found: ReleaseInfo) => {
    setRelease(found);
    setErrorMsg(null);
    setIsDownloading(false);
    setProgress({ writtenBytes: 0, totalBytes: found.sizeBytes ?? 0, fraction: 0 });
    setVisible(true);
  }, []);

  const runCheck = useCallback(async () => {
    if (Platform.OS !== 'android' || isCheckingRef.current || visibleRef.current) return;
    isCheckingRef.current = true;
    try {
      const found = await autoCheckForUpdate();
      if (found && !visibleRef.current) {
        showReleaseModal(found);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [showReleaseModal]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const unsubscribeExternal = subscribeToUpdateModal((manualRelease) => {
      if (!isDownloading) {
        showReleaseModal(manualRelease);
      }
    });

    const initialTimer = setTimeout(() => {
      runCheck();
    }, 2000);

    const sub = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if ((prev === 'background' || prev === 'inactive') && nextState === 'active') {
        runCheck();
      }
    });

    return () => {
      unsubscribeExternal();
      clearTimeout(initialTimer);
      sub.remove();
    };
  }, [runCheck, showReleaseModal, isDownloading]);

  const handleLater = useCallback(async () => {
    if (isDownloading) return;
    Haptics.selectionAsync();
    const version = release?.version;
    setVisible(false);
    if (version) {
      await dismissUpdate(version);
    }
  }, [isDownloading, release]);

  const handleCancelDownload = useCallback(async () => {
    Haptics.selectionAsync();
    await downloaderRef.current?.cancel();
    downloaderRef.current = null;
    setIsDownloading(false);
    setProgress((prev) => ({ ...prev, writtenBytes: 0, fraction: 0 }));
  }, []);

  const handleUpdateNow = useCallback(async () => {
    if (!release || isDownloading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!release.apkUrl) {
      await openUpdateInBrowser(release);
      setVisible(false);
      return;
    }

    setErrorMsg(null);
    setIsDownloading(true);
    setProgress({ writtenBytes: 0, totalBytes: release.sizeBytes ?? 0, fraction: 0 });

    const controller = createApkUpdateDownloader(release, (nextProgress) => {
      setProgress(nextProgress);
    });
    downloaderRef.current = controller;

    try {
      await controller.start();
      setIsDownloading(false);
      setVisible(false);
    } catch (err: any) {
      setIsDownloading(false);
      setErrorMsg(err?.message || 'Could not install update automatically.');
    } finally {
      downloaderRef.current = null;
    }
  }, [release, isDownloading]);

  const handleOpenBrowser = useCallback(async () => {
    if (!release) return;
    Haptics.selectionAsync();
    await openUpdateInBrowser(release);
    setVisible(false);
  }, [release]);

  useEffect(() => {
    if (!visible) return;
    const backSub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (isDownloading) return true;
      handleLater();
      return true;
    });
    return () => backSub.remove();
  }, [visible, isDownloading, handleLater]);

  if (!release) return null;

  const installedVersion = getCurrentVersion();
  const sizeLabel = formatMegabytes(progress.totalBytes || release.sizeBytes);
  const downloadedLabel = formatMegabytes(progress.writtenBytes);
  const percent = Math.round(progress.fraction * 100);
  const badgeBg = isDark ? 'rgba(99, 102, 241, 0.20)' : '#EEF2FF';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={() => {
        if (!isDownloading) handleLater();
      }}>
      <TouchableWithoutFeedback
        onPress={() => {
          if (!isDownloading) handleLater();
        }}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation?.()}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.cardBorder,
                },
              ]}>
              <View style={[styles.iconBadgeOuter, { backgroundColor: badgeBg }]}>
                <LinearGradient
                  colors={GRADIENT_COLORS}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.iconBadge}>
                  <Ionicons name="cloud-download-outline" size={24} color="#FFFFFF" />
                </LinearGradient>
              </View>

              <Text style={[styles.title, { color: theme.text }]}>New Update Available</Text>

              {/* Separate Text pieces: one Text with a nested bold part got clipped on Android ("21.8" without "MB"). */}
              <View style={[styles.versionPill, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                <Text style={[styles.versionText, { color: theme.textSecondary }]}>v{installedVersion}</Text>
                <Ionicons name="arrow-forward" size={12} color={theme.textSecondary} />
                <Text style={[styles.versionText, styles.versionNew]}>v{release.version}</Text>
                {sizeLabel ? (
                  <Text style={[styles.versionText, { color: theme.textSecondary }]}>· {sizeLabel}</Text>
                ) : null}
              </View>

              {release.notes ? (
                <ScrollView
                  style={[styles.notesBox, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}
                  contentContainerStyle={styles.notesContent}
                  showsVerticalScrollIndicator={true}>
                  <ReleaseNotes notes={release.notes} textColor={theme.textSecondary} headingColor={theme.text} />
                </ScrollView>
              ) : (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  A newer version of Daily Focus is ready to download and install.
                </Text>
              )}

              {isDownloading && (
                <View style={styles.progressSection}>
                  <View style={[styles.progressTrack, { backgroundColor: theme.inputBg }]}>
                    <LinearGradient
                      colors={GRADIENT_COLORS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${Math.max(4, percent)}%` }]}
                    />
                  </View>
                  <View style={styles.progressMetaRow}>
                    <View style={styles.progressLabelRow}>
                      <ActivityIndicator size="small" color="#6366F1" style={{ marginRight: 6 }} />
                      <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                        Downloading APK... {percent}%
                      </Text>
                    </View>
                    <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                      {downloadedLabel || '0.0 MB'}
                      {sizeLabel ? ` / ${sizeLabel}` : ''}
                    </Text>
                  </View>
                </View>
              )}

              {errorMsg && (
                <View
                  style={[
                    styles.errorBox,
                    { backgroundColor: isDark ? '#450A0A' : '#FEF2F2', borderColor: '#EF4444' },
                  ]}>
                  <Ionicons name="alert-circle" size={16} color="#EF4444" />
                  <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
              )}

              {isDownloading ? (
                <TouchableOpacity
                  accessibilityRole="button"
                  activeOpacity={0.75}
                  onPress={handleCancelDownload}
                  style={[styles.fullBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                  <Text style={[styles.laterText, { color: theme.textSecondary }]}>Cancel Download</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.buttonsRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.75}
                    onPress={handleLater}
                    style={[styles.laterBtn, { backgroundColor: theme.inputBg, borderColor: theme.cardBorder }]}>
                    <Text style={[styles.laterText, { color: theme.textSecondary }]}>Later</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    activeOpacity={0.85}
                    onPress={errorMsg ? handleOpenBrowser : handleUpdateNow}
                    style={styles.updateBtnTouchable}>
                    <LinearGradient
                      colors={GRADIENT_COLORS}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.updateBtnGradient}>
                      <Text style={styles.updateBtnText}>
                        {errorMsg ? 'Open in Browser' : release.apkUrl ? 'Update Now' : 'Download'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )}
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
  card: {
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
    marginBottom: 14,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 10,
  },
  versionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 14,
  },
  versionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  versionNew: {
    color: '#6366F1',
    fontWeight: '800',
  },
  notesList: {
    gap: 2,
  },
  notesGap: {
    height: 6,
  },
  notesHeading: {
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  notesBulletRow: {
    flexDirection: 'row',
    gap: 6,
  },
  notesBulletText: {
    flex: 1,
  },
  notesBox: {
    width: '100%',
    maxHeight: 150,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  notesContent: {
    padding: 12,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 19,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  progressSection: {
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  laterBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBtn: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterText: {
    fontSize: 14,
    fontWeight: '700',
  },
  updateBtnTouchable: {
    flex: 1.4,
    height: 48,
    borderRadius: 16,
  },
  updateBtnGradient: {
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  updateBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
