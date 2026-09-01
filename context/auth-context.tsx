import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase, signInWithSocialOAuth, sendPasswordResetEmail, createSessionFromUrl } from '@/lib/supabase';

const GUEST_MODE_KEY = '@personal_todo_is_guest_mode';

export type SocialProvider = 'google';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  displayName: string;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithSocial: (provider: SocialProvider) => Promise<{ error: Error | null }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
  promptAuthModal: () => void;
  isAuthModalVisible: boolean;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isAuthModalVisible, setIsAuthModalVisible] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const guestStored = await AsyncStorage.getItem(GUEST_MODE_KEY);
        const isGuestStored = guestStored === 'true';

        const { data } = await supabase.auth.getSession();
        if (isMounted) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          // Only enable guest mode if not logged in and explicitly chosen
          if (!data.session?.user && isGuestStored) {
            setIsGuest(true);
          } else if (data.session?.user) {
            setIsGuest(false);
          }
          setIsLoading(false);
        }
      } catch (e) {
        console.error('Error fetching auth session', e);
        if (isMounted) setIsLoading(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (isMounted) {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          setIsGuest(false);
          AsyncStorage.setItem(GUEST_MODE_KEY, 'false').catch(() => {});
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Listen for incoming deep link URLs (for OAuth callbacks from Supabase)
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      try {
        const url = event.url;
        if (!url) return;
        // Only handle URLs that look like OAuth callbacks
        if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=') || url.includes('error=')) {
          const { data, error } = await createSessionFromUrl(url);
          if (!error && data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            setIsGuest(false);
            AsyncStorage.setItem(GUEST_MODE_KEY, 'false').catch(() => {});
          }
        }
      } catch (err) {
        console.error('Error handling auth deep link:', err);
      }
    };

    const linkSubscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) handleDeepLink({ url: initialUrl });
    });

    return () => {
      linkSubscription.remove();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    try {
      const trimmedEmail = email.trim();
      const options: { data?: { full_name?: string; display_name?: string } } = {};
      if (displayName && displayName.trim()) {
        options.data = {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
        };
      }

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options,
      });

      if (error) return { error };

      if (data.session) {
        setUser(data.user);
        setSession(data.session);
        setIsGuest(false);
        await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
      }
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) return { error };
      setUser(data.user);
      setSession(data.session);
      setIsGuest(false);
      await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }, []);

  const signInWithSocial = useCallback(async (provider: SocialProvider) => {
    try {
      const { error } = await signInWithSocialOAuth(provider);
      if (error) return { error };
      setIsGuest(false);
      await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    return await sendPasswordResetEmail(email);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error', e);
    }
    setUser(null);
    setSession(null);
    setIsGuest(false);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
  }, []);

  const continueAsGuest = useCallback(async () => {
    setIsGuest(true);
    setIsAuthModalVisible(false);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'true');
  }, []);

  const exitGuestMode = useCallback(async () => {
    setIsGuest(false);
    await AsyncStorage.setItem(GUEST_MODE_KEY, 'false');
  }, []);

  const promptAuthModal = useCallback(() => {
    setIsAuthModalVisible(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalVisible(false);
  }, []);

  const displayName = useMemo(() => {
    if (!user) return isGuest ? 'Guest User' : 'Anonymous';
    return (
      user.user_metadata?.full_name ||
      user.user_metadata?.display_name ||
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User'
    );
  }, [user, isGuest]);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isGuest,
      displayName,
      signUp,
      signIn,
      signInWithSocial,
      sendPasswordReset,
      signOut,
      continueAsGuest,
      exitGuestMode,
      promptAuthModal,
      isAuthModalVisible,
      closeAuthModal,
    }),
    [
      user,
      session,
      isLoading,
      isGuest,
      displayName,
      signUp,
      signIn,
      signInWithSocial,
      sendPasswordReset,
      signOut,
      continueAsGuest,
      exitGuestMode,
      promptAuthModal,
      isAuthModalVisible,
      closeAuthModal,
    ]
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

