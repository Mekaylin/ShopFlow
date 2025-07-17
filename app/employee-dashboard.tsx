import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import EmployeeDashboardScreen from './screens/EmployeeDashboardScreen';

// This layout now allows both 'admin' and 'employee' roles to access the employee dashboard
export default function EmployeeDashboardLayout({ children }: { children: React.ReactNode }) {
  // No role-based redirect; both admin and employee can access
  return children;
}