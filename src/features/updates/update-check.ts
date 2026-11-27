import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import {
  cacheDirectory,
  createDownloadResumable,
  deleteAsync,
  getContentUriAsync,
  type DownloadResumable,
} from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import { Linking, Platform } from 'react-native';

/** The app is shared through this repo's GitHub releases. */
const LATEST_RELEASE_API = 'https://api.github.com/repos/ravipaandu011/Daily-Focus-App/releases/latest';
const REQUEST_TIMEOUT_MS = 8000;
/** Automatic GitHub check runs at most once every 6 hours. */
const AUTO_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Tapping "Later" hides the prompt for 24 hours, then reminds again on reopen. */
const DISMISS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const LAST_CHECK_KEY = 'update_last_check_at';
const CACHED_RELEASE_KEY = 'update_cached_release_v1';
const DISMISSED_KEY = 'update_dismissed_v1';
const LEGACY_DISMISSED_KEY = 'update_dismissed_version';
const UPDATE_APK_FILENAME = 'daily-focus-update.apk';

export interface ReleaseInfo {
  /** Like "2.0.3" (no leading "v"). */
  version: string;
  /** The GitHub release page URL. */
  url: string;
  /** Direct .apk asset URL when attached to the GitHub release. */
  apkUrl: string | null;
  /** APK file size in bytes if reported by GitHub. */
  sizeBytes: number | null;
  /** Release notes markdown/text from the GitHub release body. */
  notes: string;
}

interface DismissedInfo {
  version: string;
  dismissedAt: number;
}

export interface DownloadProgress {
  writtenBytes: number;
  totalBytes: number;
  fraction: number;
}

export type UpdateCheckResult =
  | { status: 'available'; release: ReleaseInfo }
  | { status: 'up-to-date' }
  | { status: 'error'; message: string };

type UpdateModalListener = (release: ReleaseInfo) => void;
const modalListeners = new Set<UpdateModalListener>();

export function subscribeToUpdateModal(listener: UpdateModalListener): () => void {
  modalListeners.add(listener);
  return () => {
    modalListeners.delete(listener);
  };
}

export function triggerUpdateModal(release: ReleaseInfo): void {
  if (Platform.OS === 'android' && release.apkUrl && modalListeners.size > 0) {
    modalListeners.forEach((listener) => listener(release));
    return;
  }
  Linking.openURL(release.apkUrl || release.url).catch(() => {});
}

/** The version this build was made with (app.json "version"). */
export function getCurrentVersion(): string {
  return Constants.expoConfig?.version?.trim() || '0.0.0';
}

function parseVersionParts(raw: string): { core: number[]; hasPreRelease: boolean } {
  const cleaned = raw.trim().replace(/^v/i, '');
  const [mainPart, prePart] = cleaned.split('-', 2);
  const core = mainPart.split('.').map((part) => {
    const m = /^(\d+)/.exec(part.trim());
    return m ? parseInt(m[1], 10) : 0;
  });
  while (core.length < 3) core.push(0);
  return { core, hasPreRelease: Boolean(prePart) };
}

/** Compares "1.2.3"-style versions. Returns >0 if a is newer, <0 if b is newer, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersionParts(a);
  const pb = parseVersionParts(b);
  for (let i = 0; i < Math.max(pa.core.length, pb.core.length); i++) {
    const diff = (pa.core[i] ?? 0) - (pb.core[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (pa.hasPreRelease !== pb.hasPreRelease) {
    return pa.hasPreRelease ? -1 : 1;
  }
  return 0;
}

export function formatMegabytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getApkFileUri(): string | null {
  if (!cacheDirectory) return null;
  return `${cacheDirectory}${UPDATE_APK_FILENAME}`;
}

export async function cleanupDownloadedUpdateApk(): Promise<void> {
  if (Platform.OS === 'web') return;
  const uri = getApkFileUri();
  if (!uri) return;
  try {
    await deleteAsync(uri, { idempotent: true });
  } catch {
    // Best-effort cleanup
  }
}

async function fetchLatestRelease(): Promise<ReleaseInfo> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
    const data = await res.json();
    if (typeof data?.tag_name !== 'string' || typeof data?.html_url !== 'string') {
      throw new Error('Unexpected response from GitHub');
    }

    const assets: any[] = Array.isArray(data.assets) ? data.assets : [];
    const apkAsset = assets.find(
      (asset) =>
        asset &&
        typeof asset.name === 'string' &&
        asset.name.toLowerCase().endsWith('.apk') &&
        typeof asset.browser_download_url === 'string'
    );

    return {
      version: data.tag_name.replace(/^v/i, '').trim(),
      url: data.html_url,
      apkUrl: apkAsset ? apkAsset.browser_download_url : null,
      sizeBytes: typeof apkAsset?.size === 'number' && apkAsset.size > 0 ? apkAsset.size : null,
      notes: typeof data.body === 'string' ? data.body.trim() : '',
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Asks GitHub for the latest release and compares it with this build. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const release = await fetchLatestRelease();
    AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => {});
    AsyncStorage.setItem(CACHED_RELEASE_KEY, JSON.stringify(release)).catch(() => {});
    return compareVersions(release.version, getCurrentVersion()) > 0
      ? { status: 'available', release }
      : { status: 'up-to-date' };
  } catch (e) {
    const aborted = e instanceof Error && e.name === 'AbortError';
    return {
      status: 'error',
      message: aborted ? 'The check timed out. Try again later.' : "Couldn't reach GitHub. Check your internet connection.",
    };
  }
}

async function isDismissedForNow(version: string, now: number): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DismissedInfo;
      if (parsed && compareVersions(version, parsed.version) <= 0) {
        return now - parsed.dismissedAt < DISMISS_COOLDOWN_MS;
      }
    }
    // Migrate/respect legacy dismissed version once if no timestamped record exists.
    const legacy = await AsyncStorage.getItem(LEGACY_DISMISSED_KEY);
    if (legacy && compareVersions(version, legacy) <= 0) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Checks for a newer release when opening/resuming the app.
 * - Throttles GitHub API requests to once every 6 hours and caches the latest release.
 * - Reminds again after 24 hours if the user tapped "Later" (or immediately on a newer tag).
 */
