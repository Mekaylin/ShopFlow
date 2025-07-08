import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [showSetPassword, setShowSetPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Supabase sends tokens in the URL hash for web
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setShowSetPassword(true);
      return;
    }
    // Use exchangeCodeForSession for deep linking
    const doExchange = async () => {
      setLoading(true);
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) {
          if (
            error.message.includes('JWT expired') ||
            error.message.includes('invalid')
          ) {
            Alert.alert('Link expired', 'Please request a new confirmation email.');
            router.replace('/login');
          } else {
            setError(error.message);
            router.replace('/login');
          }
        } else {
          router.replace('/');
        }
      } catch (e: unknown) {
        const err = e as any;
        setError(err.message || JSON.stringify(err) || 'Unknown error');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    doExchange();
  }, [router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setError(error.message);
      } else {
        router.replace('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (showSetPassword) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Set a New Password</h2>
        <form onSubmit={handleSetPassword} style={{ marginTop: 24 }}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            style={{ padding: 8, fontSize: 16, width: 240 }}
            disabled={loading}
          />
          <br />
          <button type="submit" style={{ marginTop: 16, padding: '8px 24px', fontSize: 16 }} disabled={loading}>
            {loading ? 'Setting...' : 'Set Password'}
          </button>
        </form>
        {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Completing sign up...</h2>
        <ActivityIndicator size="large" color="#1976d2" />
        <p>If you are not redirected, please <a href="/">click here</a>.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Completing sign up...</h2>
      <p>If you are not redirected, please <a href="/">click here</a>.</p>
    </div>
  );
} 