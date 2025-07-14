import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, Text, TextInput, TouchableOpacity, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase sends tokens in the URL hash for web
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash.includes('type=recovery')) {
      setShowSetPassword(true);
      return;
    }
    // Use exchangeCodeForSession for deep linking
    const doExchange = async () => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(
          typeof window !== 'undefined' ? window.location.href : ''
        );
        if (error) {
          if (
            error.message.includes('JWT expired') ||
            error.message.includes('invalid')
          ) {
            setError('Link expired. Please request a new confirmation email.');
            router.replace('/admin-dashboard');
          } else {
            setError(error.message);
            router.replace('/admin-dashboard');
          }
        } else {
          router.replace('/admin-dashboard');
        }
      } catch (e: unknown) {
        const err = e as any;
        setError(err.message || JSON.stringify(err) || 'Unknown error');
        router.replace('/admin-dashboard');
      } finally {
        setLoading(false);
      }
    };
    doExchange();
  }, [router]);

  const handleSetPassword = async () => {
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
      } else {
        router.replace('/employee-dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (showSetPassword) {
    return (
      <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Set a New Password</Text>
        <TextInput
          secureTextEntry
          placeholder="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          style={{
            padding: 8,
            fontSize: 16,
            width: 240,
            borderWidth: 1,
            borderColor: '#ccc',
            borderRadius: 6,
            marginBottom: 16,
          }}
          editable={!loading}
          accessibilityLabel="New Password"
        />
        <TouchableOpacity
          onPress={handleSetPassword}
          disabled={loading || !newPassword}
          style={{
            backgroundColor: loading || !newPassword ? '#b0bec5' : '#1976d2',
            paddingVertical: 10,
            paddingHorizontal: 24,
            borderRadius: 8,
            marginBottom: 8,
            opacity: loading || !newPassword ? 0.7 : 1,
          }}
          accessibilityRole="button"
          accessibilityLabel="Set Password"
          accessible
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>
            {loading ? 'Setting...' : 'Set Password'}
          </Text>
        </TouchableOpacity>
        {error ? (
          <Text style={{ color: 'red', marginTop: 12 }}>{error}</Text>
        ) : null}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Completing sign up...</Text>
        <ActivityIndicator size="large" color="#1976d2" />
        <Text style={{ marginTop: 16 }}>
          If you are not redirected, please{' '}
          <Text
            style={{ color: '#1976d2', textDecorationLine: 'underline' }}
            onPress={() => router.replace('/')}
            accessibilityRole="link"
          >
            click here
          </Text>
          .
        </Text>
      </View>
    );
  }

  return (
    <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>Completing sign up...</Text>
      <Text style={{ marginTop: 16 }}>
        If you are not redirected, please{' '}
        <Text
          style={{ color: '#1976d2', textDecorationLine: 'underline' }}
          onPress={() => router.replace('/')}
          accessibilityRole="link"
        >
          click here
        </Text>
        .
      </Text>
    </View>
  );
}