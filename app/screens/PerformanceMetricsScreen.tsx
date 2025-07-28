import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { PerformanceMetrics } from '../../components/utility/types';
import { supabase } from '../../lib/supabase';

const PerformanceMetricsScreen: React.FC = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const businessId = params.businessId as string;
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!businessId) {
      setError('Business ID is missing.');
      setLoading(false);
      return;
    }
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('performance_metrics')
          .select('*')
          .eq('business_id', businessId);
        if (error) {
          setError(error.message || 'Failed to fetch metrics.');
          setMetrics([]);
        } else {
          setMetrics(data || []);
        }
      } catch (err: any) {
        setError(err?.message || 'Unexpected error fetching metrics.');
        setMetrics([]);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, [businessId]);

  return (
    <View style={{ flex: 1, backgroundColor: '#f5faff', paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e3f2fd', paddingHorizontal: 0 }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 16 }}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1976d2' }}>Performance Metrics</Text>
      </View>
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={{ marginTop: 12, color: '#1976d2' }}>Loading metrics...</Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
          <Image
            source={require('../../assets/images/1-2943d931.png')}
            style={{ width: 120, height: 120, marginBottom: 20 }}
            resizeMode="contain"
          />
          <Text style={{ color: '#c62828', fontSize: 16, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 0 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <Image
              source={require('../../assets/images/1-2943d931.png')}
              style={{ width: 120, height: 120 }}
              resizeMode="contain"
            />
          </View>
          {metrics.length === 0 ? (
            (() => { alert('No performance metrics found for this business.'); return <Text style={{ color: '#888', fontSize: 16, textAlign: 'center' }}>No performance metrics found.</Text>; })()
          ) : (
            metrics.map((m, idx) => (
              <View key={m.employee_id || idx} style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 14, shadowColor: '#1976d2', shadowOpacity: 0.06, shadowRadius: 6, elevation: 1, paddingHorizontal: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1976d2', marginBottom: 4 }}>{m.employee_name}</Text>
                <Text style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>Total Tasks: {m.total_tasks}</Text>
                <Text style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>Completed Tasks: {m.completed_tasks}</Text>
                <Text style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>Average Rating: {m.average_rating}</Text>
                <Text style={{ fontSize: 15, color: '#333', marginBottom: 2 }}>Performance Score: {m.performance_score}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default PerformanceMetricsScreen;
