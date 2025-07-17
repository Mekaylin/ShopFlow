
// Only one set of imports
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Animated, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// Only one styles object, above the component
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
    // Shadow properties (from createShadowStyle)
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
    // Shadow properties (from createShadowStyle)
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

const LoginScreen: React.FC<{ onLogin?: (role: 'admin' | 'employee') => void, setSession?: (key: string, value: string) => Promise<void> }> = ({ onLogin, setSession }) => {
  // Registration state (admin only)
  const [name, setName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  // Login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const shakeAnim = React.useRef(new Animated.Value(0)).current;
  const router = useRouter();

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
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password: password.trim() });
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
      // Only allow admin login
      if (userRow.role !== 'admin') {
        setError('Only admin login is allowed.');
        setLoading(false);
        return;
      }
      setLoginAttempts(0);
      if (onLogin) onLogin('admin');
      router.replace('/admin-dashboard');
    } catch (e: any) {
      setError(e.message || 'Login failed.');
      console.error('[Login] Unexpected error:', e, { email });
    } finally {
      setLoading(false);
    }
  };

  // Render
  if (showRegister) {
    return (
      <View style={styles.bg}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.centered, { paddingHorizontal: 8 }]}> 
            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }], paddingHorizontal: 8 }]}> 
              <FontAwesome5 name="tools" size={54} color="#1976d2" style={{ marginBottom: 18 }} />
              <Text style={styles.title}>ShopFlow</Text>
              <Text style={styles.subtitle}>Admin Registration</Text>
              <TextInput
                style={styles.input}
                placeholder="Name"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                editable={!regLoading}
                placeholderTextColor="#b0b8c1"
              />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                placeholderTextColor="#b0b8c1"
                editable={!regLoading}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                editable={!regLoading}
                placeholderTextColor="#b0b8c1"
              />
              {regError ? <Text style={{ color: '#c62828', marginBottom: 8 }}>{regError}</Text> : null}
              <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={regLoading}>
                {regLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      Signing Up...
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.loginBtnText}>Sign Up</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRegister(false)} style={{ marginTop: 16 }}>
                <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Back to Login</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // Show login form if not registering
  return (
    <View style={styles.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={[styles.centered, { paddingHorizontal: 8 }]}> 
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }], paddingHorizontal: 8 }]}> 
            <FontAwesome5 name="tools" size={54} color="#1976d2" style={{ marginBottom: 18 }} />
            <Text style={styles.title}>ShopFlow</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
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
            {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowRegister(true)} style={{ marginTop: 16 }}>
              <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Don&apos;t have an account? Sign Up</Text>
            </TouchableOpacity>
            {/* Password reset and other actions can be added here if needed */}
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default LoginScreen;

//

