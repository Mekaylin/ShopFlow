import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import Head from 'expo-router/head';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Global error boundary for navigation crashes
class NavigationErrorBoundary extends React.Component<
  { children: React.ReactNode }, 
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    console.error('[NavigationErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('[NavigationErrorBoundary] Navigation error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <Text style={{ fontSize: 20, color: '#c62828', marginBottom: 16, textAlign: 'center' }}>
            Navigation Error
          </Text>
          <Text style={{ color: '#666', marginBottom: 24, textAlign: 'center' }}>
            Something went wrong while navigating. Please reload the app.
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#1976d2', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.location.reload();
              } else {
                this.setState({ hasError: false, error: null });
              }
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>
              {Platform.OS === 'web' ? 'Reload Page' : 'Try Again'}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  const onLayoutRootView = useCallback(async () => {
    if (loaded || error) {
      await SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  useEffect(() => {
    if (loaded || error) {
      onLayoutRootView();
    }
  }, [loaded, error, onLayoutRootView]);

  if (!loaded && !error) {
    return null;
  }

  return (
    <NavigationErrorBoundary>
      <AuthProvider>
        <Head>
          <title>ShopFlow - Cloud Business Dashboard</title>
          <meta name="description" content="ShopFlow: Cloud-based business management for teams. Fast, modern, and mobile-friendly." />
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="theme-color" content="#1976d2" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/icon.png" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="format-detection" content="telephone=no" />
          <link rel="stylesheet" href="/styles.css" />
          <script src="/spa-router.js" defer></script>
        </Head>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack 
            initialRouteName="index"
            screenOptions={{ 
              headerShown: false,
              // Enable SPA-style navigation for web
              ...(Platform.OS === 'web' && {
                presentation: 'card',
                animation: 'none'
              })
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="index" options={{ title: 'Welcome to ShopFlow', headerShown: false }} />
            <Stack.Screen name="admin-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="employee-dashboard" options={{ headerShown: false }} />
            <Stack.Screen name="license-scanner" options={{ headerShown: false }} />
            <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" options={{ title: 'Page Not Found', headerShown: true }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </AuthProvider>
    </NavigationErrorBoundary>
  );
}