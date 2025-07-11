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
        // Check if user is already authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.log('Auth error:', authError);
          setChecking(false);
          return;
        }

        if (user) {
          console.log('User is authenticated:', user.id);
          
          // Fetch user role from users table
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .limit(1);
            
          console.log('User fetch result:', users, userError);
          
          if (users && users.length > 0) {
            const role = users[0].role;
            console.log('Redirecting to dashboard for role:', role);
            if (role === 'admin') router.replace('/admin-dashboard');
            else if (role === 'employee') router.replace('/employee-dashboard');
            return;
          } else {
            console.log('User not found in users table, redirecting to login');
            setChecking(false);
          }
        } else {
          console.log('No authenticated user found');
          setChecking(false);
        }
      } catch (e) {
        console.error('Error during session check:', e);
        setError('Error during session check: ' + (e instanceof Error ? e.message : JSON.stringify(e)));
        setChecking(false);
      }
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
