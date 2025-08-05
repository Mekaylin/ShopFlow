// contexts/AuthContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User } from '@supabase/supabase-js';
import React, { createContext, ReactNode, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, View, Text } from 'react-native';
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
  }, []);

  // Get session from Supabase and restore user state
  useEffect(() => {
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('[AuthContext] getSession result:', { session, error });
        if (error) {
          console.error('Error getting session:', error);
          setUser(null);
          setUserProfile(null);
        } else if (session?.user) {
          setUser(session.user);
          await fetchUserProfile(session.user.id);
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Error getting session:', error);
        setUser(null);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getSession();
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          // Prevent unnecessary state updates for token refresh
          if (event === 'TOKEN_REFRESHED') {
            // For token refresh, only update profile if user changed
            setUser(prevUser => {
              if (!prevUser || prevUser.id !== session.user.id) {
                fetchUserProfile(session.user.id);
                return session.user;
              }
              // User is the same, no need to refetch profile for token refresh
              return prevUser;
            });
          } else {
            // For other events (SIGNED_IN, etc.), update user and fetch profile
            setUser(session.user);
            await fetchUserProfile(session.user.id);
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
  }, [fetchUserProfile]);

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
        <View style={{ backgroundColor: '#fffbe6', padding: 16, borderRadius: 8, margin: 16 }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold', textAlign: 'center' }}>{sessionError}</Text>
        </View>
      )}
      {children}
    </AuthContext.Provider>
  );
};
