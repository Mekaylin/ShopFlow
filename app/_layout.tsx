import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
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

  // Bulletproof session restore with complete user data
  useEffect(() => {
    let isMounted = true;
    
    const fetchUserData = async (authUser: any) => {
      if (!isMounted) return;
      
      try {
        // Fetch complete user record from users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
          
        console.log('User record fetch from users table (layout):', { userRecord, userError });
        
        if (!isMounted) return;
        
        if (userError || !userRecord) {
          console.log('User not found in users table, logging out.');
          setUser(null);
          return;
        }

        // Set complete user object with business_id and role
        setUser(userRecord);
        console.log('Complete user object set in layout:', userRecord);
        
        // Route based on user role - only redirect if not already on the correct route
        const currentPath = Platform.OS === 'web' ? (window?.location?.pathname || '') : '';
        if (userRecord.role === 'admin' && !currentPath.includes('admin-dashboard')) {
          router.replace('/admin-dashboard');
        } else if (userRecord.role === 'employee' && !currentPath.includes('employee-dashboard')) {
          router.replace('/employee-dashboard');
        } else if (userRecord.role !== 'admin' && userRecord.role !== 'employee') {
          console.log('Invalid user role, logging out.');
          setUser(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        if (isMounted) setUser(null);
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;
      
      console.log('Auth state change event:', event, session?.user?.id);
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        setUser(null);
      }
      setChecking(false);
    });

    // Initial session check - only do this once
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      
      console.log('Initial session check:', session?.user?.id || 'No session');
      if (session?.user) {
        await fetchUserData(session.user);
      } else {
        setUser(null);
      }
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
          {/* Loading screen */}
          <></>
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