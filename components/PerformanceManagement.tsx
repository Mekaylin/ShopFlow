import { FontAwesome5 } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../lib/supabase';

import type { Business } from './utility/types';

interface PerformanceData {
  employee_id: string;
  employee_name: string;
  tasks_completed: number;
  average_rating: number;
  performance_score: number;
  tasks_rated: number;
}
interface PerformanceManagementProps {
  business: Business;
  onClose: () => void;
}

export default function PerformanceManagement({ business, onClose }: PerformanceManagementProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPerformanceData = useCallback(async (selectedPeriod: 'day' | 'week' | 'month') => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate: Date;
      let endDate: Date = now;

      // Calculate date range based on period
      switch (selectedPeriod) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          const dayOfWeek = now.getDay();
          const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      }

      // Fetch performance metrics
      const { data: metrics, error: metricsError } = await supabase
        .from('performance_metrics')
        .select(`
          employee_id,
          tasks_completed,
          average_rating,
          performance_score,
          tasks_rated,
          employees!inner(name)
        `)
        .eq('business_id', business.id)
        .eq('period_type', selectedPeriod)
        .gte('period_start', startDate.toISOString().split('T')[0])
        .lte('period_end', endDate.toISOString().split('T')[0])
        .order('performance_score', { ascending: false });

      if (metricsError) throw metricsError;

      // Transform data
      const transformedData: PerformanceData[] = (metrics || []).map((metric: any) => ({
        employee_id: metric.employee_id,
        employee_name: metric.employees.name,
        tasks_completed: metric.tasks_completed || 0,
        average_rating: parseFloat(metric.average_rating) || 0,
        performance_score: parseFloat(metric.performance_score) || 0,
        tasks_rated: metric.tasks_rated || 0,
      }));

      setPerformanceData(transformedData);
    } catch (error: any) {
      console.error('Error fetching performance data:', error);
      Alert.alert('Error', 'Failed to load performance data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [business.id]);

  const refreshPerformanceData = async () => {
    setRefreshing(true);
    await fetchPerformanceData(period);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPerformanceData(period);
  }, [period, business.id, fetchPerformanceData]);

  const renderPerformanceCard = (data: PerformanceData, index: number) => {
    const isTopPerformer = index === 0;
    const medalColor = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : '#666';

    return (
      <View key={data.employee_id} style={[styles.performanceCard, isTopPerformer && styles.topPerformerCard]}>
        <View style={styles.cardHeader}>
          <View style={styles.rankContainer}>
            {index < 3 ? (
              <FontAwesome5 name="medal" size={20} color={medalColor} />
            ) : (
              <Text style={styles.rankText}>{index + 1}</Text>
            )}
          </View>
          <Text style={styles.employeeName}>{data.employee_name}</Text>
          <Text style={styles.performanceScore}>{data.performance_score.toFixed(1)}</Text>
        </View>

        <View style={styles.metricsContainer}>
          <View style={styles.metric}>
            <FontAwesome5 name="tasks" size={16} color="#1976d2" />
            <Text style={styles.metricLabel}>Tasks</Text>
            <Text style={styles.metricValue}>{data.tasks_completed}</Text>
          </View>

          <View style={styles.metric}>
            <FontAwesome5 name="star" size={16} color="#FFD700" />
            <Text style={styles.metricLabel}>Rating</Text>
            <Text style={styles.metricValue}>{data.average_rating.toFixed(1)}</Text>
          </View>

          <View style={styles.metric}>
            <FontAwesome5 name="thumbs-up" size={16} color="#4CAF50" />
            <Text style={styles.metricLabel}>Rated</Text>
            <Text style={styles.metricValue}>{data.tasks_rated}</Text>
          </View>
        </View>

        {data.average_rating > 0 && (
          <View style={styles.ratingDisplay}>
            {[1, 2, 3, 4, 5].map((star) => (
              <FontAwesome5
                key={star}
                name={data.average_rating >= star ? 'star' : 'star-o'}
                size={12}
                color={data.average_rating >= star ? '#FFD700' : '#ccc'}
                style={{ marginRight: 2 }}
              />
            ))}
            <Text style={styles.ratingText}>({data.average_rating.toFixed(1)})</Text>
          </View>
        )}

        <TaskCommentsSection employeeId={data.employee_id} businessId={business.id} />
      </View>
    );
  };

  const renderPeriodTabs = () => (
    <View style={styles.periodTabs}>
      {(['day', 'week', 'month'] as const).map((p) => (
        <TouchableOpacity
          key={p}
          style={[styles.periodTab, period === p && styles.activePeriodTab]}
          onPress={() => setPeriod(p)}
        >
          <Text style={[styles.periodTabText, period === p && styles.activePeriodTabText]}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Performance Management</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <FontAwesome5 name="times" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {renderPeriodTabs()}

      <View style={styles.statsHeader}>
        <Text style={styles.statsTitle}>
          Top Performers - {period.charAt(0).toUpperCase() + period.slice(1)}
        </Text>
        <TouchableOpacity onPress={refreshPerformanceData} disabled={refreshing}>
          <FontAwesome5 
            name="sync-alt" 
            size={16} 
            color="#1976d2" 
            style={refreshing && styles.rotating}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976d2" />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {performanceData.length === 0 ? (
            <View style={styles.emptyState}>
              <FontAwesome5 name="chart-line" size={48} color="#ccc" />
              <Text style={styles.emptyStateText}>No performance data available</Text>
              <Text style={styles.emptyStateSubtext}>
                Complete and rate tasks to see performance metrics
              </Text>
            </View>
          ) : (
            performanceData.map((data, index) => renderPerformanceCard(data, index))
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Performance Score = (Tasks Completed × 0.7) + (Average Rating × 0.3)
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  closeButton: {
    padding: 8,
  },
  periodTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  activePeriodTab: {
    backgroundColor: '#1976d2',
  },
  periodTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  activePeriodTabText: {
    color: '#fff',
  },
  statsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rotating: {
    transform: [{ rotate: '360deg' }],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  performanceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topPerformerCard: {
    borderWidth: 2,
    borderColor: '#FFD700',
    backgroundColor: '#fffbf0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankContainer: {
    width: 30,
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  employeeName: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  performanceScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ratingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  ratingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

// Add a new section to show rated/completed tasks and allow comments
const TaskCommentsSection = ({ employeeId, businessId }: { employeeId: string, businessId: string }) => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  useEffect(() => {
    async function fetchRatedTasks() {
      setLoading(true);
      // Fetch all rated tasks for this employee
      const { data, error } = await supabase
        .from('task_ratings')
        .select('id, task_id, rating, feedback, rated_at, tasks(name, completed_at)')
        .eq('employee_id', employeeId)
        .eq('business_id', businessId)
        .order('rated_at', { ascending: false });
      if (!error && data) setTasks(data);
      setLoading(false);
    }
    fetchRatedTasks();
  }, [employeeId, businessId]);

  const handleSaveComment = async (taskRatingId: string) => {
    const { error } = await supabase
      .from('task_ratings')
      .update({ feedback: comment })
      .eq('id', taskRatingId);
    if (!error) {
      setTasks(tasks.map(t => t.id === taskRatingId ? { ...t, feedback: comment } : t));
      setEditingTaskId(null);
      setComment('');
    }
  };

  if (loading) return <Text style={{ color: '#666', fontStyle: 'italic', marginTop: 8 }}>Loading tasks...</Text>;
  if (tasks.length === 0) return <Text style={{ color: '#999', fontStyle: 'italic', marginTop: 8 }}>No rated tasks yet.</Text>;

  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 6 }}>Rated Tasks & Comments</Text>
      {tasks.map(task => (
        <View key={task.id} style={{ backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <Text style={{ fontWeight: 'bold', color: '#333' }}>{task.tasks?.name || 'Task'}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Completed: {task.tasks?.completed_at ? new Date(task.tasks.completed_at).toLocaleString() : 'N/A'}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <FontAwesome5 name="star" size={14} color="#FFD700" />
            <Text style={{ marginLeft: 6, color: '#333' }}>Rating: {task.rating}/5</Text>
          </View>
          <View style={{ marginTop: 6 }}>
            <Text style={{ color: '#666', fontSize: 13, marginBottom: 2 }}>Comment:</Text>
            {editingTaskId === task.id ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TextInput
                  style={{ flex: 1, borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 8, backgroundColor: '#fff', fontSize: 14 }}
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Leave a comment..."
                  multiline
                  numberOfLines={2}
                  maxLength={300}
                />
                <TouchableOpacity onPress={() => handleSaveComment(task.id)} style={{ marginLeft: 8, backgroundColor: '#1976d2', borderRadius: 8, padding: 8 }}>
                  <FontAwesome5 name="check" size={16} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setEditingTaskId(null); setComment(''); }} style={{ marginLeft: 4, backgroundColor: '#c62828', borderRadius: 8, padding: 8 }}>
                  <FontAwesome5 name="times" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#333', fontSize: 14, flex: 1 }}>{task.feedback || <Text style={{ color: '#bbb', fontStyle: 'italic' }}>No comment</Text>}</Text>
                <TouchableOpacity onPress={() => { setEditingTaskId(task.id); setComment(task.feedback || ''); }} style={{ marginLeft: 8 }}>
                  <FontAwesome5 name="edit" size={16} color="#1976d2" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}; 