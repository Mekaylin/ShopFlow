import { useColorScheme } from '@/hooks/useColorScheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

// Centralized layout: only check for authentication, not role
export default function AppLayout({ children }: { children: React.ReactNode }) {
  // No role-based redirect; only check for authentication
  // (If you want to restrict to authenticated users, add logic here)
  return children;
}