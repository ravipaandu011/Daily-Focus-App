import { Platform, Vibration } from 'react-native';
import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';

const CHIME_AUDIO_URL =
  'https://actions.google.com/sounds/v1/alarms/beep_short.ogg';

let cachedPlayer: any = null;
let alarmIntervalId: ReturnType<typeof setInterval> | null = null;

// Play single high-clarity multi-tone completion chime
export async function playTimerCompleteSound(): Promise<void> {
  try {
    // 1. Trigger rhythmic success haptic vibrations
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 180);
      setTimeout(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 350);

      // 2. Play audio tone on mobile native
      try {
        if (!cachedPlayer) {
          cachedPlayer = createAudioPlayer({
            uri: CHIME_AUDIO_URL,
          });
        }
        cachedPlayer.seekTo(0);
        cachedPlayer.play();
      } catch (nativeErr) {
        console.warn('Native audio playback error:', nativeErr);
      }
    } else if (typeof window !== 'undefined') {
      // 3. Web Audio API playback for web browsers
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        // 4-note ascending chime: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.5Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const startTime = ctx.currentTime + idx * 0.14;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      }
    }
  } catch (err) {
    console.warn('Could not play timer sound:', err);
  }
}

// Start continuous alarm chime loop until user explicitly stops / resets
export function startTimerAlarmLoop(): void {
  // Stop any existing loop
  stopTimerAlarmLoop();

  // Start continuous rhythmic vibration pattern on physical device
  if (Platform.OS !== 'web') {
    Vibration.vibrate([0, 500, 400, 500, 400, 500], true);
  }

  // Play immediately
  playTimerCompleteSound();

  // Repeat alarm tone every 1.6 seconds continuously
  alarmIntervalId = setInterval(() => {
    playTimerCompleteSound();
  }, 1600);
}

// Stop continuous alarm chime loop
export function stopTimerAlarmLoop(): void {
  if (Platform.OS !== 'web') {
    try {
      Vibration.cancel();
    } catch (_) {}
  }
  if (alarmIntervalId) {
    clearInterval(alarmIntervalId);
    alarmIntervalId = null;
  }
  if (cachedPlayer) {
    try {
      cachedPlayer.pause();
    } catch (_) {}
  }
}
