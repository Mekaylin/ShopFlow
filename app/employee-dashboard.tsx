import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabase';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get the authenticated user
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setError(authError?.message || 'No authenticated user found.');
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
        setLoading(false);
        return;
      }

      // Allow both admin and employee roles
      if (userRecord.role !== 'employee' && userRecord.role !== 'admin') {
        setError('User is not an employee or admin.');
        setLoading(false);
        return;
      }

      setUser(userRecord);
      setLoading(false);
    } catch (error: any) {
      setError(error?.message || 'Error fetching user.');
      setLoading(false);
    }
  };

  useEffect(() => {
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
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <Text style={{ fontSize: 20, color: '#c62828', marginBottom: 16 }}>Error: {error}</Text>
        <Text style={{ color: '#888', marginBottom: 8 }}>Please try again or contact support.</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 18 }}
          onPress={fetchUser}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading || !user) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ fontSize: 18, color: '#1976d2', marginTop: 16 }}>Loading your dashboard...</Text>
      </View>
    );
  }

  return <EmployeeDashboardScreen onLogout={() => router.replace('/')} user={user} />;
}