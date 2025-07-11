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
      try {
        // Get the authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        console.log('supabase.auth.getUser() result (employee):', { authUser, authError });
        
        if (authError || !authUser) {
          console.log('No authenticated user found, redirecting to login.');
          router.replace('/');
          return;
        }

        // Fetch user record from users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        console.log('User record fetch from users table (employee):', { userRecord, userError });
        
        if (userError || !userRecord) {
          console.log('User not found in users table, redirecting to login.');
          router.replace('/');
          return;
        }

        // Ensure user has employee role
        if (userRecord.role !== 'employee') {
          console.log('User is not an employee, redirecting to login.');
          router.replace('/');
          return;
        }

        setUser(userRecord);
        setLoading(false);
        console.log('Final user object passed to employee dashboard:', userRecord);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.replace('/');
      }
    };
    fetchUser();
  }, [router]);

  if (loading || !user) return null;
  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} user={user} />;
} 