import React, { useState } from 'react';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import TestSupabaseScreen from '../screens/TestSupabaseScreen';

export default function AppNavigator() {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [showTest, setShowTest] = useState(false);

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
