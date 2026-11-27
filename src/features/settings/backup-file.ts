import { Directory, File } from 'expo-file-system';
import { getTodayKey } from '@/utils/date';

export type SaveBackupResult = { status: 'saved'; fileName: string } | { status: 'canceled' } | { status: 'error'; message: string };
export type OpenBackupResult = { status: 'opened'; text: string } | { status: 'canceled' } | { status: 'error'; message: string };

/** True when the user backed out of the system picker (it rejects instead of returning). */
function isCancel(e: unknown): boolean {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return msg.includes('cancel');
}

/**
 * Lets the user pick a folder (for example Documents) and saves the backup there as
 * daily-focus-backup-YYYY-MM-DD.json. Android adds " (1)" if that name already exists.
 */
export async function saveBackupToFile(json: string): Promise<SaveBackupResult> {
  let folder: Directory;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (e) {
    if (isCancel(e)) return { status: 'canceled' };
    return { status: 'error', message: "Couldn't open the folder picker." };
  }
  if (!folder) return { status: 'canceled' };

  try {
    const file = folder.createFile(`daily-focus-backup-${getTodayKey()}`, 'application/json');
    await file.write(json);
    return { status: 'saved', fileName: file.name };
  } catch {
    return {
      status: 'error',
      message: "Couldn't save the file in that folder. Try another folder, such as Documents.",
    };
  }
}

/** Opens the system file picker and reads the chosen backup file as text. */
export async function openBackupFile(): Promise<OpenBackupResult> {
  try {
    // Phones label .json files inconsistently (application/json, text/plain or
    // application/octet-stream), so allow any file and let the parser check it.
    const picked = await File.pickFileAsync({ mimeTypes: '*/*' });
    if (picked.canceled || !picked.result) return { status: 'canceled' };
    return { status: 'opened', text: await picked.result.text() };
  } catch (e) {
    if (isCancel(e)) return { status: 'canceled' };
    return { status: 'error', message: "Couldn't read that file." };
  }
}
