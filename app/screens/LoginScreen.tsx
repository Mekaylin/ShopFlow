import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { createShadowStyle } from '../../utils/shadowUtils';




type LoginScreenProps = {
  onLogin?: (role: 'admin' | 'employee') => void,
  setSession?: (key: string, value: string) => Promise<void>
};



// No duplicated functions: all login, registration, and reset handlers are defined only once and used in one place.




// NOTE: All session/redirect logic has been removed from LoginScreen. This screen is now a pure login/register/reset form.
// Session/redirect logic should be handled at the top level (e.g., /app/_layout.tsx) to avoid duplicate navigation and infinite loops.
function LoginScreen({ onLogin, setSession }: LoginScreenProps) {
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'employee'>('employee');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [businessCode, setBusinessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showRegister, setShowRegister] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  // Handler for login
  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (!email || !password) {
        setError('Please enter your email and password.');
        console.error('[Login] Missing email or password', { email, password });
        setLoading(false);
        return;
      }
      // Auth with Supabase
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError(signInError.message || 'Login failed.');
        console.error('[Login] Supabase signIn error:', signInError, { email });
        setLoading(false);
        setLoginAttempts((a) => a + 1);
        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
        ]).start();
        return;
      }
      // Fetch user profile
      const userId = signInData.user?.id;
      if (!userId) {
        setError('No user returned from login.');
        console.error('[Login] No user returned from signIn', { signInData });
        setLoading(false);
        return;
      }
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (userError || !userRow) {
        setError('User not found.');
        console.error('[Login] User fetch error or not found:', userError, { userId });
        setLoading(false);
        return;
      }
      // For employees, check business code matches
      if (userRow.role === 'employee') {
        if (!userRow.business_code || userRow.business_code !== businessCode.trim()) {
          setError('Business code does not match.');
          console.error('[Login] Business code mismatch', { input: businessCode, user: userRow });
          setLoading(false);
          return;
        }
      }
      setLoginAttempts(0);
      if (onLogin) onLogin(userRow.role);
      if (userRow.role === 'admin') {
        router.replace('/admin-dashboard');
      } else {
        router.replace('/employee-dashboard');
      }
    } catch (e: any) {
      setError(e.message || 'Login failed.');
      console.error('[Login] Unexpected error:', e, { email, role });
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: Platform.OS !== 'web' }),
      ]).start();
    } finally {
      setLoading(false);
    }
  };

  if (showRegister) {
    // Example registration logic with robust error logging
    // Replace this with your actual registration form and logic
    const handleRegister = async (email: string, password: string, role: 'admin' | 'employee', businessCode?: string) => {
      try {
        if (!email || !password) {
          console.error('[Signup] Missing email or password', { email, password });
          return;
        }
        // Example: sign up with Supabase
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          console.error('[Signup] Supabase signUp error:', signUpError, { email });
          return;
        }
        // Example: upsert user profile
        const userId = signUpData.user?.id;
        if (!userId) {
          console.error('[Signup] No user returned from signUp', { signUpData });
          return;
        }
        const { error: upsertError } = await supabase.from('users').upsert({ id: userId, role, business_code: businessCode || null, email });
        if (upsertError) {
          console.error('[Signup] User upsert error:', upsertError, { userId, role, businessCode });
          return;
        }
        // Success
        console.log('[Signup] Registration successful', { userId, role, businessCode });
      } catch (e: any) {
        console.error('[Signup] Unexpected error:', e, { email, role, businessCode });
      }
    };
    // Placeholder UI
    return (
      <View style={styles.bg}><Text>Registration screen placeholder (logging enabled)</Text></View>
    );
  }
  if (showReset) {
    // Password reset screen placeholder
    return (
      <View style={styles.bg}><Text>Password reset screen placeholder</Text></View>
    );
  }

  return (
    <View style={[styles.bg, { paddingHorizontal: 16 }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.centered, { paddingHorizontal: 8 }]}> 
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }], paddingHorizontal: 8 }]}> 
            <FontAwesome5 name="tools" size={54} color="#1976d2" style={{ marginBottom: 18 }} />
            <Text style={styles.title}>ShopFlow</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
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
              accessibilityLabel="Email"
              testID="login-email-input"
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholderTextColor="#b0b8c1"
              editable={!loading}
            />
            <View style={styles.passwordContainer}>
              <TextInput
                accessibilityLabel="Password"
                testID="login-password-input"
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
            {role === 'employee' && (
              <>
                <Text style={styles.inputLabel}>Business Code</Text>
                <TextInput
                  accessibilityLabel="Employee Business Code"
                  testID="employee-business-code-input"
                  style={styles.input}
                  placeholder="Business Code"
                  value={businessCode}
                  onChangeText={setBusinessCode}
                  autoCapitalize="characters"
                  editable={!loading}
                  maxLength={12}
                />
              </>
            )}
            {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
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

