import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    // Supabase sends tokens in the URL hash for web
    const hash = window.location.hash;
    if (hash) {
      const searchParams = new URLSearchParams(hash.replace('#', ''));
      const access_token = searchParams.get('access_token');
      const refresh_token = searchParams.get('refresh_token');
      const type = searchParams.get('type');

      if (access_token && refresh_token) {
        supabase.auth.setSession({
          access_token,
          refresh_token,
        }).then(() => {
          // Redirect to home after successful confirmation
          router.replace('/');
        });
      }
    }
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h2>Completing sign up...</h2>
      <p>If you are not redirected, please <a href="/">click here</a>.</p>
    </div>
  );
} 