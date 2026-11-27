import React, { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { autoCheckForUpdate, dismissUpdate, getCurrentVersion, ReleaseInfo } from '@/features/updates/update-check';

/** Checks GitHub for a newer release when the app opens (at most once a day) and offers it. */
export const UpdatePrompt: React.FC = () => {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  useEffect(() => {
    // The APK comes from GitHub, so only Android builds check.
    if (Platform.OS !== 'android') return;
    let active = true;
    // Wait a moment so the check doesn't compete with the first sync.
    const timer = setTimeout(async () => {
      const found = await autoCheckForUpdate();
      if (active && found) setRelease(found);
    }, 3000);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (!release) return null;

  return (
    <ConfirmDialog
      visible
      title="Update available"
      message={`Daily Focus ${release.version} is out (you have ${getCurrentVersion()}). Open the download page to see what's new and get the update.`}
      confirmText="Download"
      cancelText="Later"
      variant="info"
      iconName="arrow-down-circle"
      onConfirm={() => {
        Linking.openURL(release.url).catch(() => {});
        setRelease(null);
      }}
      onCancel={() => {
        dismissUpdate(release.version);
        setRelease(null);
      }}
    />
  );
};
