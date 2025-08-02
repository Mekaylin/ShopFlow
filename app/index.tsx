
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View, Image } from 'react-native';
import LoginScreen from './screens/LoginScreen';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Auto-navigate based on auth state
    if (!loading && user && userProfile) {
      setRedirecting(true);
      const timer = setTimeout(() => {
        if (userProfile.role === 'admin') {
          router.replace('/admin-dashboard');
        } else {
          router.replace('/employee-dashboard');
        }
      }, 500); // Small delay to show loading state
      
      return () => clearTimeout(timer);
    }
  }, [user, userProfile, loading, router]);

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
          {redirecting ? 'Welcome back!' : 'Loading ShopFlow...'}
        </Text>
        <Text style={{ 
          fontSize: 14, 
          color: 'rgba(255,255,255,0.8)', 
          marginTop: 8,
          textAlign: 'center'
        }}>
          {redirecting ? 'Redirecting to your dashboard' : 'Initializing your workspace'}
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
