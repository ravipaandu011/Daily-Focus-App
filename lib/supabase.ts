import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as QueryParams from 'expo-auth-session/build/QueryParams';

// Ensure browser redirects are properly completed on mobile & web
WebBrowser.maybeCompleteAuthSession();

const SUPABASE_URL = 'https://sjyncjrviweliwemgjww.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U-A7l0gVrRjqJG9SOW3JyQ_O6N4jeeS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/**
 * Helper to safely extract parameters from URL query strings or hash fragments
 */
function extractParamFromUrl(url: string, paramName: string): string | null {
  try {
    // Check hash fragment first (#access_token=...)
    if (url.includes('#')) {
      const hashPart = url.split('#')[1];
      const match = hashPart.match(new RegExp(`(?:^|&)${paramName}=([^&]*)`));
      if (match) return decodeURIComponent(match[1]);
    }
    // Check query params (?code=...)
    if (url.includes('?')) {
      const queryPart = url.split('?')[1]?.split('#')[0];
      const match = queryPart.match(new RegExp(`(?:^|&)${paramName}=([^&]*)`));
      if (match) return decodeURIComponent(match[1]);
    }
  } catch {}
  return null;
}

/**
 * Creates a session from an OAuth callback URL.
 * Handles both Supabase PKCE flow (?code=...) and Implicit flow (#access_token=...&refresh_token=...).
 */
export async function createSessionFromUrl(url: string) {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      return { error: new Error(errorCode) };
    }

    // 1. PKCE Flow (Authorization Code Exchange)
    const code = params.code || extractParamFromUrl(url, 'code');
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { error };
      return { data, error: null };
    }

    // 2. Implicit Flow (Tokens in query or hash fragment)
    let accessToken = params.access_token || extractParamFromUrl(url, 'access_token');
    let refreshToken = params.refresh_token || extractParamFromUrl(url, 'refresh_token');

    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) return { error };
      return { data, error: null };
    }

    return { error: new Error('No valid tokens or authorization code found in callback URL') };
  } catch (err: any) {
    console.error('Error creating session from URL:', err);
    return { error: err };
  }
}

/**
 * Initiates social OAuth login (Google)
 * using Supabase OAuth and Expo WebBrowser with deep linking.
 */
export async function signInWithSocialOAuth(provider: 'google' = 'google') {
  try {
    // 1. Web Platform handling
    if (Platform.OS === 'web') {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
        },
      });
      return { error };
    }

    // 2. Native Mobile Platform (iOS / Android)
    const redirectTo = Linking.createURL('');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      if (
        error.message?.toLowerCase().includes('not enabled') ||
        error.message?.toLowerCase().includes('unsupported provider')
      ) {
        return {
          error: new Error(
            'Google Sign-In is not enabled yet in your Supabase Auth dashboard. Please enable Google provider in your Supabase project or use Email & Password below.'
          ),
        };
      }
      return { error };
    }

    if (!data?.url) {
      return { error: new Error('No OAuth URL returned from Supabase') };
    }

    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      redirectTo,
      { showInRecents: true }
    );

    if (result.type === 'success' && result.url) {
      const { error: sessionError } = await createSessionFromUrl(result.url);
      if (sessionError) return { error: sessionError };
    } else if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: null };
    }

    return { error: null };
  } catch (err: any) {
    console.error(`OAuth error for provider ${provider}:`, err);
    return { error: err };
  }
}

/**
 * Sends a password reset email via Supabase Auth
 */
export async function sendPasswordResetEmail(email: string) {
  try {
    const redirectTo = Linking.createURL('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    return { error };
  } catch (err: any) {
    return { error: err };
  }
}
