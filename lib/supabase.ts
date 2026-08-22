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
 * Creates a session from an OAuth callback URL.
 * Uses expo-auth-session QueryParams to reliably parse hash fragments.
 */
export async function createSessionFromUrl(url: string) {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    return { error: new Error(errorCode) };
  }

  const { access_token, refresh_token } = params;

  if (!access_token || !refresh_token) {
    return { error: new Error('Missing tokens in callback URL') };
  }

  const { data, error } = await supabase.auth.setSession({
    access_token,
    refresh_token,
  });

  if (error) return { error };
  return { data, error: null };
}

/**
 * Initiates social OAuth login (Google)
 * using Supabase OAuth and Expo WebBrowser with deep linking.
 */
export async function signInWithSocialOAuth(provider: 'google' = 'google') {
  try {
    // Generate the redirect URL using Expo Linking
    // In Expo Go: exp://xxx.exp.direct (tunnel) or exp://192.168.x.x:8081 (LAN)
    // In standalone build: personaltodoapp://
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
