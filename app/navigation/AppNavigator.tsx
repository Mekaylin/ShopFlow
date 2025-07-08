import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import TestSupabaseScreen from '../screens/TestSupabaseScreen';

export default function AppNavigator() {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [showTest, setShowTest] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // On mount, check for existing session and restore role
    async function restoreSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch user role from users table
        const { data: users, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .limit(1);
        if (!error && users && users.length > 0) {
          const userRole = users[0].role;
          if (userRole === 'admin' || userRole === 'employee') {
            setRole(userRole);
          }
        }
      }
      setLoading(false);
    }
    restoreSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, session?.user?.email);
      
      if (event === 'SIGNED_IN' && session?.user) {
        // User signed in - fetch their role
        const { data: users, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .limit(1);
        if (!error && users && users.length > 0) {
          const userRole = users[0].role;
          if (userRole === 'admin' || userRole === 'employee') {
            setRole(userRole);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // User signed out
        setRole(null);
        // Clear stored session
        await SecureStore.deleteItemAsync('supabase-session');
      }
    });

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return null; // Or a splash/loading screen
  }

  if (showTest) {
    return <TestSupabaseScreen onBack={() => setShowTest(false)} />;
  }

  if (!role) {
    return <LoginScreen onLogin={setRole} onTest={() => setShowTest(true)} />;
  }

  if (role === 'employee') {
    return <EmployeeDashboardScreen onLogout={() => setRole(null)} />;
  }

  if (role === 'admin') {
    return <AdminDashboardScreen onLogout={() => setRole(null)} />;
  }

  return null;
}
