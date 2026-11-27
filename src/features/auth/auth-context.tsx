import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from 'firebase/auth';
import { auth, mapFirebaseAuthError, sendPasswordResetEmail } from '@/lib/firebase';
import { removeGuestData } from '@/utils/remove-guest-data';

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

  const value = useMemo(
    () => ({ user, isLoading, signUp, signIn, sendPasswordReset, signOut }),
    [user, isLoading, signUp, signIn, sendPasswordReset, signOut]
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
