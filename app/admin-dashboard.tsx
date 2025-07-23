import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View, TouchableOpacity } from 'react-native';
import { ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

export default function AdminDashboard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
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

      // Ensure user has admin role
      if (userRecord.role !== 'admin') {
        setError('User is not an admin.');
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
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ fontSize: 18, color: '#1976d2', marginTop: 16 }}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Error Alert and fallback UI
  if (error || !user || !user.business_id) {
    Alert.alert('Error', error || (!user ? 'No user found.' : 'Missing business ID.'));
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <Text style={{ fontSize: 20, color: '#c62828', marginBottom: 16 }}>Error: {error || (!user ? 'No user found.' : 'Missing business ID.')}</Text>
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

  // Only render dashboard if user and business_id are present
  return <AdminDashboardScreen onLogout={async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('[Logout] Error signing out:', error);
      }
    } catch (e) {
      console.error('[Logout] Exception during signOut:', e);
    } finally {
      router.replace('/');
    }
  }} user={user} />;
}