export async function autoCheckForUpdate(): Promise<ReleaseInfo | null> {
  try {
    const now = Date.now();
    const currentVersion = getCurrentVersion();

    let cachedRelease: ReleaseInfo | null = null;
    let lastCheck = 0;

    const [rawCached, rawLast] = await Promise.all([
      AsyncStorage.getItem(CACHED_RELEASE_KEY),
      AsyncStorage.getItem(LAST_CHECK_KEY),
    ]);
    if (rawCached) {
      try {
        cachedRelease = JSON.parse(rawCached) as ReleaseInfo;
      } catch {
        cachedRelease = null;
      }
    }
    if (rawLast) {
      lastCheck = Number(rawLast) || 0;
    }

    let candidate = cachedRelease;
    if (!lastCheck || now - lastCheck >= AUTO_CHECK_INTERVAL_MS) {
      const result = await checkForUpdate();
      if (result.status === 'available') {
        candidate = result.release;
      } else if (result.status === 'up-to-date') {
        candidate = null;
      }
    }

    if (!candidate || compareVersions(candidate.version, currentVersion) <= 0) {
      if (cachedRelease && compareVersions(cachedRelease.version, currentVersion) <= 0) {
        await AsyncStorage.multiRemove([CACHED_RELEASE_KEY, DISMISSED_KEY, LEGACY_DISMISSED_KEY]).catch(() => {});
      }
      await cleanupDownloadedUpdateApk();
      return null;
    }

    if (await isDismissedForNow(candidate.version, now)) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
}

/** "Later": hides the popup for 24 hours, then reminds again on reopen. */
export async function dismissUpdate(version: string): Promise<void> {
  const payload: DismissedInfo = { version, dismissedAt: Date.now() };
  await AsyncStorage.multiRemove([LEGACY_DISMISSED_KEY]).catch(() => {});
  await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify(payload)).catch(() => {});
}

export interface UpdateDownloadController {
  start: () => Promise<void>;
  cancel: () => Promise<void>;
}

/** Downloads the release APK with live progress and launches Android's package installer. */
export function createApkUpdateDownloader(
  release: ReleaseInfo,
  onProgress: (progress: DownloadProgress) => void
): UpdateDownloadController {
  let resumable: DownloadResumable | null = null;
  let cancelled = false;

  const start = async () => {
    if (!release.apkUrl) {
      await openUpdateInBrowser(release);
      return;
    }

    const destUri = getApkFileUri();
    if (!destUri) {
      throw new Error('Device cache directory is unavailable.');
    }

    await cleanupDownloadedUpdateApk();

    resumable = createDownloadResumable(release.apkUrl, destUri, {}, (data) => {
      if (cancelled) return;
      const expected =
        data.totalBytesExpectedToWrite > 0 ? data.totalBytesExpectedToWrite : release.sizeBytes ?? 0;
      const fraction = expected > 0 ? Math.min(1, Math.max(0, data.totalBytesWritten / expected)) : 0;
      onProgress({
        writtenBytes: data.totalBytesWritten,
        totalBytes: expected,
        fraction,
      });
    });

    const result = await resumable.downloadAsync();
    if (cancelled) {
      await cleanupDownloadedUpdateApk();
      return;
    }

    if (!result || !result.uri) {
      throw new Error('Download did not complete.');
    }

    if (result.status && (result.status < 200 || result.status >= 300)) {
      await cleanupDownloadedUpdateApk();
      throw new Error(`Download failed with HTTP ${result.status}.`);
    }

    const contentUri = await getContentUriAsync(result.uri);
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      type: 'application/vnd.android.package-archive',
      flags: 1 | 268435456, // FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK
    });
  };

  const cancel = async () => {
    cancelled = true;
    try {
      await resumable?.cancelAsync();
    } catch {
      // Ignore cancel errors if download already ended
    }
    await cleanupDownloadedUpdateApk();
  };

  return { start, cancel };
}

export async function openUpdateInBrowser(release: ReleaseInfo): Promise<void> {
  await Linking.openURL(release.apkUrl || release.url);
}
