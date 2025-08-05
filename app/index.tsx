
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from './screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading } = useAuth();
  // Debug log for auth state
  console.log('[Index] loading:', loading, 'user:', !!user, 'userProfile:', !!userProfile, 'role:', userProfile?.role);
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirected = useRef(false);
  const [showDebugButton, setShowDebugButton] = useState(false);

  // Show debug button after 5 seconds if still redirecting
  useEffect(() => {
    if (redirecting) {
      const debugTimer = setTimeout(() => {
        setShowDebugButton(true);
      }, 5000);
      
      // Also reset redirecting state after 10 seconds to prevent infinite stuck state
      const resetTimer = setTimeout(() => {
        console.log('[Index] Resetting redirecting state after timeout');
        setRedirecting(false);
        hasRedirected.current = false;
      }, 10000);
      
      return () => {
        clearTimeout(debugTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [redirecting]);

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
        
        console.log('[Index] Redirecting user to dashboard, role:', userProfile.role);
        
        const timer = setTimeout(() => {
          try {
            const targetRoute = userProfile.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
            console.log('[Index] Navigating to:', targetRoute, 'Platform:', Platform.OS);
            
            // Use different navigation methods based on platform
            if (Platform.OS === 'web') {
              router.replace(targetRoute);
            } else {
              // For mobile, try both replace and push as fallback
              router.replace(targetRoute);
              // Additional fallback for mobile
              setTimeout(() => {
                if (hasRedirected.current && !router.canGoBack()) {
                  console.log('[Index] Mobile fallback navigation');
                  router.push(targetRoute);
                }
              }, 1000);
            }
          } catch (error) {
            console.error('[Index] Navigation error:', error);
            // Fallback navigation attempt
            setTimeout(() => {
              const fallbackRoute = userProfile.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
              router.push(fallbackRoute);
            }, 500);
          }
        }, Platform.OS === 'web' ? 300 : 500); // Longer delay for mobile
        
        return () => clearTimeout(timer);
      } 
      // If no profile after 3 seconds, default to employee dashboard to avoid infinite loading
      else {
        const fallbackTimer = setTimeout(() => {
          if (!userProfile && !hasRedirected.current) {
            console.log('[Index] No profile after 3s, defaulting to employee dashboard');
            hasRedirected.current = true;
            setRedirecting(true);
            setTimeout(() => {
              try {
                router.replace('/employee-dashboard');
              } catch (error) {
                console.error('[Index] Fallback navigation error:', error);
                router.push('/employee-dashboard');
              }
            }, 300);
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
      setShowDebugButton(false);
    }
  }, [user, loading]);

  // Additional mobile-specific navigation handler
  const handleManualNavigation = () => {
    console.log('[Index] Manual navigation triggered, userProfile:', userProfile);
    hasRedirected.current = false;
    setRedirecting(false);
    setShowDebugButton(false);
    
    // Force navigation with longer delay for mobile
    setTimeout(() => {
      const targetRoute = userProfile?.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
      console.log('[Index] Forcing navigation to:', targetRoute);
      
      if (Platform.OS === 'web') {
        router.replace(targetRoute);
      } else {
        // For mobile, use push instead of replace
        router.push(targetRoute);
      }
    }, 100);
  };

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
        {showDebugButton && (
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 20,
              paddingVertical: 10,
              borderRadius: 8,
            }}
            onPress={handleManualNavigation}
          >
            <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>
              Continue Manually
            </Text>
          </TouchableOpacity>
        )}
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
