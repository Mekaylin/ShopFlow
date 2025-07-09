import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { Sentry, getSession, initSentry, supabase } from '../services/cloud.js';

useEffect(() => { initSentry(); }, []);

export default Sentry.wrap(function RootLayout() {
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
    const restoreSession = async () => {
      const stored = await getSession('supabase-session');
      if (stored) {
        const session = JSON.parse(stored);
        await supabase.auth.setSession(session);
        // Fetch user role and redirect
        const { data: users } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .limit(1);
        if (users && users.length > 0) {
          const role = users[0].role;
          if (role === 'admin') router.replace('/admin-dashboard');
          else if (role === 'employee') router.replace('/employee-dashboard');
        }
      }
      setRestoring(false);
    };
    restoreSession();
  }, [router]);

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
        <meta name="apple-mobile-web-app-capable" content="yes" />
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
});