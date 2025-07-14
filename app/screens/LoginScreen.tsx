import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { createShadowStyle } from '../../utils/shadowUtils';
import { resolveBusinessId } from './resolveBusinessId';

type LoginScreenProps = {
  onLogin: (role: 'admin' | 'employee') => void,
  setSession?: (key: string, value: string) => Promise<void>
};

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

export default function LoginScreen({ onLogin, setSession }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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
      
      // Store session securely (cross-platform)
      if (signInData?.session) {
        await sessionSetter('supabase-session', JSON.stringify(signInData.session));
      }
      
      // Check if email is confirmed
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
      
      // Fetch user data from users table
      let userRole = null;
      let businessId = null;
      if (signInData?.user) {
        const { id, email, user_metadata } = signInData.user;
        const { name = '', role = '' } = user_metadata || {};
        
        // Upsert user into users table after login
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({ id, email, name, role }, { onConflict: 'id' });
        if (upsertError) {
          console.warn('User upsert error:', upsertError);
        }
        
        // Fetch user role and business association
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('role, business_id')
          .eq('id', id)
          .limit(1);
        if (userError || !users || users.length === 0) {
          console.warn('User fetch error or not found:', userError, users);
          throw new Error('User not found or missing role. ' + (userError?.message || ''));
        }
        
        userRole = users[0].role;
        businessId = users[0].business_id;
        
        // Store business association if exists
        if (businessId) {
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('*')
            .eq('id', businessId)
            .single();
          if (!businessError && business) {
            await sessionSetter('user-business', JSON.stringify(business));
          }
        }
      }
      
      if (userRole !== 'admin' && userRole !== 'employee') {
        throw new Error('Invalid user role.');
      }
      
      setLoginAttempts(0); // reset on success
      onLogin(userRole);
      
      // Redirect to appropriate dashboard
      if (userRole === 'admin') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/employee-dashboard');
      }
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
}

function RegistrationScreen({ onBack, onSuccess }: { onBack: () => void, onSuccess: () => void }) {
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
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

  const handleRegister = async () => {
    console.log('Registration started', { email, role });
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
      const { data: { session: existingSession }, error: sessionCheckError } = await supabase.auth.getSession();
      if (sessionCheckError) {
        console.error('Error checking session:', sessionCheckError);
        Alert.alert('Error', 'Could not check session.');
        setLoading(false);
        return;
      }
      if (existingSession) {
        Alert.alert('Already Logged In', 'You are already logged in. Please log out first.');
        setLoading(false);
        return;
      }

      let business_id: string | null = null;

      const { data: authData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: { name, role }
        }
      });
      console.log('Sign up response:', { authData, signUpError });
      if (signUpError) {
        console.error('Sign up error:', signUpError);
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
        console.error('No user returned from sign up:', authData);
        Alert.alert('Registration failed', 'User not returned from sign up.');
        setLoading(false);
        return;
      }

      // Wait for session to be available
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session after signup:', { session, sessionError });
      if (sessionError) {
        console.error('Session error after signup:', sessionError);
        Alert.alert('Failed to get session after signup', sessionError.message);
        setLoading(false);
        return;
      }
      if (!session) {
        console.error('No session found after signup.');
        Alert.alert('No session found after signup. Please try again.');
        setLoading(false);
        return;
      }

      if (role === 'admin') {
        const { data: business, error: businessError } = await supabase
          .from('businesses')
          .insert({ name: businessName, code: businessCode })
          .select('id,code')
          .single();
        console.log('Business creation response:', { business, businessError });
        if (businessError || !business) {
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
        business_id = business.id;
        setGeneratedBusinessCode(business.code);
      } else {
        business_id = await resolveBusinessId(businessCode);
        console.log('Resolved business_id:', business_id);
        if (!business_id) {
          Alert.alert('Invalid business code. Please check with your admin.');
          setLoading(false);
          return;
        }
      }

      const { error: userError } = await supabase
        .from('users')
        .update({ name, role, business_id })
        .eq('id', authData.user.id);
      console.log('User update response:', { userError });
      if (userError) {
        console.error('User update error:', userError);
        Alert.alert('User update failed', userError.message);
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      console.error('Registration error:', err);
      Alert.alert('Registration failed', err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
// Removed duplicate/invalid registration logic after handleRegister

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
              placeholderTextColor="#b0b8c1"
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
              placeholderTextColor="#b0b8c1"
            />
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
              placeholderTextColor="#b0b8c1"
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
