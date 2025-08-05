
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Text, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  // Debug log for auth state
  console.log('[Index] loading:', loading, 'user:', user, 'userProfile:', userProfile);
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirections
    if (hasRedirected.current) {
      return;
    }

    // Auto-navigate based on auth state - be more lenient about profile loading
    if (!loading && user) {
      // If we have a userProfile, use it for role-based routing
      if (userProfile) {
        hasRedirected.current = true;
        setRedirecting(true);
        
        const timer = setTimeout(() => {
          if (userProfile.role === 'admin') {
            router.replace('/admin-dashboard');
          } else {
            router.replace('/employee-dashboard');
          }
        }, 300); // Reduced delay for faster UX
        
        return () => clearTimeout(timer);
      } 
      // If no profile after 3 seconds, default to employee dashboard to avoid infinite loading
      else {
        const fallbackTimer = setTimeout(() => {
          if (!userProfile && !hasRedirected.current) {
            console.log('[Index] No profile after 3s, defaulting to employee dashboard');
            hasRedirected.current = true;
            setRedirecting(true);
            setTimeout(() => router.replace('/employee-dashboard'), 300);
          }
        }, 3000);
        
        return () => clearTimeout(fallbackTimer);
      }
    }
  }, [loading, user?.id, userProfile?.id, userProfile?.role, router]);

  // Reset redirect flag when user logs out
  useEffect(() => {
    if (!user && !loading) {
      hasRedirected.current = false;
      setRedirecting(false);
    }
  }, [user, loading]);

  if (loading || redirecting) {
    return (
      <View style={{ 
        flex: 1, 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#1976d2',
        paddingHorizontal: 20
      }}>
        <Image 
          source={require('../assets/images/icon.png')} 
          style={{ width: 120, height: 120, marginBottom: 30, borderRadius: 60 }}
          resizeMode="cover"
        />
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={{ 
          fontSize: 18, 
          color: '#ffffff', 
          marginTop: 16, 
          fontWeight: '600',
          textAlign: 'center'
        }}>
          {redirecting ? 'Welcome back!' : user ? 'Loading profile...' : 'Loading ShopFlow...'}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: 'rgba(255,255,255,0.8)', 
          marginTop: 8,
          textAlign: 'center'
        }}>
          {redirecting ? 'Redirecting to your dashboard' : user ? 'Getting your workspace ready' : 'Initializing your workspace'}
        </Text>
      </View>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return <LoginScreen />;
  }

  // Show loading while getting user profile
  return (
    <View style={{ 
      flex: 1, 
      alignItems: 'center', 
      justifyContent: 'center', 
      backgroundColor: '#1976d2',
      paddingHorizontal: 20
    }}>
      <Image 
        source={require('../assets/images/icon.png')} 
        style={{ width: 120, height: 120, marginBottom: 30, borderRadius: 60 }}
        resizeMode="cover"
      />
      <ActivityIndicator size="large" color="#ffffff" />
      <Text style={{ 
        fontSize: 18, 
        color: '#ffffff', 
        marginTop: 16, 
        fontWeight: '600',
        textAlign: 'center'
      }}>
        Loading profile...
      </Text>
      <Text style={{ 
        fontSize: 14, 
        color: 'rgba(255,255,255,0.8)', 
        marginTop: 8,
        textAlign: 'center'
      }}>
        Setting up your workspace
      </Text>
    </View>
  );
}
