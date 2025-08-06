
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { logPageReload, logNavigation, getNavigationContext } from '../utils/navigationDebug';
import LoginScreen from './screens/LoginScreen';

export default function Index() {
  const router = useRouter();
  const { user, userProfile, loading, refreshSession } = useAuth();
  // Debug log for auth state
  console.log('[Index] loading:', loading, 'user:', !!user, 'userProfile:', !!userProfile, 'role:', userProfile?.role);
  const [redirecting, setRedirecting] = useState(false);
  const hasRedirected = useRef(false);
  const [showDebugButton, setShowDebugButton] = useState(false);

  // Log page reload/load for debugging
  useEffect(() => {
    logPageReload('index');
    console.log('[Index] Navigation context:', getNavigationContext());
  }, []);

  // Show debug button sooner for web platforms if still redirecting
  useEffect(() => {
    if (redirecting) {
      const isWeb = Platform.OS === 'web';
      const debugButtonDelay = isWeb ? 3000 : 5000; // Show sooner for web
      const resetDelay = isWeb ? 8000 : 10000; // Reset sooner for web
      
      const debugTimer = setTimeout(() => {
        setShowDebugButton(true);
      }, debugButtonDelay);
      
      // Also reset redirecting state after timeout to prevent infinite stuck state
      const resetTimer = setTimeout(() => {
        console.log('[Index] Resetting redirecting state after timeout');
        setRedirecting(false);
        hasRedirected.current = false;
      }, resetDelay);
      
      return () => {
        clearTimeout(debugTimer);
        clearTimeout(resetTimer);
      };
    }
  }, [redirecting]);

  // Web session refresh check (desktop and mobile)
  useEffect(() => {
    const isWeb = Platform.OS === 'web';
    const isMobileWeb = isWeb && /Mobi|Android/i.test(navigator.userAgent);
    const isDesktopWeb = isWeb && !/Mobi|Android/i.test(navigator.userAgent);
    
    console.log('[Index] Session refresh check - Platform detection:', { 
      isWeb, 
      isMobileWeb, 
      isDesktopWeb,
      userAgent: isWeb ? navigator.userAgent : 'N/A'
    });
    
    if (isWeb && !loading && !user) {
      console.log('[Index] Web platform detected, checking for stored session...');
      
      // Check for the specific Supabase auth key pattern
      const supabaseProjectRef = 'qdfhklikmkyeqsiuapjg'; // From our Supabase URL
      const authTokenKey = `sb-${supabaseProjectRef}-auth-token`;
      const hasSpecificAuth = localStorage.getItem(authTokenKey) !== null;
      
      // Also check for any sb-* auth token pattern as fallback
      const hasSupabaseAuth = Object.keys(localStorage).some(key => 
        key.startsWith('sb-') && key.includes('-auth-token')
      );
      
      console.log('[Index] Auth token check:', { 
        hasSpecificAuth, 
        hasSupabaseAuth, 
        authTokenKey,
        allStorageKeys: Object.keys(localStorage).filter(k => k.startsWith('sb-')),
        platform: { isMobileWeb, isDesktopWeb }
      });
      
      if (hasSpecificAuth || hasSupabaseAuth) {
        console.log('[Index] Found stored session, attempting refresh for', isDesktopWeb ? 'desktop' : 'mobile', 'web...');
        refreshSession();
      } else {
        console.log('[Index] No stored auth tokens found on', isDesktopWeb ? 'desktop' : 'mobile', 'web');
      }
    }
  }, [loading, user, refreshSession]);

  useEffect(() => {
    // Prevent multiple redirections
    if (hasRedirected.current) {
      console.log('[Index] Redirect already in progress, skipping...');
      return;
    }

    // Auto-navigate based on auth state - be more lenient about profile loading
    if (!loading && user) {
      console.log('[Index] User found, checking profile for navigation...', {
        user: !!user,
        userProfile: !!userProfile,
        userRole: userProfile?.role,
        hasRedirected: hasRedirected.current
      });
      
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
              logNavigation('index', targetRoute, 'router.replace');
              router.replace(targetRoute);
            } else {
              // For mobile, try both replace and push as fallback
              logNavigation('index', targetRoute, 'router.replace');
              router.replace(targetRoute);
              // Additional fallback for mobile
              setTimeout(() => {
                if (hasRedirected.current && !router.canGoBack()) {
                  console.log('[Index] Mobile fallback navigation');
                  logNavigation('index', targetRoute, 'router.push-fallback');
                  router.push(targetRoute);
                }
              }, 1000);
            }
          } catch (error) {
            console.error('[Index] Navigation error:', error);
            // Fallback navigation attempt
            setTimeout(() => {
              const fallbackRoute = userProfile.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
              console.log('[Index] Attempting fallback navigation to:', fallbackRoute);
              logNavigation('index', fallbackRoute, 'router.push-error-fallback');
              router.push(fallbackRoute);
            }, 500);
          }
        }, Platform.OS === 'web' ? 300 : 500); // Longer delay for mobile
        
        return () => clearTimeout(timer);
      } 
      // If no profile after timeout, default to employee dashboard to avoid infinite loading
      else {
        const isMobileWeb = Platform.OS === 'web' && /Mobi|Android/i.test(navigator.userAgent);
        const isDesktopWeb = Platform.OS === 'web' && !/Mobi|Android/i.test(navigator.userAgent);
        
        // Use differentiated timeouts for better user experience
        let fallbackTimeout = 3000; // Default/native
        if (isMobileWeb) {
          fallbackTimeout = 1500; // Mobile web - shortest for responsiveness
        } else if (isDesktopWeb) {
          fallbackTimeout = 2500; // Desktop web - balanced timeout
        }
        
        console.log('[Index] Setting fallback timer with timeout:', fallbackTimeout, 'ms for platform:', { 
          isMobileWeb, 
          isDesktopWeb, 
          isNative: Platform.OS !== 'web'
        });
        
        const fallbackTimer = setTimeout(() => {
          if (!userProfile && !hasRedirected.current) {
            console.log('[Index] No profile after timeout, navigating to fallback dashboard...');
            console.log('[Index] Platform detection for fallback:', { isMobileWeb, isDesktopWeb, fallbackTimeout });
            
            // For all web platforms, be more aggressive about navigation to prevent stuck loading
            if (isMobileWeb || isDesktopWeb || !userProfile) {
              console.log('[Index] Web platform or no profile, navigating to employee dashboard');
              hasRedirected.current = true;
              setRedirecting(true);
              setTimeout(() => {
                try {
                  router.replace('/employee-dashboard');
                } catch (error) {
                  console.error('[Index] Fallback navigation error:', error);
                  logNavigation('index', '/employee-dashboard', 'router.push-final-fallback');
                  router.push('/employee-dashboard');
                }
              }, 300);
            }
          }
        }, fallbackTimeout);
        
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

  // Enhanced navigation handler for all platforms
  const handleManualNavigation = async () => {
    console.log('[Index] Manual navigation triggered, userProfile:', userProfile);
    console.log('[Index] Current auth state:', { user: !!user, userProfile: !!userProfile, loading });
    
    // Platform detection for manual navigation
    const isWeb = Platform.OS === 'web';
    const isMobileWeb = isWeb && /Mobi|Android/i.test(navigator.userAgent);
    const isDesktopWeb = isWeb && !/Mobi|Android/i.test(navigator.userAgent);
    
    // For web debugging, log all localStorage keys
    if (isWeb) {
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(k => k.includes('supabase') || k.startsWith('sb-'));
      console.log('[Index] Manual navigation - localStorage debug:', {
        allKeys: allKeys.length,
        supabaseKeys,
        platform: { isMobileWeb, isDesktopWeb }
      });
      
      // Check specific patterns
      supabaseKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log('[Index] Auth key:', key, 'Value length:', value?.length || 0);
      });
    }
    
    hasRedirected.current = false;
    setRedirecting(false);
    setShowDebugButton(false);
    
    // For all web platforms, try refreshing the session first if no user
    if (isWeb && !user) {
      console.log('[Index] Web platform manual navigation, refreshing session...');
      await refreshSession();
      return;
    }
    
    // If user exists, navigate immediately
    if (user && userProfile) {
      const targetRoute = userProfile.role === 'admin' ? '/admin-dashboard' : '/employee-dashboard';
      console.log('[Index] Manual navigation to:', targetRoute);
      router.replace(targetRoute);
    }
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
              {Platform.OS === 'web' 
                ? (/Mobi|Android/i.test(navigator.userAgent) ? 'Refresh & Continue' : 'Continue')
                : 'Continue Manually'
              }
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
