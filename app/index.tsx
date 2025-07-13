import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import LoginScreen from './screens/LoginScreen';

// Helper functions for cross-platform session storage
export const getSession = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};
export const setSession = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export default function Index() {
  const router = useRouter();

  const handleLogin = (role: 'admin' | 'employee') => {
    console.log('User logged in with role:', role);
    // The LoginScreen now handles all authentication internally
    // This callback is just to confirm successful login
  };

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) {
        alert('Supabase connection failed: ' + error.message);
      } else {
        alert('Supabase connection successful!');
      }
    } catch (error: any) {
      alert('Connection test failed: ' + error.message);
    }
  };

  return (
    <LoginScreen 
      onLogin={handleLogin} 
      setSession={setSession}
      onTest={testSupabaseConnection}
    />
  );
}
