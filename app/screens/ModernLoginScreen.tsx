import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { ThemedText } from '../../components/ThemedText';
import { supabase } from '../../lib/supabase';
import { layoutStyles } from '../../constants/ModernStyles';
import { spacing } from '../../constants/DesignTokens';

export default function ModernLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={layoutStyles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={layoutStyles.centerContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Icon Section */}
          <View style={{ alignItems: 'center', marginBottom: spacing['3xl'] }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#f0f9ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.lg,
              }}
            >
              <FontAwesome5 name="store" size={32} color="#0ea5e9" />
            </View>
            
            <ThemedText type="h1" style={{ textAlign: 'center', marginBottom: spacing.xs }}>
              Welcome Back
            </ThemedText>
            
            <ThemedText type="bodySecondary" style={{ textAlign: 'center' }}>
              Sign in to your ShopFlow account
            </ThemedText>
          </View>

          {/* Login Form */}
          <Card variant="elevated" style={{ width: '100%', maxWidth: 400 }}>
            <View style={{ gap: spacing.md }}>
              <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                autoComplete="password"
              />

              {error ? (
                <ThemedText type="caption" style={{ color: '#ef4444', textAlign: 'center' }}>
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
                onPress={() => {
                  // Handle forgot password
                }}
              >
                Forgot Password?
              </Button>
            </View>
          </Card>

          {/* Footer */}
          <View style={{ marginTop: spacing['2xl'], alignItems: 'center' }}>
            <ThemedText type="caption">
              Need help? Contact support
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
