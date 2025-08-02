import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get environment variables with web compatibility
const getEnvVar = (name: string): string | undefined => {
  // For web, try process.env first (from webpack DefinePlugin)
  if (Platform.OS === 'web' && typeof process !== 'undefined' && process.env) {
    return process.env[name];
  }
  
  // For native platforms, use Constants from Expo
  return Constants.expoConfig?.extra?.[name] || (Constants.manifest as any)?.extra?.[name];
};

const supabaseUrl = getEnvVar('EXPO_PUBLIC_SUPABASE_URL') || 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseAnonKey = getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmhrbGlrbWt5ZXFzaXVhcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTgxNTQsImV4cCI6MjA2NzM5NDE1NH0.peZxjF2MbN9kBg4VVpQoSGjQblSTa24z4s0iiWqHfxA';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your app config.');
}

// Typed Supabase client for type safety across the app
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'shopflow-final',
    },
  },
});