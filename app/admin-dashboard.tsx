import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      console.log('supabase.auth.getUser() result:', { data, error });
      if (error || !data?.user) {
        console.log('No authenticated user found, redirecting to login.');
        router.replace('/'); // Redirect to login if not authenticated
        return;
      }
      // Fetch user record from users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();
      console.log('User record fetch from users table:', { users, userError });
      if (userError || !users) {
        console.log('User not found in users table, redirecting to login.');
        router.replace('/');
        return;
      }
      setUser(users);
      setLoading(false);
      console.log('Final user object passed to dashboard:', users);
    };
    fetchUser();
  }, [router]);

  if (loading || !user) return null;
  return <AdminDashboardScreen onLogout={() => router.replace('/')} user={user} />;
} 