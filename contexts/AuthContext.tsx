// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  userProfile: any | null;
  loading: boolean;
  darkMode: boolean;
  signOut: () => Promise<void>;
  setDarkMode: (value: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Web-compatible storage wrapper
const storageWrapper = {
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  },
  
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
    }
  }
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Load dark mode preference from storage
  useEffect(() => {
    const loadDarkMode = async () => {
      try {
        const stored = await storageWrapper.getItem('darkMode');
        if (stored !== null) {
          setDarkModeState(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading dark mode preference:', error);
      }
    };
    loadDarkMode();
  }, []);

  // Save dark mode preference to storage
  const setDarkMode = async (value: boolean) => {
    try {
      setDarkModeState(value);
      await storageWrapper.setItem('darkMode', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving dark mode preference:', error);
    }
  };

  // Fetch user profile from the users table
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      // Prevent fetching the same profile multiple times
      if (userProfile && userProfile.id === userId) {
        console.log('[AuthContext] Profile already loaded for user:', userId);
        return;
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      console.log('[AuthContext] fetchUserProfile result:', { data, error });
      if (error || !data) {
        console.error('Error fetching user profile or user not found:', error);
        setUserProfile(null);
        setSessionError('Session expired or user not found. Please log in again.');
        // Also sign out to clear invalid session
        await supabase.auth.signOut();
        setUser(null);
      } else {
        console.log('[AuthContext] User profile fetched successfully:', data);
        setUserProfile(data);
        setSessionError(null);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      setSessionError('Session expired or user not found. Please log in again.');
      await supabase.auth.signOut();
      setUser(null);
    }
  }, [userProfile]);

  // Get session from Supabase and restore user state, with loading timeout and retry
  const getSessionWithRetry = useCallback(async (maxRetries = 2) => {
    let attempt = 0;
    let lastError = null;
    setLoading(true);
    setSessionError(null);
    while (attempt <= maxRetries) {
      let didTimeout = false;
      const timeout = setTimeout(() => {
        didTimeout = true;
        setLoading(false);
        setSessionError('Session check timed out. Please refresh or log in again.');
        console.warn('[AuthContext] getSession timed out after 7 seconds');
      }, 7000);
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log(`[AuthContext] getSession attempt ${attempt + 1}:`, { session, error });
        if (didTimeout) return;
        if (error) {
          lastError = error;
          setUser(null);
          setUserProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
          setSessionError(null);
          clearTimeout(timeout);
          setLoading(false);
          return;
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        if (didTimeout) return;
        lastError = error;
        setUser(null);
        setUserProfile(null);
      } finally {
        if (!didTimeout) {
          clearTimeout(timeout);
        }
      }
      attempt++;
      if (attempt <= maxRetries) {
        console.warn(`[AuthContext] getSession retrying... (${attempt})`);
        await new Promise(res => setTimeout(res, 1000));
      }
    }
    setLoading(false);
    setSessionError('Failed to restore session. Please log in again.');
    if (lastError) console.error('[AuthContext] getSession final error:', lastError);
  }, [fetchUserProfile]);

  useEffect(() => {
    getSessionWithRetry(3);
  }, [getSessionWithRetry, retryCount]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          const currentUserId = session.user.id;
          
          // Check if this is a new user or we don't have their profile yet
          const shouldFetchProfile = !userProfile || userProfile.id !== currentUserId;
          
          if (event === 'TOKEN_REFRESHED') {
            // For token refresh, only update user if it's different
            setUser(prevUser => {
              if (!prevUser || prevUser.id !== currentUserId) {
                if (shouldFetchProfile) {
                  fetchUserProfile(currentUserId);
                }
                return session.user;
              }
              return prevUser;
            });
          } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // For sign in or initial session, always update user and fetch profile if needed
            setUser(session.user);
            if (shouldFetchProfile) {
              await fetchUserProfile(currentUserId);
            }
          } else {
            // For other events, update user but be careful about profile fetching
            setUser(session.user);
            if (shouldFetchProfile) {
              await fetchUserProfile(currentUserId);
            }
          }
        } else {
          setUser(null);
          setUserProfile(null);
          
          // Clear stored session data on sign out
          if (event === 'SIGNED_OUT') {
            try {
              if (Platform.OS === 'web') {
                localStorage.removeItem('supabase.auth.token');
              } else {
                await AsyncStorage.removeItem('supabase.auth.token');
              }
            } catch (error) {
              console.error('Error clearing stored session:', error);
            }
          }
        }
        
        // Only set loading to false for events other than token refresh
        if (event !== 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile]); // Removed userProfile from dependencies

  // Sign out function
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      } else {
        setUser(null);
        setUserProfile(null);
        // Clear any stored session data
        try {
          if (Platform.OS === 'web') {
            localStorage.removeItem('supabase.auth.token');
          } else {
            await AsyncStorage.removeItem('supabase.auth.token');
          }
        } catch (error) {
          console.error('Error clearing stored session data:', error);
        }
      }
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    userProfile,
    loading,
    darkMode,
    signOut,
    setDarkMode,
  };

  return (
    <AuthContext.Provider value={value}>
      {sessionError && (
        <View style={{ backgroundColor: '#fffbe6', padding: 16, borderRadius: 8, margin: 16, alignItems: 'center' }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>{sessionError}</Text>
          <TouchableOpacity
            style={{ backgroundColor: '#1976d2', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 }}
            onPress={() => setRetryCount(c => c + 1)}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {children}
    </AuthContext.Provider>
  );
};
