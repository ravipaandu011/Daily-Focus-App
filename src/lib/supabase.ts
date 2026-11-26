import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

// Local copy of expo-auth-session's getQueryParams: its `build/QueryParams` path
// is no longer exposed by the package's `exports` map as of SDK 58.
const QueryParams = {
  getQueryParams(input: string): { errorCode: string | null; params: Record<string, string> } {
    const url = new URL(input, 'https://phony.example');
    const errorCode = url.searchParams.get('errorCode');
    url.searchParams.delete('errorCode');
    const params: Record<string, string> = {};
    url.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    if (url.hash) {
      new URLSearchParams(url.hash.replace(/^#/, '')).forEach((value, key) => {
        params[key] = value;
      });
    }
    return { errorCode, params };
  },
};

const SUPABASE_URL = 'https://sjyncjrviweliwemgjww.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_U-A7l0gVrRjqJG9SOW3JyQ_O6N4jeeS';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // No `window` during web static rendering (Node), where AsyncStorage's web impl throws.
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    // PKCE: a sign-in link only works on the device that started the sign-in,
    // so a crafted link cannot sign the user into someone else's account.
    flowType: 'pkce',
  },
});


/**
 * Creates a session from a password-reset link (?code=...), using the PKCE code verifier stored on this device.
 * Links that carry raw tokens are ignored on purpose.
 */
export async function createSessionFromUrl(url: string) {
  try {
    const { params, errorCode } = QueryParams.getQueryParams(url);

    if (errorCode) {
      return { error: new Error(errorCode) };
    }

    const code = params.code;
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) return { error };
      return { data, error: null };
    }

    return { error: new Error('No authorization code found in callback URL') };
  } catch (err: any) {
    console.error('Error creating session from URL:', err);
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
