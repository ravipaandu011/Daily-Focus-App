import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

/** The app is shared through this repo's GitHub releases. */
const LATEST_RELEASE_API = 'https://api.github.com/repos/ravipaandu011/Daily-Focus-App/releases/latest';
const REQUEST_TIMEOUT_MS = 8000;
/** The automatic check runs at most once a day. */
const AUTO_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

const LAST_CHECK_KEY = 'update_last_check_at';
const DISMISSED_VERSION_KEY = 'update_dismissed_version';

export interface ReleaseInfo {
  /** Like "2.0.2" (no leading "v"). */
  version: string;
  /** The release page: notes plus the APK download. */
  url: string;
}

export type UpdateCheckResult =
  | { status: 'available'; release: ReleaseInfo }
  | { status: 'up-to-date' }
  | { status: 'error'; message: string };

/** The version this build was made with (app.json "version"). */
export function getCurrentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

/** Compares "1.2.3"-style versions. Returns >0 if a is newer, <0 if b is newer, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  const pb = b.replace(/^v/i, '').split('.').map((p) => parseInt(p, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
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
    return { version: data.tag_name.replace(/^v/i, ''), url: data.html_url };
  } finally {
    clearTimeout(timer);
  }
}

/** Asks GitHub for the latest release and compares it with this build. */
export async function checkForUpdate(): Promise<UpdateCheckResult> {
  try {
    const release = await fetchLatestRelease();
    AsyncStorage.setItem(LAST_CHECK_KEY, String(Date.now())).catch(() => {});
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

/**
 * The quiet check run when the app opens: at most once a day, and it never reports a
 * version the user already said "Later" to. Returns the release to offer, or null.
 */
export async function autoCheckForUpdate(): Promise<ReleaseInfo | null> {
  try {
    const last = Number(await AsyncStorage.getItem(LAST_CHECK_KEY));
    if (last && Date.now() - last < AUTO_CHECK_INTERVAL_MS) return null;

    const result = await checkForUpdate();
    if (result.status !== 'available') return null;

    const dismissed = await AsyncStorage.getItem(DISMISSED_VERSION_KEY);
    if (dismissed && compareVersions(result.release.version, dismissed) <= 0) return null;
    return result.release;
  } catch {
    return null;
  }
}

/** "Later": don't offer this version again automatically (Settings can still find it). */
export async function dismissUpdate(version: string): Promise<void> {
  await AsyncStorage.setItem(DISMISSED_VERSION_KEY, version).catch(() => {});
}
