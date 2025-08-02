import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/');
        return;
      }
      
      if (!userProfile) {
        setError('Could not load user profile');
        return;
      }
      
      if (userProfile.role !== 'admin') {
        setError('Access denied: Admin privileges required');
        return;
      }
      
      if (!userProfile.business_id) {
        setError('No business associated with this account');
        return;
      }
    }
  }, [user, userProfile, authLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error: any) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  if (authLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ fontSize: 18, color: '#1976d2', marginTop: 16 }}>Loading your dashboard...</Text>
      </View>
    );
  }

  if (error || !user || !userProfile || userProfile.role !== 'admin' || !userProfile.business_id) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f6fa' }}>
        <Text style={{ fontSize: 20, color: '#c62828', marginBottom: 16 }}>
          Error: {error || 'Access denied'}
        </Text>
        <Text style={{ color: '#888', marginBottom: 8 }}>Please try logging in again.</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24, marginTop: 18 }}
          onPress={handleLogout}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold' }}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AdminDashboardScreen onLogout={handleLogout} user={userProfile} />;
}