import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen({ onLogin, onTest }: { onLogin: (role: 'admin' | 'employee') => void, onTest?: () => void }) {
  const [code, setCode] = useState('');
  const [shakeAnim] = useState(new Animated.Value(0));
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!code.trim()) {
      Alert.alert('Missing Code', 'Please enter a valid code.');
      return;
    }

    setLoading(true);
    try {
      // Try to sign in with the code as email and a default password
      const email = `${code}@shopflow.local`;
      const password = 'defaultPassword123!';
      
      console.log('Attempting to sign in with:', { email, code });
      
      // First try to sign in
      const signInResult = await supabase.auth.signInWithPassword({
        email,
        password
      });

      let data, error;
      
      // If sign in fails, try to sign up
      if (signInResult.error) {
        console.log('Sign in failed, attempting sign up:', signInResult.error.message);
        const signUpResult = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              code: code,
              role: code === 'admin123' ? 'admin' : 'employee'
            }
          }
        });
        
        if (signUpResult.error) {
          console.error('Sign up error:', signUpResult.error);
          throw signUpResult.error;
        }
        
        data = signUpResult.data;
        error = signUpResult.error;
      } else {
        data = signInResult.data;
        error = signInResult.error;
      }

      if (data?.user) {
        console.log('Authentication successful:', data.user);
        
        // Create or update user record in users table
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: data.user.email,
            role: code === 'admin123' ? 'admin' : 'employee',
            business_id: code === 'admin123' ? 'admin-business' : 'employee-business',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (upsertError) {
          console.error('Error upserting user:', upsertError);
          // Don't throw here, as the user is authenticated
        }

        // Store session
        if (data.session) {
          const sessionStr = JSON.stringify(data.session);
          if (Platform.OS === 'web') {
            localStorage.setItem('supabase-session', sessionStr);
          } else {
            const SecureStore = require('expo-secure-store');
            await SecureStore.setItemAsync('supabase-session', sessionStr);
          }
        }

        onLogin(code === 'admin123' ? 'admin' : 'employee');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      Alert.alert('Login Failed', 'Please check your code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.centered}>
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}> 
            <FontAwesome5 name="tools" size={54} color="#1976d2" style={{ marginBottom: 18 }} />
            <Text style={styles.title}>ShopFlow</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter code (admin123 or emp123)"
              value={code}
              onChangeText={setCode}
              secureTextEntry
              placeholderTextColor="#b0b8c1"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              editable={!loading}
            />
            <TouchableOpacity 
              style={[styles.loginBtn, loading && styles.loginBtnDisabled]} 
              onPress={handleLogin}
              disabled={loading}
            >
              <Text style={styles.loginBtnText}>
                {loading ? 'Signing in...' : 'Login'}
              </Text>
            </TouchableOpacity>
            {onTest && (
              <TouchableOpacity onPress={onTest} style={{ marginTop: 24 }}>
                <Text style={{ color: '#1976d2', textAlign: 'center' }}>Test Supabase Connection</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 32,
    width: 340,
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 8,
    letterSpacing: 1.2,
  },
  subtitle: {
    fontSize: 17,
    color: '#555',
    marginBottom: 24,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#b0b8c1',
    borderRadius: 10,
    padding: 16,
    width: 260,
    fontSize: 18,
    marginBottom: 18,
    backgroundColor: '#f8fafd',
    color: '#222',
  },
  loginBtn: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 44,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#1976d2',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginBtnDisabled: {
    backgroundColor: '#b0b8c1',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
});
