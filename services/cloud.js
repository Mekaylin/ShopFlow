// services/cloud.js
import * as Sentry from '@sentry/react-native';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Sentry initialization
export const initSentry = () => {
  Sentry.init({
    dsn: 'https://e2148e6f7cde8e2ab9faaab7c171c619@o4509637354586112.ingest.us.sentry.io/4509637358977024',
    sendDefaultPii: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  });
};

// Cross-platform session storage
export const getSession = async (key) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};
export const setSession = async (key, value) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export { SecureStore, Sentry, supabase };
