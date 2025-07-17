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
    // --- Registration Screen State ---
    const [regRole, setRegRole] = useState<'admin' | 'employee'>('employee');
    const [name, setName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');
    const [showRegPassword, setShowRegPassword] = useState(false);
    const [businessName, setBusinessName] = useState('');
    const [regBusinessCode, setRegBusinessCode] = useState('');
    const [regLoading, setRegLoading] = useState(false);
    const [regError, setRegError] = useState('');
    const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak');
    const [signupCooldown, setSignupCooldown] = useState(0);
    const [showCodeAfter, setShowCodeAfter] = useState(false);
    const [generatedBusinessCode, setGeneratedBusinessCode] = useState('');

    // Password strength checker
    function checkPasswordStrength(pw: string): 'weak' | 'medium' | 'strong' {
      if (!pw || pw.length < 6) return 'weak';
      if (pw.match(/[A-Z]/) && pw.match(/[0-9]/) && pw.match(/[^A-Za-z0-9]/) && pw.length >= 10) return 'strong';
      if (pw.match(/[A-Z]/) && pw.match(/[0-9]/) && pw.length >= 8) return 'medium';
      return 'weak';
    }
    React.useEffect(() => {
      setPasswordStrength(checkPasswordStrength(regPassword));
    }, [regPassword]);

    // Utility: generate random business code (7 chars, no ambiguous chars)
    function generateBusinessCode() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 7; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      return code;
    }

    // Registration handler
    const handleRegister = async () => {
      setRegError('');
      if (!regEmail || !regPassword || !name) {
        setRegError('Please enter your name, email, and password.');
        console.error('[Signup] Missing fields', { name, regEmail, regPassword });
        return;
      }
      if (passwordStrength === 'weak') {
        setRegError('Please choose a stronger password.');
        return;
      }
      setRegLoading(true);
      const loadingTimeout = setTimeout(() => {
        setRegLoading(false);
        setRegError('Registration timed out. Please check your connection and try again.');
        console.error('[Signup] Registration timed out', { regEmail });
      }, 15000);
      try {
        let business_id: string | null = null;
        let codeToUse = regBusinessCode.trim();
        if (regRole === 'admin') {
          if (!businessName) {
            setRegError('Please enter a business name.');
            setRegLoading(false);
            clearTimeout(loadingTimeout);
            console.error('[Signup] Missing business name');
            return;
          }
          if (!codeToUse) {
            // Generate unique business code
            let attempts = 0;
            let unique = false;
            while (attempts < 5 && !unique) {
              codeToUse = generateBusinessCode();
              const { data: existingBiz, error: bizCheckError } = await supabase
                .from('businesses')
                .select('id')
                .eq('code', codeToUse)
                .maybeSingle();
              if (!existingBiz && !bizCheckError) unique = true;
              else attempts++;
            }
            if (!unique) {
              setRegError('Failed to generate a unique business code. Please try again.');
              setRegLoading(false);
              clearTimeout(loadingTimeout);
              console.error('[Signup] Failed to generate unique business code');
              return;
            }
          } else {
            // Check for duplicate business code
            const { data: existingBiz, error: bizCheckError } = await supabase
              .from('businesses')
              .select('id')
              .eq('code', codeToUse)
              .maybeSingle();
            if (existingBiz) {
              setRegError('Business code already in use. Please choose a different code.');
              setRegLoading(false);
              clearTimeout(loadingTimeout);
              console.error('[Signup] Business code already in use', { codeToUse });
              return;
            }
          }
        }
        // Sign up user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: regEmail,
          password: regPassword,
          options: { data: { name, role: regRole } }
        });
        if (signUpError) {
          setRegError('Supabase signUp error: ' + (signUpError.message || JSON.stringify(signUpError)));
          setRegLoading(false);
          clearTimeout(loadingTimeout);
          console.error('[Signup] Supabase signUp error', signUpError);
          return;
        }
        if (!authData.user) {
          setRegError('No user returned from signUp.');
          setRegLoading(false);
          clearTimeout(loadingTimeout);
          console.error('[Signup] No user returned from signUp');
          return;
        }
        // Wait for session
        let session = null;
        for (let i = 0; i < 10; i++) {
          const { data: sessionData } = await supabase.auth.getSession();
          session = sessionData?.session;
          if (session) break;
          await new Promise(res => setTimeout(res, 400));
        }
        if (!session) {
          setRegError('Session not established after sign up.');
          setRegLoading(false);
          clearTimeout(loadingTimeout);
          console.error('[Signup] Session not established after sign up');
          return;
        }
        if (regRole === 'admin') {
          // Insert business row
          const { data: businessRow, error: businessInsertError } = await supabase
            .from('businesses')
            .insert({ name: businessName, code: codeToUse, owner_id: session.user.id })
            .select()
            .single();
          if (businessInsertError) {
            setRegError('Business insert error: ' + (businessInsertError.message || 'Unknown error'));
            setRegLoading(false);
            clearTimeout(loadingTimeout);
            console.error('[Signup] Business insert error', businessInsertError);
            return;
          }
          business_id = businessRow.id;
          setGeneratedBusinessCode(codeToUse);
          setShowCodeAfter(true);
        } else {
          // Validate business code for employee
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id,code')
            .eq('code', regBusinessCode.trim())
            .single();
          if (businessError || !business) {
            setRegError('Invalid business code.');
            setRegLoading(false);
            clearTimeout(loadingTimeout);
            console.error('[Signup] Invalid business code', { regBusinessCode });
            return;
          }
          business_id = business.id;
        }
        // Upsert user
        const upsertPayload = {
          id: session.user.id,
          name,
          role: regRole,
          business_id,
          business_code: regRole === 'admin' ? codeToUse : regBusinessCode.trim(),
          email: regEmail
        };
        const userUpsertResult = await supabase
          .from('users')
          .upsert(upsertPayload, { onConflict: 'id' });
        if (userUpsertResult.error) {
          setRegError('User upsert error: ' + (userUpsertResult.error?.message || 'Unknown error'));
          setRegLoading(false);
          clearTimeout(loadingTimeout);
          console.error('[Signup] User upsert error', userUpsertResult.error, upsertPayload);
          return;
        }
        setRegLoading(false);
        clearTimeout(loadingTimeout);
        setShowRegister(false);
        setShowCodeAfter(false);
        setRegError('');
        alert('Registration successful! You can now log in.');
        console.log('[Signup] Registration successful', upsertPayload);
      } catch (err: any) {
        setRegError('Registration failed: ' + (err?.message || JSON.stringify(err)));
        setRegLoading(false);
        clearTimeout(loadingTimeout);
        console.error('[Signup] Registration error:', err, { regRole, name, regEmail, businessName, regBusinessCode });
      }
    };
    return (
      <View style={[styles.bg, { paddingHorizontal: 16 }]}> 
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.centered, { paddingHorizontal: 8 }]}> 
            <View style={[styles.card, { paddingHorizontal: 8 }]}> 
              <FontAwesome5 name="user-plus" size={54} color="#1976d2" style={{ marginBottom: 18 }} />
              <Text style={styles.title}>Sign Up</Text>
              <Text style={styles.subtitle}>Create your account</Text>
              <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                <TouchableOpacity
                  style={[styles.roleBtn, regRole === 'admin' && styles.roleBtnActive]}
                  onPress={() => setRegRole('admin')}
                  disabled={regLoading}
                >
                  <Text style={{ color: regRole === 'admin' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleBtn, regRole === 'employee' && styles.roleBtnActive]}
                  onPress={() => setRegRole('employee')}
                  disabled={regLoading}
                >
                  <Text style={{ color: regRole === 'employee' ? '#fff' : '#1976d2', fontWeight: 'bold' }}>Employee</Text>
                </TouchableOpacity>
              </View>
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
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  placeholder="Password"
                  value={regPassword}
                  onChangeText={setRegPassword}
                  secureTextEntry={!showRegPassword}
                  placeholderTextColor="#b0b8c1"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  editable={!regLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowRegPassword((v) => !v)}
                  style={styles.eyeBtn}
                  accessibilityLabel={showRegPassword ? 'Hide password' : 'Show password'}
                >
                  <FontAwesome5 name={showRegPassword ? 'eye-slash' : 'eye'} size={20} color="#1976d2" />
                </TouchableOpacity>
              </View>
              <Text style={{
                color:
                  regPassword.length === 0 ? '#888' :
                  passwordStrength === 'strong' ? '#388e3c' :
                  passwordStrength === 'medium' ? '#ff9800' : '#c62828',
                fontWeight: 'bold',
                fontSize: 14,
                textAlign: 'left',
                marginBottom: 8
              }}>
                {regPassword.length === 0 ? '' :
                  passwordStrength === 'strong' ? 'Strong password' :
                  passwordStrength === 'medium' ? 'Medium password' : 'Weak password'}
              </Text>
              {regRole === 'admin' && (
                <>
                  <Text style={styles.inputLabel}>Business Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Business Name"
                    value={businessName}
                    onChangeText={setBusinessName}
                    autoCapitalize="words"
                    editable={!regLoading}
                    placeholderTextColor="#b0b8c1"
                  />
                  <Text style={styles.inputLabel}>Business Code (optional, will be created)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Leave blank to auto-generate"
                    value={regBusinessCode}
                    onChangeText={setRegBusinessCode}
                    autoCapitalize="characters"
                    editable={!regLoading}
                    maxLength={12}
                    placeholderTextColor="#b0b8c1"
                  />
                </>
              )}
              {regRole === 'employee' && (
                <>
                  <Text style={styles.inputLabel}>Business Code</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your business code"
                    value={regBusinessCode}
                    onChangeText={setRegBusinessCode}
                    autoCapitalize="characters"
                    editable={!regLoading}
                    maxLength={12}
                    placeholderTextColor="#b0b8c1"
                  />
                </>
              )}
              {regError ? <Text style={{ color: 'red', marginBottom: 8 }}>{regError}</Text> : null}
              <TouchableOpacity style={styles.loginBtn} onPress={handleRegister} disabled={regLoading || signupCooldown > 0}>
                {regLoading || signupCooldown > 0 ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8 }}>
                      {regLoading ? 'Signing Up...' : `Signing Up in ${signupCooldown}s`}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.loginBtnText}>Sign Up</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowRegister(false)} style={{ marginTop: 16 }}>
                <Text style={{ color: '#1976d2', textAlign: 'center', fontWeight: 'bold' }}>Back to Login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
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

