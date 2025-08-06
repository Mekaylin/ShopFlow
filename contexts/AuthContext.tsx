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
  refreshSession: () => Promise<void>;
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
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(0);

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

  // EMERGENCY: Simplified session check to prevent system crashes and infinite loops
  const getInitialSession = useCallback(async () => {
    // EMERGENCY CIRCUIT BREAKER: Prevent infinite loops
    const now = Date.now();
    if (sessionInitialized && (now - lastSessionCheck < 5000)) {
      console.log('[AuthContext] CIRCUIT BREAKER: Skipping session check - too frequent');
      return;
    }
    
    if (retryCount >= 3) {
      console.log('[AuthContext] CIRCUIT BREAKER: Max retry count reached, stopping');
      setLoading(false);
      return;
    }
    
    console.log('[AuthContext] Getting initial session...');
    setLastSessionCheck(now);
    setLoading(true);
    setSessionError(null);
    
    try {
      // EMERGENCY: Use simple session check without complex platform detection that could cause crashes
      const { data: { session }, error } = await supabase.auth.getSession();
      
      console.log('[AuthContext] Session result:', { 
        hasSession: !!session, 
        hasUser: !!session?.user, 
        userId: session?.user?.id,
        error: error?.message
      });
      
      if (error) {
        console.error('[AuthContext] Session error:', error);
        setUser(null);
        setUserProfile(null);
      } else if (session?.user) {
        console.log('[AuthContext] Found session for user:', session.user.id);
        setUser(session.user);
        
        // EMERGENCY: For web platforms, set basic profile immediately to prevent loading loops
        if (Platform.OS === 'web') {
          setUserProfile({ 
            id: session.user.id, 
            role: 'employee', 
            email: session.user.email,
            business_id: 'demo' // Default business for emergency access
          });
        }
        
        // Fetch full profile without infinite retry loops
        try {
          const profile = await fetchUserProfile(session.user.id);
          if (!profile && retryCount < 2) {
            setRetryCount(prev => prev + 1);
          }
        } catch (profileError) {
          console.error('[AuthContext] Profile fetch failed:', profileError);
          // Don't retry profile fetch on error to prevent infinite loops
        }
      } else {
        console.log('[AuthContext] No session found');
        setUser(null);
        setUserProfile(null);
      }
      
      setSessionInitialized(true);
    } catch (error) {
      console.error('[AuthContext] Failed to get session:', error);
      setUser(null);
      setUserProfile(null);
      setSessionError('Connection error. Please refresh if login doesn\'t complete.');
    } finally {
      setLoading(false);
    }
  }, [fetchUserProfile]); // REMOVED retryCount from dependencies to prevent infinite loops

  useEffect(() => {
    // EMERGENCY: Only run initial session check once
    if (!sessionInitialized) {
      getInitialSession();
    }
  }, []); // EMPTY dependency array to prevent infinite loops

  // Listen for auth state changes with web platform optimizations
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.id);
        
        // EMERGENCY CIRCUIT BREAKER: Prevent INITIAL_SESSION from triggering infinite loops
        if (event === 'INITIAL_SESSION' && sessionInitialized) {
          console.log('[AuthContext] CIRCUIT BREAKER: Ignoring duplicate INITIAL_SESSION event');
          return;
        }
        
        // Platform detection for auth state changes
        const isMobileWeb = Platform.OS === 'web' && /Mobi|Android/i.test(navigator.userAgent);
        const isDesktopWeb = Platform.OS === 'web' && !/Mobi|Android/i.test(navigator.userAgent);
        const isWeb = Platform.OS === 'web';
        
        if (session?.user) {
          const currentUserId = session.user.id;
          
          // Only fetch profile if we don't have it or it's for a different user
          const shouldFetchProfile = !userProfile || userProfile.id !== currentUserId;
          
          setUser(session.user);
          
          // For all web platforms, set a basic profile immediately to prevent blocking
          if (isWeb && (!userProfile || shouldFetchProfile)) {
            console.log('[AuthContext] Setting temporary profile for web platform');
            setUserProfile({ id: currentUserId, role: 'employee', email: session.user.email });
          }
          
          // Fetch full profile asynchronously for certain events (but NOT for INITIAL_SESSION to prevent loops)
          if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && shouldFetchProfile) {
            fetchUserProfile(currentUserId);
          }
        } else {
          setUser(null);
          setUserProfile(null);
          
          // Clear stored session data on sign out
          if (event === 'SIGNED_OUT') {
            try {
              if (isWeb) {
                // Clear all supabase auth related items with correct key format
                Object.keys(localStorage).forEach(key => {
                  if (key.startsWith('sb-') && key.includes('auth-token')) {
                    localStorage.removeItem(key);
                  }
                });
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
  }, [fetchUserProfile, userProfile?.id, sessionInitialized]); // Added sessionInitialized to dependencies

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
            // Clear all supabase auth related items with correct key format
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') && key.includes('auth-token')) {
                localStorage.removeItem(key);
              }
            });
          } else {
            await AsyncStorage.removeItem('supabase.auth.token');
          }
        } catch (error) {
          console.error('Error clearing stored session data:', error);
        }
      }
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mobile web session refresh function
  const refreshSession = async () => {
    console.log('[AuthContext] Refreshing session...');
    try {
      setLoading(true);
      
      // For mobile web, first check if we have stored auth data
      if (Platform.OS === 'web') {
        const supabaseProjectRef = 'qdfhklikmkyeqsiuapjg';
        const authTokenKey = `sb-${supabaseProjectRef}-auth-token`;
        const storedToken = localStorage.getItem(authTokenKey);
        
        console.log('[AuthContext] Refresh session - stored token exists:', !!storedToken);
        
        if (!storedToken) {
          console.log('[AuthContext] No stored token, cannot refresh session');
          setUser(null);
          setUserProfile(null);
          setLoading(false);
          return;
        }
      }
      
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('[AuthContext] Session refresh error:', error);
        // On mobile web, if refresh fails, try to get session directly
        if (Platform.OS === 'web' && /Mobi|Android/i.test(navigator.userAgent)) {
          console.log('[AuthContext] Mobile web refresh failed, trying getSession...');
          const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();
          if (!getError && currentSession?.user) {
            setUser(currentSession.user);
            await fetchUserProfile(currentSession.user.id);
            setLoading(false);
            return;
          }
        }
        setUser(null);
        setUserProfile(null);
        setLoading(false);
        return;
      }
      
      if (session?.user) {
        console.log('[AuthContext] Session refreshed successfully for user:', session.user.id);
        setUser(session.user);
        // Fetch full profile
        await fetchUserProfile(session.user.id);
      } else {
        console.log('[AuthContext] No user in refreshed session');
        setUser(null);
        setUserProfile(null);
      }
    } catch (error) {
      console.error('[AuthContext] Failed to refresh session:', error);
      setUser(null);
      setUserProfile(null);
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
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {sessionError && (
        <View style={{ backgroundColor: '#fffbe6', padding: 16, borderRadius: 8, margin: 16, alignItems: 'center' }}>
          <Text style={{ color: '#d32f2f', fontWeight: 'bold', textAlign: 'center', marginBottom: 8 }}>{sessionError}</Text>
          {retryCount < 3 && (
            <TouchableOpacity
              style={{ backgroundColor: '#1976d2', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8 }}
              onPress={() => {
                setSessionError(null);
                setRetryCount(prev => prev + 1);
                getInitialSession();
              }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Retry ({3 - retryCount} left)</Text>
            </TouchableOpacity>
          )}
          {retryCount >= 3 && (
            <Text style={{ color: '#666', textAlign: 'center', marginTop: 8 }}>
              Max retries reached. Please refresh the page manually.
            </Text>
          )}
        </View>
      )}
      {children}
    </AuthContext.Provider>
  );
};
