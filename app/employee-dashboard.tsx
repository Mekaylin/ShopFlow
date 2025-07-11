import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log('supabase.auth.getUser() result (employee):', { data, error });
      if (error || !data?.user) {
        console.log('No authenticated user found, redirecting to login.');
        router.replace('/');
        return;
      }
      // Fetch user record from users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      console.log('User record fetch from users table (employee):', { users, userError });
      if (userError || !users) {
        console.log('User not found in users table, redirecting to login.');
        router.replace('/');
        return;
      }
      setUser(users);
      setLoading(false);
      console.log('Final user object passed to employee dashboard:', users);
    };
    fetchUser();
  }, [router]);

  if (loading || !user) return null;
  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} user={user} />;
} 