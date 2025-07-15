import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

export default function AdminDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
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
          setLoading(false);
          setTimeout(() => router.replace('/'), 100);
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
          setLoading(false);
          setTimeout(() => router.replace('/'), 100);
          return;
        }

        // Ensure user has admin role
        if (userRecord.role !== 'admin') {
          setError('User is not an admin.');
          setLoading(false);
          setTimeout(() => router.replace('/'), 100);
          return;
        }

        setUser(userRecord);
        setLoading(false);
      } catch (error: any) {
        setError(error?.message || 'Error fetching user.');
        setLoading(false);
        setTimeout(() => router.replace('/'), 100);
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

  return <AdminDashboardScreen onLogout={() => router.replace('/')} user={user} />;
}