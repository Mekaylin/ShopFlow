import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
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
  return <LoginScreen onLogin={() => {}} />;
}
