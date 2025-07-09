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

// Lookup business by code for employee login
export async function getBusinessByCode(code) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('code', code)
    .single();
  if (error || !data) return null;
  return data;
}

// Get business code by business_id
export async function getBusinessCode(business_id) {
  const { data, error } = await supabase
    .from('businesses')
    .select('code')
    .eq('id', business_id)
    .single();
  if (error || !data) return null;
  return data.code;
}

// Update business code by business_id
export async function updateBusinessCode(business_id, code) {
  const { data, error } = await supabase
    .from('businesses')
    .update({ code })
    .eq('id', business_id)
    .select('code')
    .single();
  if (error || !data) throw new Error(error.message);
  return data.code;
}

// Generate a random business code (6 uppercase alphanumeric)
export function generateBusinessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Fetch employee code by employee_id
export async function getEmployeeCode(employee_id) {
  const { data, error } = await supabase
    .from('employees')
    .select('code')
    .eq('id', employee_id)
    .single();
  if (error || !data) return null;
  return data.code;
}

export { SecureStore, Sentry, supabase };
