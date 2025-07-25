
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import LoginScreen from './screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch user role
          const { data: userRow } = await supabase.from('users').select('role').eq('id', user.id).single();
          if (userRow?.role === 'admin') {
            router.replace('/admin-dashboard');
            return;
          }
        }
      } catch (e) {
        // Ignore errors, show login
      }
      setCheckingAuth(false);
    };
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ fontSize: 18, color: '#1976d2', marginTop: 16 }}>Checking authentication...</Text>
      </View>
    );
  }

  return <LoginScreen />;
}
