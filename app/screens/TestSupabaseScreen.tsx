import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Button, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function TestSupabaseScreen({ onBack }: { onBack?: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .then(({ data, error }) => {
        if (error) {
          setError(error.message);
        } else {
          setUsers(data || []);
        }
        setLoading(false);
      });
  }, []);

  // Add a function to test the Supabase connection
  async function testSupabaseConnection() {
    try {
      const { data, error } = await supabase
        .from('businesses') // or any public table
        .select('*')
        .limit(1);
      if (error) {
        console.log('Supabase test error:', error);
        Alert.alert('Supabase test error', error.message);
      } else {
        console.log('Supabase test data:', data);
        Alert.alert('Supabase test succeeded!', JSON.stringify(data));
      }
    } catch (err: any) {
      console.log('Supabase test exception:', err);
      Alert.alert('Supabase test exception', err.message);
    }
  }

  return (
    <View style={{ flex: 1, padding: 20, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafd' }}>
      <Text style={{ fontWeight: 'bold', fontSize: 20, marginBottom: 16 }}>Supabase Test Screen</Text>
      <Button title="Test Supabase Connection" onPress={testSupabaseConnection} />
      <View style={{ marginTop: 32, width: '100%' }}>
        {loading ? (
          <View style={{ alignItems: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading users table...</Text>
          </View>
        ) : error ? (
          <Text style={{ color: 'red', marginTop: 8 }}>Error: {error}</Text>
        ) : (
          <>
            <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>Users Table:</Text>
            {users.length === 0 ? (
              <Text>No users found.</Text>
            ) : (
              users.map((u, i) => (
                <Text key={i} style={{ fontSize: 12, marginBottom: 2 }}>{JSON.stringify(u)}</Text>
              ))
            )}
          </>
        )}
      </View>
      {onBack && (
        <Text
          onPress={onBack}
          style={{ color: '#1976d2', marginTop: 32, textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}
        >
          Back to Login
        </Text>
      )}
    </View>
  );
}
