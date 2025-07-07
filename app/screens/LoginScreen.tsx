import { FontAwesome5 } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function LoginScreen({ onLogin, onTest }: { onLogin: (role: 'admin' | 'employee') => void, onTest?: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <RegistrationScreen onBack={() => setShowRegister(false)} />;
  }

  const handleLogin = async () => {
    setLoading(true);
    try {
      // Sign in with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        if (signInError.message.toLowerCase().includes('invalid login credentials')) {
          throw new Error('Incorrect email or password.');
        }
        throw new Error(signInError.message);
      }
      // Check if email is confirmed (optional, but recommended)
      if (signInData?.user && !signInData.user.confirmed_at) {
        throw new Error('Please confirm your email address before logging in.');
      }
      // Fetch user role from users table
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('email', email)
        .limit(1);
      if (userError || !users || users.length === 0) {
        throw new Error('User not found or missing role.');
      }
      const role = users[0].role;
      if (role !== 'admin' && role !== 'employee') {
        throw new Error('Invalid user role.');
      }
      onLogin(role);
    } catch (err: any) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
      Alert.alert('Login failed', err.message || 'Unknown error');
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
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor="#b0b8c1"
              returnKeyType="next"
              editable={!loading}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#b0b8c1"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#1976d2" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRegister(true)} style={{ marginTop: 16 }}>
              <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Don't have an account? Sign Up</Text>
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

function RegistrationScreen({ onBack }: { onBack: () => void }) {
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  // Password strength checker
  function checkPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score >= 4) return 'strong';
    if (score >= 2) return 'medium';
    return 'weak';
  }

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(password));
  }, [password]);

  // Helper to resolve business code (short code or UUID)
  async function resolveBusinessId(input: string) {
    // Try as UUID first
    let { data: business, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', input)
      .single();
    if (!error && business) return business.id;
    // Try as short code (e.g., a custom code column)
    ({ data: business, error } = await supabase
      .from('businesses')
      .select('id')
      .eq('code', input)
      .single());
    if (!error && business) return business.id;
    return null;
  }

  const handleRegister = async () => {
    if (passwordStrength === 'weak') {
      Alert.alert('Weak Password', 'Please choose a stronger password.');
      return;
    }
    setLoading(true);
    try {
      let business_id = null;
      if (role === 'admin') {
        // Create new business
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .insert({ name: businessName })
          .select('id')
          .single();
        console.log('Business insert result:', { business, businessError });
        if (businessError || !business) throw new Error('Failed to create business: ' + (businessError?.message || 'Unknown error'));
        business_id = business.id;
      } else {
        // Employee: resolve business by code or UUID
        business_id = await resolveBusinessId(businessCode);
        if (!business_id) throw new Error('Invalid business code. Please check with your admin.');
      }
      // Register user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
      console.log('Auth signUp result:', { authData, signUpError });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('user already registered')) {
          throw new Error('This email is already registered. Please log in or use a different email.');
        }
        throw new Error('Auth sign up failed: ' + signUpError.message);
      }
      // Insert into public.users
      const { error: userError } = await supabase
        .from('users')
        .update({ name, role, business_id })
        .eq('id', authData.user.id);
      console.log('User update result:', { userError });
      if (userError) throw new Error('User update failed: ' + userError.message);
      Alert.alert('Success', 'Registration successful! Please check your email to confirm your account.');
      onBack();
    } catch (err: any) {
      console.log('Registration error (full object):', err);
      Alert.alert('Registration failed', err.message || JSON.stringify(err) || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' }}>
      <View style={[styles.card, { width: 340 }]}> 
        <Text style={styles.title}>Sign Up</Text>
        <View style={{ flexDirection: 'row', marginBottom: 18 }}>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
            onPress={() => setRole('admin')}
            disabled={loading}
          >
            <Text style={{ color: role === 'admin' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Admin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.roleBtn, role === 'employee' && styles.roleBtnActive]}
            onPress={() => setRole('employee')}
            disabled={loading}
          >
            <Text style={{ color: role === 'employee' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Employee</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#1976d2" />
          </TouchableOpacity>
        </View>
        {/* Password strength indicator */}
        <View style={{ width: 260, marginBottom: 8 }}>
          <Text style={{
            color:
              password.length === 0 ? '#888' :
              passwordStrength === 'strong' ? '#388e3c' :
              passwordStrength === 'medium' ? '#ff9800' : '#c62828',
            fontWeight: 'bold',
            fontSize: 14,
            textAlign: 'left',
          }}>
            {password.length === 0 ? '' :
              passwordStrength === 'strong' ? 'Strong password' :
              passwordStrength === 'medium' ? 'Medium password' : 'Weak password'}
          </Text>
        </View>
        {role === 'admin' ? (
          <TextInput
            style={styles.input}
            placeholder="Business Name"
            value={businessName}
            onChangeText={setBusinessName}
            editable={!loading}
          />
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Business Code (ask your admin)"
            value={businessCode}
            onChangeText={setBusinessCode}
            editable={!loading}
          />
        )}
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign Up</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Back to Login</Text>
        </TouchableOpacity>
      </View>
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 260,
    marginBottom: 18,
  },
  eyeBtn: {
    padding: 8,
    marginLeft: -36,
    zIndex: 1,
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
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    letterSpacing: 1,
  },
  roleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 10,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  roleBtnActive: {
    backgroundColor: '#1976d2',
  },
});
