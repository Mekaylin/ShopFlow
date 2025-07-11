import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { getSession, supabase } from '../services/cloud.js';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [restoring, setRestoring] = useState(true);
  const router = useRouter();

  // Add browser back button handler for web
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPopState = (e: PopStateEvent) => {
      // If router.canGoBack() is true, go back in app navigation
      if (router.canGoBack && router.canGoBack()) {
        router.back();
      } else {
        // Prevent exiting the app/root
        e.preventDefault();
        window.history.pushState(null, '', window.location.pathname);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [router]);

  useEffect(() => {
    let didFetch = false;
    let timeoutId;
    const restoreSession = async () => {
      try {
        const stored = await getSession('supabase-session');
        if (stored && !didFetch) {
          didFetch = true;
          const session = JSON.parse(stored);
          await supabase.auth.setSession(session);
          
          // Only fetch essential data: role and business_id
          // const userData = await fetchUserData(session.user.id);
          
          // if (userData) {
          //   const role = userData.role;
          //   const businessId = userData.business_id;
            
          //   // Only check for critical issues, don't block startup
          //   if (role === 'user' || !role) {
          //     console.warn('User has default role, will prompt later');
          //   }
          //   if (!businessId) {
          //     console.warn('User has no business_id, will prompt later');
          //   }
            
          //   console.log('Session restore: user role =', role);
            
          //   // Redirect immediately based on role
          //   if (role === 'admin') {
          //     router.replace('/admin-dashboard');
          //   } else if (role === 'employee') {
          //     router.replace('/employee-dashboard');
          //   } else {
          //     // Default fallback
          //     router.replace('/');
          //   }
          // } else {
          //   console.warn('Session restore: user not found in users table.');
          //   // Still redirect to main app, let individual screens handle missing data
          //   router.replace('/');
          // }
        }
      } catch (err) {
        console.error('Error during session restore:', err);
      } finally {
        setRestoring(false);
      }
    };
    
    // Timeout fallback: never get stuck on loading
    timeoutId = setTimeout(() => {
      console.warn('Session restore timeout: forcing app to load.');
      setRestoring(false);
    }, 5000); // Reduced from 8s to 5s
    
    restoreSession();
    return () => clearTimeout(timeoutId);
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

  if (!loaded || restoring) {
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
        </Head>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style="auto" />
          {/* <Stack.Screen name="+loading" options={{ headerShown: false }} /> */}
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
      </Head>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" options={{ title: 'Welcome to ShopFlow' }} />
          <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </>
  );
}