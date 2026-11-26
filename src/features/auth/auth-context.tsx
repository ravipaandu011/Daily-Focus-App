import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase, sendPasswordResetEmail, createSessionFromUrl } from '@/lib/supabase';
import { removeGuestData } from '@/utils/remove-guest-data';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Keeps the same user object when only the token was refreshed, so screens don't reload. */
function sameUser(prev: User | null, next: User | null): User | null {
  if (prev && next && prev.id === next.id && prev.updated_at === next.updated_at) return prev;
  return next;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // While signing up, auth events are ignored: a new account is not signed in automatically.
  const isSigningUpRef = useRef(false);

  const applySession = useCallback((next: Session | null) => {
    setSession(next);
    setUser((prev) => sameUser(prev, next?.user ?? null));
  }, []);

  // Restore the saved session, then follow sign-in / sign-out / token refresh.
  useEffect(() => {
    let isMounted = true;
    removeGuestData(); // leftovers from the old guest mode

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) applySession(data.session);
      })
      .catch((e) => console.error('Error fetching auth session', e))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!isMounted || isSigningUpRef.current) return;
      applySession(newSession);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // Password-reset links from email (PKCE ?code=...). Links carrying raw tokens are ignored.
  useEffect(() => {
    const handleDeepLink = async ({ url }: { url: string }) => {
      if (!url || !url.includes('code=')) return;
      try {
        const { data, error } = await createSessionFromUrl(url);
        if (!error && data?.session) applySession(data.session);
      } catch (err) {
        console.error('Error handling auth deep link:', err);
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleDeepLink({ url: initialUrl });
    });

    return () => linkSubscription.remove();
  }, [applySession]);


  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      isSigningUpRef.current = true;
      try {
        const name = displayName?.trim();
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: name ? { data: { full_name: name, display_name: name } } : {},
        });
        if (error) return { error };
        // The user signs in themselves afterwards, so drop any session sign-up created.
        if (data.session) await supabase.auth.signOut({ scope: 'local' });
        return { error: null };
      } catch (e: any) {
        return { error: e };
      } finally {
        isSigningUpRef.current = false;
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) return { error };
        applySession(data.session);
        return { error: null };
      } catch (e: any) {
        return { error: e };
      }
    },
    [applySession]
  );


  const sendPasswordReset = useCallback((email: string) => sendPasswordResetEmail(email), []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error', e);
    }
    applySession(null);
  }, [applySession]);

  const value = useMemo(
    () => ({ user, session, isLoading, signUp, signIn, sendPasswordReset, signOut }),
    [user, session, isLoading, signUp, signIn, sendPasswordReset, signOut]
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
