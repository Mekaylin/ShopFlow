import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import React, { useState } from 'react';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import EmployeeDashboardScreen from '../screens/EmployeeDashboardScreen';
import LoginScreen from '../screens/LoginScreen';
import TestSupabaseScreen from '../screens/TestSupabaseScreen';

export type RootStackParamList = {
  Login: undefined;
  AdminDashboard: undefined;
  EmployeeDashboard: undefined;
  TestSupabase: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  const [role, setRole] = useState<'admin' | 'employee' | null>(null);
  const [showTest, setShowTest] = useState(false);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!role ? (
          <Stack.Screen name="Login">
            {props => <LoginScreen {...props} onLogin={setRole} onTest={() => setShowTest(true)} />}
          </Stack.Screen>
        ) : role === 'admin' ? (
          <Stack.Screen name="AdminDashboard">
            {props => <AdminDashboardScreen {...props} onLogout={() => setRole(null)} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="EmployeeDashboard">
            {props => <EmployeeDashboardScreen {...props} onLogout={() => setRole(null)} />}
          </Stack.Screen>
        )}
        {showTest && (
          <Stack.Screen name="TestSupabase">
            {props => <TestSupabaseScreen {...props} onBack={() => setShowTest(false)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
