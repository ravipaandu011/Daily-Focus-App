import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  User as FirebaseUser,
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { collection, getDocs, writeBatch } from 'firebase/firestore';
import { auth, db, mapFirebaseAuthError, sendPasswordResetEmail } from '@/lib/firebase';
import { removeGuestData } from '@/utils/remove-guest-data';

/** The Firestore collections that hold a user's data (users/{uid}/...). */
const USER_COLLECTIONS = ['todos', 'notes'];

/** Deletes every document the user has in Firestore. */
async function deleteCloudData(uid: string): Promise<void> {
  for (const name of USER_COLLECTIONS) {
    const colRef = collection(db, 'users', uid, name);
    // Repeat until empty, in case a queued offline change lands while deleting.
    for (let pass = 0; pass < 3; pass++) {
      const snap = await getDocs(colRef);
      if (snap.empty) break;
      for (let i = 0; i < snap.docs.length; i += 450) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 450).forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
    }
  }
}

/** Deletes everything this account stored on the phone (tasks, notes, bins, sync queues). */
async function deleteLocalData(uid: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.includes(`_user_${uid}_`)));
  } catch (e) {
    console.warn('Could not remove local data for deleted account', e);
  }
}

export interface AppUser {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  /** Permanently deletes the account and all its data. Needs the password to confirm. */
  deleteAccount: (password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(fbUser: FirebaseUser | null): AppUser | null {
  if (!fbUser) return null;
  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    email: fbUser.email,
    displayName: fbUser.displayName,
  };
}

/** Keeps the same user object when only the token was refreshed, so screens don't reload. */
function sameUser(prev: AppUser | null, next: AppUser | null): AppUser | null {
  if (
    prev &&
    next &&
    prev.id === next.id &&
    prev.email === next.email &&
    prev.displayName === next.displayName
  ) {
    return prev;
  }
  return next;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // While signing up, auth events are ignored: a new account is not signed in automatically.
  const isSigningUpRef = useRef(false);

  const applyUser = useCallback((next: AppUser | null) => {
    setUser((prev) => sameUser(prev, next));
  }, []);

  // Restore the persisted Firebase session, then follow sign-in / sign-out / token refresh.
  useEffect(() => {
    let isMounted = true;
    removeGuestData(); // leftovers from the old guest mode

    const unsubscribe = onAuthStateChanged(
      auth,
      (fbUser) => {
        if (!isMounted || isSigningUpRef.current) return;
        applyUser(toAppUser(fbUser));
        setIsLoading(false);
      },
      (error) => {
        console.error('Error observing Firebase auth state', error);
        if (isMounted) setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [applyUser]);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    isSigningUpRef.current = true;
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName?.trim();
      if (name) {
        await updateProfile(credential.user, { displayName: name });
      }
      // The user signs in themselves afterwards, so drop the session sign-up created.
      await firebaseSignOut(auth);
      return { error: null };
    } catch (err) {
      return { error: mapFirebaseAuthError(err) };
    } finally {
      isSigningUpRef.current = false;
    }
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        applyUser(toAppUser(credential.user));
        return { error: null };
      } catch (err) {
        return { error: mapFirebaseAuthError(err) };
      }
    },
    [applyUser]
  );

  const sendPasswordReset = useCallback((email: string) => sendPasswordResetEmail(email), []);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Sign out error', e);
    }
    applyUser(null);
  }, [applyUser]);

  const deleteAccount = useCallback(
    async (password: string) => {
      const current = auth.currentUser;
      if (!current || !current.email) return { error: new Error('You are not signed in.') };
      const uid = current.uid;
      try {
        // Firebase only deletes accounts that signed in recently, so confirm the password first.
        await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, password));
      } catch (err) {
        return { error: mapFirebaseAuthError(err) };
      }
      try {
        await deleteCloudData(uid);
        await deleteUser(current);
      } catch (err) {
        console.error('Delete account error', err);
        return {
          error: new Error("Couldn't delete your account. Check your internet connection and try again."),
        };
      }
      applyUser(null);
      await deleteLocalData(uid);
      return { error: null };
    },
    [applyUser]
  );

  const value = useMemo(
    () => ({ user, isLoading, signUp, signIn, sendPasswordReset, signOut, deleteAccount }),
    [user, isLoading, signUp, signIn, sendPasswordReset, signOut, deleteAccount]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
