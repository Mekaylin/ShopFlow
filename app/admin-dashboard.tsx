import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { logNavigation, logNavigationError, getCurrentRoute } from '../utils/navigationDebug';
import AdminDashboardScreen from './screens/AdminDashboardScreen';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, userProfile, loading: authLoading, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);

  console.log('[AdminDashboard] Component mounted/updated:', {
    user: !!user,
    userProfile: !!userProfile,
    userRole: userProfile?.role,
    businessId: userProfile?.business_id,
    authLoading,
    error
  });

  // Redirect if not authenticated or not an admin
  useEffect(() => {
    // Add a small delay on web platforms to avoid navigation conflicts
    const checkAccess = async () => {
      console.log('[AdminDashboard] Access check starting:', {
        authLoading,
        user: !!user,
        userProfile: !!userProfile,
        userRole: userProfile?.role
      });
      
      if (!authLoading) {
        if (!user) {
          console.log('[AdminDashboard] No user found, redirecting to login');
          // Add delay for web platform compatibility
          await new Promise(resolve => setTimeout(resolve, 100));
          router.replace('/');
          return;
        }
        
        if (!userProfile) {
          console.log('[AdminDashboard] No user profile found');
          setError('Could not load user profile');
          return;
        }
        
        if (userProfile.role !== 'admin') {
          console.log('[AdminDashboard] Access denied, user role:', userProfile.role);
          setError('Access denied: Admin privileges required');
          return;
        }
        
        if (!userProfile.business_id) {
          console.log('[AdminDashboard] No business ID found');
          setError('No business associated with this account');
          return;
        }
        
        console.log('[AdminDashboard] Access check passed successfully');
        setError(null); // Clear any previous errors
      }
    };
    
    checkAccess();
  }, [user, userProfile, authLoading, router]);

  const handleLogout = async () => {
    console.log('[AdminDashboard] Logout initiated');
    try {
      await signOut();
      console.log('[AdminDashboard] Logout successful, redirecting to login');
      router.replace('/');
    } catch (error: any) {
      console.error('[AdminDashboard] Logout error:', error);
      Alert.alert('Error', 'Failed to log out. Please try again.');
    }
  };

  const handleBackToEmployee = async () => {
    console.log('[AdminDashboard] Navigating back to employee dashboard');
    try {
      // Use replace instead of push to avoid navigation stack issues
      logNavigation(getCurrentRoute(), '/employee-dashboard', 'router.replace');
      router.replace('/employee-dashboard');
    } catch (error: any) {
      console.error('[AdminDashboard] Navigation error:', error);
      logNavigationError(getCurrentRoute(), '/employee-dashboard', error);
      Alert.alert('Error', 'Failed to navigate to employee dashboard. Please try again.');
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

  return <AdminDashboardScreen onLogout={handleLogout} onBackToEmployee={handleBackToEmployee} user={userProfile} />;
}