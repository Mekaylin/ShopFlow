
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
    return null; // Or a loading spinner if you prefer
  }

  return <LoginScreen />;
}
