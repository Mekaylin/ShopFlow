import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Sentry, getSession, initSentry, supabase } from '../services/cloud.js';

initSentry();

export default Sentry.wrap(function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [restoring, setRestoring] = useState(true);
  const router = useRouter();

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
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <StatusBar style="auto" />
        {/* <Stack.Screen name="+loading" options={{ headerShown: false }} /> */}
        <></>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="index" options={{ title: 'Welcome to ShopFlow' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
});