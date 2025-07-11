import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import LoginScreen from './screens/LoginScreen';

// Helper functions for cross-platform session storage
const getSession = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  } else {
    return await SecureStore.getItemAsync(key);
  }
};
const setSession = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
};

export default function Index() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const stored = await getSession('supabase-session');
        console.log('Stored session:', stored);
        if (stored) {
          const session = JSON.parse(stored);
          await supabase.auth.setSession(session);
          // Fetch user role and redirect
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .limit(1);
          console.log('User fetch result:', users, userError);
          if (users && users.length > 0) {
            const role = users[0].role;
            console.log('Redirecting to dashboard for role:', role);
            if (role === 'admin') router.replace('/admin-dashboard');
            else if (role === 'employee') router.replace('/employee-dashboard');
            return;
          } else {
            setError('User not found or missing role.');
          }
        }
      } catch (e) {
        setError('Error during session check: ' + (e instanceof Error ? e.message : JSON.stringify(e)));
      }
      setChecking(false);
    };
    checkSession();
  }, [router]);

  if (checking) return null;
  if (error) return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>{error}</Text></View>;

  return <LoginScreen onLogin={(role) => {
    if (role === 'admin') router.replace('/admin-dashboard');
    else if (role === 'employee') router.replace('/employee-dashboard');
  }} />;
}
