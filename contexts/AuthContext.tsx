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
        return userProfile;
      }
      
      console.log('[AuthContext] Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
        
      console.log('[AuthContext] fetchUserProfile result:', { data, error });
      if (error || !data) {
        console.error('Error fetching user profile or user not found:', error);
        setUserProfile(null);
        // Don't immediately sign out on profile fetch error - user might not be in users table yet
        setSessionError('User profile not found. Please contact administrator.');
        return null;
      } else {
        console.log('[AuthContext] User profile fetched successfully:', data);
        setUserProfile(data);
        setSessionError(null);
        return data;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
      setSessionError('Failed to load user profile. Please try again.');
      return null;
    }
  }, [userProfile]);

  // Simplified session check with faster timeout and fewer retries
  const getInitialSession = useCallback(async () => {
    console.log('[AuthContext] Getting initial session...');
    setLoading(true);
    setSessionError(null);
    
    try {
      // Use a promise race to implement timeout
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      );
      
      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any;
      
      console.log('[AuthContext] Initial session result:', { session: !!session, error });
      
      if (error) {
        console.error('[AuthContext] Session error:', error);
        setUser(null);
        setUserProfile(null);
      } else if (session?.user) {
        setUser(session.user);
        // Fetch profile asynchronously without blocking the loading state
        fetchUserProfile(session.user.id);
      } else {
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to get session:', error);
      setUser(null);
      setUserProfile(null);
      if ((error as Error)?.message === 'Session check timeout') {
        setSessionError('Connection slow. Please refresh if login doesn\'t complete.');
      }
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]);

  useEffect(() => {
    getInitialSession();
  }, [getInitialSession]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.id);
        
        if (session?.user) {
          const currentUserId = session.user.id;
          
          // Only fetch profile if we don't have it or it's for a different user
          const shouldFetchProfile = !userProfile || userProfile.id !== currentUserId;
          
          setUser(session.user);
          
          // Fetch profile asynchronously for certain events
          if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && shouldFetchProfile) {
            fetchUserProfile(currentUserId);
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
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchUserProfile, userProfile?.id]); // Only depend on profile ID, not entire profile

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
            onPress={() => {
              setSessionError(null);
              getInitialSession();
            }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      {children}
    </AuthContext.Provider>
  );
};
