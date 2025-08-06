
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '../../components/ThemedText';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Colors } from '../../constants/Colors';
import { spacing } from '../../constants/DesignTokens';
import { supabase } from '../../lib/supabase';

interface LoginScreenProps {
  onLogin?: (role: 'admin' | 'employee') => void;
  setSession?: (key: string, value: string) => Promise<void>;
}

export default function LoginScreen({ onLogin, setSession }: LoginScreenProps) {
  const router = useRouter();

  // Registration state (admin only)
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Registration handler (admin only)
  const handleRegister = async () => {
    setRegError("");
    if (!regEmail || !regPassword || !name) {
      setRegError("Please enter your name, email, and password.");
      console.error("[Signup] Missing fields", { name, regEmail, regPassword });
      return;
    }
    if (regPassword.length < 6) {
      setRegError("Please choose a stronger password (at least 6 characters).");
      return;
    }
    setRegLoading(true);
    try {
      const result = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: { data: { name, role: 'admin' } },
      });
      const { data: authData, error: signUpError } = result;
      if (signUpError) {
        let errorMsg = "Supabase signUp error: " + (signUpError.message || JSON.stringify(signUpError));
        if (signUpError.status === 429) errorMsg += "\nToo many requests. Please wait and try again.";
        if (signUpError.status === 400 && signUpError.message?.includes('email')) errorMsg += "\nCheck if your email is valid and not already registered.";
        setRegError(errorMsg);
        setRegLoading(false);
        return;
      }
      if (!authData?.user) {
        setRegError("No user returned from signUp. This may be a network or CORS issue.\nCheck your Supabase project and network connection.");
        setRegLoading(false);
        return;
      }
      setShowRegister(false);
      setRegLoading(false);
    } catch (err) {
      setRegError("Network error: Unable to reach authentication server. Please check your connection, VPN, or CORS settings.\n" + ((err as any)?.message || JSON.stringify(err)));
      setRegLoading(false);
      console.error("[Signup] Network/CORS error during signUp", err);
    }
  };

  // Login handler
  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      if (!email.trim() || !password.trim()) {
        setError("Please enter your email and password.");
        setLoading(false);
        return;
      }
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password.trim() 
      });
      if (signInError) {
        setError(signInError.message || 'Login failed.');
        console.error('[Login] Supabase signIn error:', signInError, { email });
        setLoginAttempts((a) => a + 1);
        setLoading(false);
        return;
      }
      if (!signInData.user) {
        setError('No user returned from login.');
        console.error('[Login] No user returned from signIn', { signInData });
        setLoading(false);
        return;
      }
      const userId = signInData.user.id;
      const { data: userRow, error: userError } = await supabase.from('users').select('*').eq('id', userId).single();
      if (userError || !userRow) {
        setError('User not found.');
        console.error('[Login] User fetch error or not found:', userError, { userId });
        setLoading(false);
        return;
      }
      // Allow both admin and employee login
      if (userRow.role !== 'admin' && userRow.role !== 'employee') {
        setError('Invalid user role. Please contact administrator.');
        setLoading(false);
        return;
      }
      setLoginAttempts(0);
      
      // Route based on user role
      if (userRow.role === 'admin') {
        if (onLogin) onLogin('admin');
        router.replace('/admin-dashboard');
      } else {
        if (onLogin) onLogin('employee');
        router.replace('/employee-dashboard');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed.');
      console.error('[Login] Unexpected error:', e, { email });
    } finally {
      setLoading(false);
    }
  };

  // Registration form
  if (showRegister) {
    return (
      <SafeAreaView style={[{ flex: 1 }, { backgroundColor: Colors.light.background }]}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={[
              { justifyContent: 'center', alignItems: 'center' }, 
              { minHeight: '100%', padding: spacing.lg }
            ]}
            keyboardShouldPersistTaps="handled"
          >
            <Card variant="elevated" style={{ width: '100%', maxWidth: 400, alignItems: 'center' }}>
              <FontAwesome5 
                name="tools" 
                size={48} 
                color={Colors.light.primary} 
                style={{ marginBottom: spacing.lg }} 
              />
              
              <ThemedText type="h1" style={{ marginBottom: spacing.xs, textAlign: 'center' }}>
                ShopFlow
              </ThemedText>
              
              <ThemedText type="body" style={{ 
                marginBottom: spacing.xl, 
                textAlign: 'center',
                color: Colors.light.textSecondary 
              }}>
                Admin Registration
              </ThemedText>

              <View style={{ width: '100%', gap: spacing.md }}>
                <Input
                  label="Full Name"
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />

                <Input
                  label="Email"
                  placeholder="Enter your email"
                  value={regEmail}
                  onChangeText={setRegEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />

                <Input
                  label="Password"
                  placeholder="Enter your password"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  helperText="Password must be at least 6 characters"
                />

                {regError ? (
                  <ThemedText style={{ color: Colors.light.danger, fontSize: 14 }}>
                    {regError}
                  </ThemedText>
                ) : null}

                <Button
                  variant="primary"
                  onPress={handleRegister}
                  loading={regLoading}
                  style={{ marginTop: spacing.md }}
                >
                  Create Account
                </Button>

                <Button
                  variant="ghost"
                  onPress={() => setShowRegister(false)}
                >
                  Back to Login
                </Button>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Login form
  return (
    <SafeAreaView style={[{ flex: 1 }, { backgroundColor: Colors.light.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={[
            { justifyContent: 'center', alignItems: 'center' }, 
            { minHeight: '100%', padding: spacing.lg }
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="elevated" style={{ width: '100%', maxWidth: 400, alignItems: 'center' }}>
            <FontAwesome5 
              name="tools" 
              size={48} 
              color={Colors.light.primary} 
              style={{ marginBottom: spacing.lg }} 
            />
            
            <ThemedText type="h1" style={{ marginBottom: spacing.xs, textAlign: 'center' }}>
              ShopFlow
            </ThemedText>
            
            <ThemedText type="body" style={{ 
              marginBottom: spacing.xl, 
              textAlign: 'center',
              color: Colors.light.textSecondary 
            }}>
              Sign in to continue
            </ThemedText>

            <View style={{ width: '100%', gap: spacing.md }}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                accessibilityLabel="Email"
                testID="login-email-input"
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLogin}
                accessibilityLabel="Password"
                testID="login-password-input"
              />

              {error ? (
                <ThemedText style={{ color: Colors.light.danger, fontSize: 14 }}>
                  {error}
                </ThemedText>
              ) : null}

              <Button
                variant="primary"
                onPress={handleLogin}
                loading={loading}
                style={{ marginTop: spacing.md }}
              >
                Sign In
              </Button>

              <Button
                variant="ghost"
                onPress={() => setShowRegister(true)}
              >
                Don't have an account? Sign Up
              </Button>
            </View>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

