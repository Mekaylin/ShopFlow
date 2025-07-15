

import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { createShadowStyle } from '../../utils/shadowUtils';




type LoginScreenProps = {
  onLogin?: (role: 'admin' | 'employee') => void,
  setSession?: (key: string, value: string) => Promise<void>
};


// ...existing code...


function RegistrationSuccessScreen({ onBack }: { onBack: () => void }) {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' }}>
      <View style={[styles.card, { width: 340 }]}> 
        <Text style={styles.title}>Check Your Email</Text>
        <Text style={{ fontSize: 16, color: '#333', marginVertical: 16, textAlign: 'center' }}>
          Registration successful! Please check your email to confirm your account before logging in.
        </Text>
        <TouchableOpacity onPress={onBack} style={styles.loginBtn}>
          <Text style={styles.loginBtnText}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
function LoginScreen({ onLogin, setSession }: LoginScreenProps) {
  // State for role selection
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  // Admin login state
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState('');
  // Employee login state (shared tablet: only business code required)
  const [empBusinessCode, setEmpBusinessCode] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState('');
  // Shared
  const [shakeAnim] = useState(new Animated.Value(0));
  const [showRegister, setShowRegister] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const router = useRouter();

  // Default setSession function if none provided
  const defaultSetSession = async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const SecureStore = await import('expo-secure-store');
      await SecureStore.setItemAsync(key, value);
    }
  };

  const sessionSetter = setSession || defaultSetSession;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (loginLocked && lockTimer > 0) {
      timer = setInterval(() => {
        setLockTimer((t) => {
          if (t <= 1) {
            setLoginLocked(false);
            clearInterval(timer);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [loginLocked, lockTimer]);

  if (showRegistrationSuccess) {
    return <RegistrationSuccessScreen onBack={() => {
      setShowRegistrationSuccess(false);
      setShowRegister(false);
    }} />;
  }
  if (showRegister) {
    return <RegistrationScreen onBack={() => setShowRegister(false)} onSuccess={() => setShowRegistrationSuccess(true)} />;
  }
  if (showReset) {
    return (
      <View style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.centered}>
            <View style={styles.card}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>Enter your email to receive a password reset link.</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={resetEmail}
                onChangeText={setResetEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholderTextColor="#b0b8c1"
                editable={!resetLoading}
              />
              <TouchableOpacity
                style={styles.loginBtn}
                onPress={async () => {
                  setResetLoading(true);
                  try {
                    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
                    if (error) {
                      Alert.alert('Error', error.message);
                    } else {
                      Alert.alert('Success', 'Check your email for a password reset link.');
                      setShowReset(false);
                    }
                  } catch (e) {
                    Alert.alert('Error', e instanceof Error ? e.message : JSON.stringify(e) || 'Unknown error');
                  } finally {
                    setResetLoading(false);
                  }
                }}
                disabled={resetLoading}
              >
                <Text style={styles.loginBtnText}>{resetLoading ? 'Sending...' : 'Send Reset Email'}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowReset(false)} style={{ marginTop: 16 }}>
                <Text style={{ color: '#1976d2', textAlign: 'center' }}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Admin login handler
  const handleAdminLogin = async () => {
    if (loginLocked) {
      console.warn('Login attempt blocked: too many attempts.');
      Alert.alert('Too Many Attempts', `Please wait ${lockTimer} seconds before trying again.`);
      return;
    }
    if (!adminEmail || !adminPassword) {
      console.warn('Login failed: missing email or password.');
      setAdminError('Please enter both email and password.');
      return;
    }
    setAdminLoading(true);
    setAdminError('');
    try {
      console.log('Attempting admin login:', { email: adminEmail });
      const { data, error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });
      if (error || !data.session) {
        console.error('Admin login failed:', error, data);
        setAdminError('Invalid email or password.');
        setLoginAttempts((a) => a + 1);
        if (loginAttempts + 1 >= 5) {
          setLoginLocked(true);
          setLockTimer(30);
        }
        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 100,
            useNativeDriver: Platform.OS !== 'web',
          }),
        ]).start();
        return;
      }
      setLoginAttempts(0);
      if (onLogin) onLogin('admin');
      console.log('Admin login successful, navigating to dashboard.');
      router.replace('/admin-dashboard');
    } catch (e: any) {
      console.error('Admin login exception:', e);
      setAdminError(e.message || 'Login failed.');
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
      setAdminError(e.message || 'Login failed.');
    } finally {
      setAdminLoading(false);
    }
  };

  // Employee login handler (shared tablet: only business code required)
  const handleEmployeeLogin = async () => {
    if (loginLocked) {
      console.warn('Employee login blocked: too many attempts.');
      Alert.alert('Too Many Attempts', `Please wait ${lockTimer} seconds before trying again.`);
      return;
    }
    if (!empBusinessCode) {
      console.warn('Employee login failed: missing business code.');
      setEmpError('Please enter the business code.');
      return;
    }
    setEmpLoading(true);
    setEmpError('');
    try {
      console.log('Attempting employee login with business code:', empBusinessCode);
      // Find business
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id')
        .eq('code', empBusinessCode)
        .single();
      if (businessError || !business) {
        console.error('Employee login failed: business not found', businessError, business);
        setEmpError('Business not found.');
        setEmpLoading(false);
        return;
      }
      setLoginAttempts(0);
      if (onLogin) onLogin('employee');
      console.log('Employee login successful, navigating to dashboard.');
      // You may want to store business.id in session for later use
      router.replace('/employee-dashboard');
    } catch (e: any) {
      console.error('Employee login exception:', e);
      setEmpError(e.message || 'Login failed.');
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]).start();
    } finally {
      setEmpLoading(false);
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
            <View style={{ flexDirection: 'row', marginBottom: 18 }}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'admin' && styles.roleBtnActive]}
                onPress={() => setRole('admin')}
                disabled={adminLoading || empLoading}
              >
                <Text style={{ color: role === 'admin' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Admin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'employee' && styles.roleBtnActive]}
                onPress={() => setRole('employee')}
                disabled={adminLoading || empLoading}
              >
                <Text style={{ color: role === 'employee' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Employee</Text>
              </TouchableOpacity>
            </View>
            {role === 'admin' ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={adminEmail}
                  onChangeText={setAdminEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholderTextColor="#b0b8c1"
                  editable={!adminLoading}
                />
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Password"
                    value={adminPassword}
                    onChangeText={setAdminPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#b0b8c1"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleAdminLogin}
                    editable={!adminLoading}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword((v) => !v)}
                    style={styles.eyeBtn}
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#1976d2" />
                  </TouchableOpacity>
                </View>
                {adminError ? <Text style={{ color: 'red', marginBottom: 8 }}>{adminError}</Text> : null}
                <TouchableOpacity style={styles.loginBtn} onPress={handleAdminLogin} disabled={adminLoading}>
                  {adminLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
            <Text style={styles.inputLabel}>Business Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Business Code"
              value={empBusinessCode}
              onChangeText={setEmpBusinessCode}
              autoCapitalize="characters"
              editable={!empLoading}
              maxLength={12}
            />
                {empError ? <Text style={{ color: 'red', marginBottom: 8 }}>{empError}</Text> : null}
                <TouchableOpacity style={styles.loginBtn} onPress={handleEmployeeLogin} disabled={empLoading}>
                  {empLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity onPress={() => setShowRegister(true)} style={{ marginTop: 16 }}>
              <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Don&apos;t have an account? Sign Up</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowReset(true)} style={{ marginTop: 12 }}>
              <Text style={{ color: '#1976d2', textAlign: 'center' }}>Forgot Password?</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );



function RegistrationScreen({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [role] = useState<'admin'>('admin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessCode, setBusinessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
  const [generatedBusinessCode, setGeneratedBusinessCode] = useState('');
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [errorLog, setErrorLog] = useState<string>('');
  const [showCodeAfter, setShowCodeAfter] = useState(false);

  // Password strength checker
  function checkPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
    if (!pw || pw.length < 6) return 'weak';
    if (pw.match(/[A-Z]/) && pw.match(/[0-9]/) && pw.match(/[^A-Za-z0-9]/) && pw.length >= 10) return 'strong';
    if (pw.match(/[A-Z]/) && pw.match(/[0-9]/) && pw.length >= 8) return 'medium';
    return 'weak';
  }

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(password));
  }, [password]);

  // Utility: generate random business code (7 chars, no ambiguous chars)
  function generateBusinessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  const handleRegister = async () => {
    setErrorLog('');
    console.log('Registration attempt:', { name, email, businessName, businessCode });
    // Early validation
    if (!email || !password || !name) {
      console.warn('Registration failed: missing name, email, or password.');
      setErrorLog('Please enter your name, email, and password.');
      Alert.alert('Missing Fields', 'Please enter your name, email, and password.');
      return;
    }
    if (!businessName) {
      console.warn('Registration failed: missing business name.');
      setErrorLog('Please enter a business name.');
      Alert.alert('Missing Fields', 'Please enter a business name.');
      return;
    }
    let codeToUse = businessCode.trim();
    if (!codeToUse) {
      codeToUse = generateBusinessCode();
    }
    if (passwordStrength === 'weak') {
      console.warn('Registration failed: weak password.');
      setErrorLog('Please choose a stronger password.');
      Alert.alert('Weak Password', 'Please choose a stronger password.');
      return;
    }
    setLoading(true);
    try {
      // 1. Check for duplicate business code
      console.log('Checking for duplicate business code:', codeToUse);
      const { data: existingBiz, error: bizCheckError } = await supabase
        .from('businesses')
        .select('id')
        .eq('code', codeToUse)
        .maybeSingle();
      if (bizCheckError) {
        setErrorLog('Could not check business code: ' + (bizCheckError.message || JSON.stringify(bizCheckError)));
        console.error('Business code check error:', bizCheckError);
        Alert.alert('Error', 'Could not check business code. Please try again.');
        setLoading(false);
        return;
      }
      if (existingBiz) {
        setErrorLog('Business code already in use. Please choose a different code.');
        console.warn('Registration failed: business code already in use.');
        Alert.alert('Business code already in use. Please choose a different code.');
        setLoading(false);
        return;
      }

      // 2. Sign up user
      console.log('Signing up user:', { email });
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name, role }
        }
      });
      if (signUpError) {
        setErrorLog('Supabase signUp error: ' + (signUpError.message || JSON.stringify(signUpError)));
        console.error('Supabase signUp error:', signUpError);
        if (signUpError.message.toLowerCase().includes('rate limit exceeded')) {
          setSignupCooldown(10);
          Alert.alert('Too many sign-up attempts. Please try again in a few seconds.');
          setLoading(false);
          return;
        }
        Alert.alert('Auth sign up failed', signUpError.message);
        setLoading(false);
        return;
      }
      if (!authData.user) {
        setErrorLog('No user returned from signUp.');
        console.error('No user returned from signUp:', authData);
        Alert.alert('Registration failed', 'User not returned from sign up.');
        setLoading(false);
        return;
      }

      // 3. Wait for session to be established (poll for session)
      let session = null;
      for (let i = 0; i < 10; i++) {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          setErrorLog('Session polling error: ' + (sessionError.message || JSON.stringify(sessionError)));
          console.error('Session polling error:', sessionError);
        }
        session = sessionData?.session;
        if (session) break;
        await new Promise(res => setTimeout(res, 400));
      }
      if (!session) {
        setErrorLog('Session not established after sign up.');
        console.error('Session not established after sign up.');
        Alert.alert('Registration failed', 'Session not established after sign up. Please check your email to confirm your account, then log in.');
        setLoading(false);
        return;
      }

      // 4. Create business
      let business_id: string | null = null;
      console.log('Creating business:', { name: businessName, code: codeToUse });
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({ name: businessName, code: codeToUse })
        .select('id,code')
        .single();
      if (businessError || !business) {
        setErrorLog('Business creation error: ' + (businessError?.message || JSON.stringify(businessError)));
        console.error('Business creation error:', businessError);
        if (businessError?.message?.toLowerCase().includes('duplicate')) {
          Alert.alert('This business name or code is already in use. Please choose a different one.');
          setLoading(false);
          return;
        }
        Alert.alert('Failed to create business', businessError?.message || 'Unknown error');
        setLoading(false);
        return;
      }
      business_id = business?.id ?? null;
      if (business?.code) setGeneratedBusinessCode(business?.code);

      // 5. Upsert user (in case row does not exist)
      if (authData.user?.id) {
        console.log('Upserting user:', { id: authData.user.id, name, role, business_id });
        const { error: userError } = await supabase
          .from('users')
          .upsert({ id: authData.user.id, name, role, business_id }, { onConflict: 'id' });
        if (userError ?? false) {
          setErrorLog('User upsert error: ' + (userError?.message || JSON.stringify(userError)));
          console.error('User upsert error:', userError);
          Alert.alert('User update failed', userError?.message ?? 'Unknown error');
          setLoading(false);
          return;
        }
      }

      setErrorLog('');
      setShowCodeAfter(true);
      setLoading(false);
      console.log('Registration successful!');
      return;
    } catch (err: any) {
      setErrorLog('Registration failed: ' + (err?.message || JSON.stringify(err)));
      console.error('Registration failed:', err);
      Alert.alert('Registration failed', err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (showCodeAfter && generatedBusinessCode) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' }}>
        <View style={[styles.card, { width: 340 }]}> 
          <Text style={styles.title}>Business Created!</Text>
          <Text style={{ fontSize: 16, color: '#333', marginVertical: 16, textAlign: 'center' }}>
            Your business code is:
          </Text>
          <Text selectable style={{ fontSize: 28, color: '#1976d2', fontWeight: 'bold', marginBottom: 16 }}>{generatedBusinessCode}</Text>
          <Text style={{ fontSize: 15, color: '#555', marginBottom: 20, textAlign: 'center' }}>
            Share this code with your employees so they can log in.
          </Text>
          <TouchableOpacity onPress={onBack} style={styles.loginBtn}>
            <Text style={styles.loginBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#e3f2fd' }}>
      <View style={[styles.card, { width: 340 }]}> 
        <Text style={styles.title}>Admin Sign Up</Text>
        {errorLog ? (
          <View style={{ backgroundColor: '#ffeaea', borderRadius: 8, padding: 8, marginBottom: 10, width: 260 }}>
            <Text style={{ color: '#c62828', fontSize: 14 }}>{errorLog}</Text>
          </View>
        ) : null}
        <TextInput
          style={styles.input}
          placeholder="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading}
          placeholderTextColor="#b0b8c1"
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
          placeholderTextColor="#b0b8c1"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            editable={!loading}
            placeholderTextColor="#b0b8c1"
          />
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.eyeBtn}
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <FontAwesome5 name={showPassword ? 'eye-slash' : 'eye'} size={20} color="#1976d2" />
          </TouchableOpacity>
        </View>
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
        <Text style={styles.inputLabel}>Business Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Business Name"
          value={businessName}
          onChangeText={setBusinessName}
          autoCapitalize="words"
          editable={!loading}
          placeholderTextColor="#b0b8c1"
        />
        <Text style={styles.inputLabel}>Business Code (optional, will be created)</Text>
        <TextInput
          style={styles.input}
          placeholder="Leave blank to auto-generate"
          value={businessCode}
          onChangeText={setBusinessCode}
          autoCapitalize="characters"
          editable={!loading}
          maxLength={12}
          placeholderTextColor="#b0b8c1"
        />
        <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={loading || signupCooldown > 0}>
          {loading || signupCooldown > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8 }}>
                {loading ? 'Signing Up...' : `Signing Up in ${signupCooldown}s`}
              </Text>
            </View>
          ) : (
            <Text style={styles.loginBtnText}>Sign Up</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={onBack} style={{ marginTop: 16 }}>
          <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Back to Login</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
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
    ...createShadowStyle({
      shadowColor: '#1976d2',
      shadowOpacity: 0.13,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    }),
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
    ...createShadowStyle({
      shadowColor: '#1976d2',
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    }),
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
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
});

export default LoginScreen;

