import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Load fonts with error handling
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();
  // Prevent repeated redirects
  const hasRedirectedRef = React.useRef(false);

  // Add browser back button handler for web
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPopState = (e: PopStateEvent) => {
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router]);

  // Bulletproof session restore with complete user data, with detailed error handling
  useEffect(() => {
    let isMounted = true;

    const fetchUserData = async (authUser: any) => {
      if (!isMounted) return;
      try {
        if (!authUser || !authUser.id) {
          console.error('[fetchUserData] No authUser or authUser.id provided:', authUser);
          setUser(null);
          return;
        }
        // Fetch complete user record from users table
        const { data: userRecord, error: userError, status, statusText } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (!isMounted) return;
        if (userError) {
          console.error('[fetchUserData] Supabase error fetching user:', {
            userError,
            status,
            statusText,
            authUserId: authUser.id
          });
          setUser(null);
          return;
        }
        if (!userRecord) {
          console.warn('[fetchUserData] No user record found for id:', authUser.id);
          setUser(null);
          return;
        }
        setUser(userRecord);
        // Route based on user role - only redirect if not already on the correct route
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const currentPath = window.location.pathname || '';
          if (!hasRedirectedRef.current) {
            if (userRecord.role === 'admin' && !currentPath.includes('admin-dashboard')) {
              hasRedirectedRef.current = true;
              router.replace('/admin-dashboard');
            } else if (userRecord.role === 'employee' && !currentPath.includes('employee-dashboard')) {
              hasRedirectedRef.current = true;
              router.replace('/employee-dashboard');
            } else if (userRecord.role !== 'admin' && userRecord.role !== 'employee') {
              console.error('[fetchUserData] Invalid user role:', userRecord.role);
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.error('[fetchUserData] Exception thrown:', error, 'for authUser:', authUser);
        if (isMounted) setUser(null);
      }
    };

    // Auth state change listener
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      // Reset redirect guard on auth state change
      hasRedirectedRef.current = false;
      try {
        console.log('[onAuthStateChange] Event:', event, 'Session user:', session?.user?.id);
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          setUser(null);
          // On logout, force redirect to login page
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.location.pathname !== '/') {
              hasRedirectedRef.current = true;
              router.replace('/');
            }
          }
        }
      } catch (err) {
        console.error('[onAuthStateChange] Exception:', err, 'Event:', event, 'Session:', session);
        setUser(null);
      }
      setChecking(false);
    });

    // Initial session check - only do this once
    supabase.auth.getSession().then(async ({ data: { session }, error: sessionError }) => {
      if (!isMounted) return;
      // Reset redirect guard on initial check
      hasRedirectedRef.current = false;
      try {
        if (sessionError) {
          console.error('[getSession] Error fetching session:', sessionError);
        }
        console.log('[getSession] Initial session check:', session?.user?.id || 'No session');
        if (session?.user) {
          await fetchUserData(session.user);
        } else {
          setUser(null);
          // Redirect to login page if not already there
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            if (window.location.pathname !== '/') {
              hasRedirectedRef.current = true;
              router.replace('/');
            }
          }
        }
      } catch (err) {
        console.error('[getSession] Exception:', err, 'Session:', session);
        setUser(null);
      }
      setChecking(false);
    }).catch((err) => {
      console.error('[getSession] Promise rejection:', err);
      setUser(null);
      setChecking(false);
    });

    return () => {
      isMounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [router]);

  // Register service worker for PWA (web only)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js').catch(err => {
          console.warn('Service worker registration failed:', err);
        });
      });
    }
  }, []);

  if (!loaded && !error) {
    return (
      <>
        <Head>
          <title>ShopFlow - Loading...</title>
          <meta name="description" content="ShopFlow: Cloud-based business management for teams. Fast, modern, and mobile-friendly." />
          <meta name="theme-color" content="#1976d2" />
        </Head>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          {/* Loading screen - fonts not loaded yet */}
          <></>
        </ThemeProvider>
      </>
    );
  }

  if (checking) {
    return (
      <>
        <Head>
          <title>ShopFlow - Cloud Business Dashboard</title>
          <meta name="description" content="ShopFlow: Cloud-based business management for teams. Fast, modern, and mobile-friendly." />
          <meta name="theme-color" content="#1976d2" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon.png" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <link rel="stylesheet" href="/styles.css" />
        </Head>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colorScheme === 'dark' ? '#181a20' : '#f5f6fa' }}>
            <Text style={{ fontSize: 20, color: colorScheme === 'dark' ? '#fff' : '#222', marginBottom: 16 }}>Loading...</Text>
            <ActivityIndicator size="large" color="#1976d2" />
          </View>
        </ThemeProvider>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>ShopFlow - Cloud Business Dashboard</title>
        <meta name="description" content="ShopFlow: Cloud-based business management for teams. Fast, modern, and mobile-friendly." />
        <meta name="theme-color" content="#1976d2" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <link rel="stylesheet" href="/styles.css" />
      </Head>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: 'Welcome to ShopFlow' }} />
          <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="employee-dashboard" options={{ headerShown: false }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </>
  );
}