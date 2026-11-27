import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import * as firebaseAuth from 'firebase/auth';
import type { Auth, Persistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyDpdMHwYDSDLDjMpTYsTWylqeCMxTFuCZU',
  authDomain: 'daily-focus-5dbcc.firebaseapp.com',
  projectId: 'daily-focus-5dbcc',
  storageBucket: 'daily-focus-5dbcc.firebasestorage.app',
  messagingSenderId: '314650007438',
  appId: '1:314650007438:web:dfd40a0d9910ea35c976df',
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

function createAuth(): Auth {
  if (Platform.OS === 'web') {
    return firebaseAuth.getAuth(app);
  }

  const getRnPersistence = (
    firebaseAuth as unknown as {
      getReactNativePersistence?: (storage: typeof AsyncStorage) => Persistence;
    }
  ).getReactNativePersistence;

  try {
    return getRnPersistence
      ? firebaseAuth.initializeAuth(app, {
          persistence: getRnPersistence(AsyncStorage),
        })
      : firebaseAuth.getAuth(app);
  } catch {
    return firebaseAuth.getAuth(app);
  }
}

export const auth = createAuth();
export const db = getFirestore(app);

export function mapFirebaseAuthError(err: unknown): Error {
  const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return new Error('Incorrect email or password. Please try again.');
    case 'auth/email-already-in-use':
      return new Error('An account with this email already exists.');
    case 'auth/invalid-email':
      return new Error('Please enter a valid email address.');
    case 'auth/weak-password':
      return new Error('Password must be at least 6 characters.');
    case 'auth/too-many-requests':
      return new Error('Too many attempts. Please wait a moment and try again.');
    case 'auth/network-request-failed':
      return new Error('Network error. Please check your internet connection.');
    default:
      if (err instanceof Error) return err;
      return new Error('Authentication failed. Please try again.');
  }
}

/**
 * Sends a password reset email via Firebase Auth.
 */
export async function sendPasswordResetEmail(email: string): Promise<{ error: Error | null }> {
  try {
    await firebaseAuth.sendPasswordResetEmail(auth, email.trim());
    return { error: null };
  } catch (err) {
    return { error: mapFirebaseAuthError(err) };
  }
}
