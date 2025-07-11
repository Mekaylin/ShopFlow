import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getBusinessByCode, supabase } from '../../services/cloud.js';

type LoginScreenProps = {
  onLogin: (role: 'admin' | 'employee') => void,
  onTest?: () => void
};

export default function LoginScreen({ onLogin, onTest }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shakeAnim] = useState(new Animated.Value(0));
  const [showRegister, setShowRegister] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [loginLocked, setLoginLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const router = useRouter();
  const [isEmployeeLogin, setIsEmployeeLogin] = useState(false);
  const [businessCode, setBusinessCode] = useState('');
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Cooldown timer effect
  useEffect(() => {
    if (signupCooldown > 0) {
      const timer = setTimeout(() => setSignupCooldown(signupCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [signupCooldown]);
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  if (showRegister) {
    return <RegistrationScreen onBack={() => setShowRegister(false)} />;
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

  const handleLogin = async () => {
    if (loginLocked) {
      Alert.alert('Too Many Attempts', `Please wait ${lockTimer} seconds before trying again.`);
      return;
    }
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      // Sign in with Supabase Auth
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setLoginAttempts((a) => a + 1);
        if (loginAttempts + 1 >= 5) {
          setLoginLocked(true);
          setLockTimer(30);
        }
        console.error('Auth error details:', signInError);
        throw new Error(signInError.message);
      }
      // No manual session storage needed
      // Check if email is confirmed (optional, but recommended)
      if (signInData?.user && !signInData.user.confirmed_at) {
        Alert.alert(
          'Email Not Verified',
          'Please confirm your email address before logging in.',
          [
            { text: 'Resend Confirmation Email', onPress: async () => {
                setLoading(true);
                try {
                  const { error } = await supabase.auth.resend({ type: 'signup', email });
                  if (error) {
                    Alert.alert('Error', error.message);
                  } else {
                    Alert.alert('Confirmation Email Sent', 'Please check your inbox.');
                  }
                } finally {
                  setLoading(false);
                }
              }
            },
            { text: 'OK' }
          ]
        );
        return;
      }
      // Upsert user into users table after login
      if (signInData?.user) {
        const { id, email, user_metadata } = signInData.user;
        const { name = '', role = '' } = user_metadata || {};
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({ id, email, name, role }, { onConflict: 'id' });
        if (upsertError) {
          console.warn('User upsert error:', upsertError);
        } else {
          console.log('User upserted:', { id, email, name, role });
        }
      }
      // Fetch user role from users table (only once)
      let userRole = null;
      if (signInData?.user) {
        const { id } = signInData.user;
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', id)
          .limit(1);
        if (userError || !users || users.length === 0) {
          console.warn('User fetch error or not found:', userError, users);
          throw new Error('User not found or missing role. ' + (userError?.message || ''));
        }
        userRole = users[0].role;
      }
      if (userRole !== 'admin' && userRole !== 'employee') {
        throw new Error('Invalid user role.');
      }
      setLoginAttempts(0); // reset on success
      onLogin(userRole);
      // Immediately redirect to root to trigger session check and dashboard redirect
      router.replace('/');
    } catch (e: unknown) {
      let message = 'Unknown error';
      if (e instanceof Error) {
        console.error('Exception during auth:', e);
        message = e.message;
      } else {
        console.error('Exception during auth:', JSON.stringify(e));
        message = JSON.stringify(e) || 'Unknown error';
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
      Alert.alert('Login failed', message);
    } finally {
      setLoading(false);
    }
  };

  // New: Employee login handler
  const handleEmployeeLogin = async () => {
    if (!businessCode) {
      Alert.alert('Missing Code', 'Please enter your business code.');
      return;
    }
    setLoading(true);
    try {
      const business = await getBusinessByCode(businessCode.trim());
      if (!business) {
        throw new Error('Invalid business code. Please check with your admin.');
      }
      // Store business info in session (or context)
      // This part of the code was removed as per the edit hint.
      // The original code had `await setSession('employee-business', JSON.stringify(business));`
      // which is no longer needed.
      onLogin('employee');
      router.replace('/employee-dashboard');
    } catch (e: any) {
      Alert.alert('Login failed', e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.centered}>
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}> 
            {/* Toggle between admin and employee login */}
            <View style={{ flexDirection: 'row', marginBottom: 16, justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => setIsEmployeeLogin(false)} style={{ marginRight: 16 }}>
                <Text style={{ color: !isEmployeeLogin ? '#1976d2' : '#888', fontWeight: !isEmployeeLogin ? 'bold' : 'normal', fontSize: 16 }}>Admin Login</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setIsEmployeeLogin(true)}>
                <Text style={{ color: isEmployeeLogin ? '#1976d2' : '#888', fontWeight: isEmployeeLogin ? 'bold' : 'normal', fontSize: 16 }}>Employee Login</Text>
              </TouchableOpacity>
            </View>
            {!isEmployeeLogin ? (
              // Admin login UI (unchanged)
              <>
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
                  <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Don&apos;t have an account? Sign Up</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowReset(true)} style={{ marginTop: 12 }}>
                  <Text style={{ color: '#1976d2', textAlign: 'center' }}>Forgot Password?</Text>
                </TouchableOpacity>
                {onTest && (
                  <TouchableOpacity onPress={onTest} style={{ marginTop: 24 }}>
                    <Text style={{ color: '#1976d2', textAlign: 'center' }}>Test Supabase Connection</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              // Employee login UI (business code only)
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Business Code"
                  value={businessCode}
                  onChangeText={setBusinessCode}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholderTextColor="#b0b8c1"
                  returnKeyType="done"
                  editable={!loading}
                  onSubmitEditing={handleEmployeeLogin}
                />
                <TouchableOpacity style={styles.loginBtn} onPress={handleEmployeeLogin} disabled={loading}>
                  <Text style={styles.loginBtnText}>{loading ? 'Logging in...' : 'Login'}</Text>
                </TouchableOpacity>
              </>
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
  // Add state for generated business code
  const [generatedBusinessCode, setGeneratedBusinessCode] = useState('');
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  // Cooldown timer effect
  useEffect(() => {
    if (signupCooldown > 0) {
      const timer = setTimeout(() => setSignupCooldown(signupCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [signupCooldown]);
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

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
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter both email and password.');
      return;
    }
    if (passwordStrength === 'weak') {
      Alert.alert('Weak Password', 'Please choose a stronger password.');
      return;
    }
    setLoading(true);
    try {
      // Check if a Supabase session exists before starting
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        Alert.alert('Already Logged In', 'You are already logged in. Please log out first.');
        return;
      }

      let business_id = null;
      
      // Step 1: Register user with Supabase Auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            name: name,
            role: role
            // business_id will be set after business creation for admin
          }
        }
      });
      console.log('Auth signUp result:', { authData, signUpError });
      if (signUpError) {
        if (signUpError.message.toLowerCase().includes('already registered')) {
          throw new Error('This email is already registered. Please log in or use a different email.');
        }
        if (signUpError.message.toLowerCase().includes('rate limit exceeded')) {
          setSignupCooldown(10); // Set cooldown for 10 seconds
          throw new Error('Too many sign-up attempts. Please try again in a few seconds.');
        }
        throw new Error('Auth sign up failed: ' + signUpError.message + ' (full error: ' + JSON.stringify(signUpError) + ')');
      }
      if (!authData.user) {
        throw new Error('User not returned from sign up.');
      }

      // Step 2: Wait for confirmation that the user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error('Failed to get session after signup: ' + sessionError.message);
      }
      if (!session) {
        throw new Error('No session found after signup. Please try again.');
      }

      // Step 3: Now handle business creation/assignment based on role
      if (role === 'admin') {
        // Create new business with code
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .insert({ name: businessName, code: businessCode })
          .select('id,code')
          .single();
        if (businessError || !business) {
          if (businessError?.message?.toLowerCase().includes('duplicate')) {
            throw new Error('This business name or code is already in use. Please choose a different one.');
          }
          throw new Error('Failed to create business: ' + (businessError?.message || 'Unknown error'));
        }
        business_id = business.id;
        setGeneratedBusinessCode(business.code);
      } else {
        // Employee: resolve business by code or UUID
        business_id = await resolveBusinessId(businessCode);
        if (!business_id) {
          throw new Error('Invalid business code. Please check with your admin.');
        }
      }

      // Step 4: Update user with business_id using authData.user.id
      const { error: userError } = await supabase
        .from('users')
        .update({ name, role, business_id })
        .eq('id', authData.user.id);
      console.log('User update result:', { userError });
      if (userError) {
        throw new Error('User update failed: ' + userError.message + ' (full error: ' + JSON.stringify(userError) + ')');
      }

      Alert.alert('Check your email', 'Registration successful! Please check your email to confirm your account before logging in.');
      setTimeout(onBack, 1200); // Delay to allow alert to show
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
        {role === 'admin' && (
          <>
            <Text style={styles.inputLabel}>Business Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              editable={!loading}
            />
            <Text style={styles.inputLabel}>Business Code (share with employees)</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a business code (e.g. SCC123)"
              value={businessCode}
              onChangeText={setBusinessCode}
              autoCapitalize="characters"
              editable={!loading}
              maxLength={12}
            />
            {generatedBusinessCode ? (
              <Text style={{ color: '#388e3c', fontWeight: 'bold', marginTop: 8 }}>
                Business code created: {generatedBusinessCode}
              </Text>
            ) : null}
          </>
        )}
        {role === 'employee' && (
          <>
            <Text style={styles.inputLabel}>Business Code</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your business code"
              value={businessCode}
              onChangeText={setBusinessCode}
              autoCapitalize="characters"
              editable={!loading}
              maxLength={12}
            />
          </>
        )}
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
  inputLabel: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
    alignSelf: 'flex-start',
    marginLeft: 10,
  },
});
