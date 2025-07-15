import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // Get the authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          setError(authError?.message || 'No authenticated user found.');
          router.replace('/');
          setLoading(false);
          return;
        }

        // Fetch user record from users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (userError || !userRecord) {
          setError(userError?.message || 'User not found in users table.');
          router.replace('/');
          setLoading(false);
          return;
        }

        // Ensure user has employee role
        if (userRecord.role !== 'employee') {
          setError('User is not an employee.');
          router.replace('/');
          setLoading(false);
          return;
        }

        setUser(userRecord);
        setLoading(false);
      } catch (error: any) {
        setError(error?.message || 'Error fetching user.');
        router.replace('/');
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  // Loading overlay
  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <Text style={{ fontSize: 20, color: '#222', marginBottom: 16 }}>Loading...</Text>
      </View>
    );
  }

  // Error Alert
  if (error) {
    setTimeout(() => { Alert.alert('Error', error); setError(null); }, 100);
    return null;
  }

  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} />;
}