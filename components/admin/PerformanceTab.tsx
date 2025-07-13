import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { Employee, PerformanceMetrics, PerformanceSettings, Task } from '../utility/types';
import PerformanceMetricsModal from './PerformanceMetricsModal';

import type { User } from '../utility/types';
interface PerformanceTabProps {
  user: User;
  employees: Employee[];
  tasks: Task[];
  performanceSettings: PerformanceSettings;
  setPerformanceSettings: (settings: PerformanceSettings) => void;
  darkMode: boolean;
}


const PerformanceTab: React.FC<PerformanceTabProps> = ({
  user,
  employees,
  tasks,
  performanceSettings,
  setPerformanceSettings,
  darkMode,
}) => {

  const businessId = user?.business_id;
  const [metricsModalVisible, setMetricsModalVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);


  // Performance calculation function
  const calculatePerformanceMetrics = async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing.');
      return;
    }
    try {
      const { error } = await supabase.rpc('calculate_performance_metrics', {
        business_id_param: businessId,
      });
      if (error) {
        console.error('Error calculating performance metrics:', error);
        Alert.alert('Error', 'Failed to calculate performance metrics.');
      } else {
        Alert.alert('Success', 'Performance metrics have been calculated and updated.');
      }
    } catch (error: any) {
      console.error('Error calculating performance metrics:', error);
      Alert.alert('Error', error?.message || 'Unknown error.');
    }
  };

  // Fetch and show detailed performance metrics
  const handleViewPerformance = async () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing.');
      return;
    }
    setLoadingMetrics(true);
    try {
      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('business_id', businessId);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to fetch metrics.');
        setMetrics([]);
      } else {
        setMetrics(data || []);
        setMetricsModalVisible(true);
      }
    } catch (err) {
      Alert.alert('Error', 'Unexpected error fetching metrics.');
      setMetrics([]);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Update performance settings
  const updatePerformanceSettings = async (newSettings: PerformanceSettings) => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing.');
      return;
    }
    try {
      const { error } = await supabase
        .from('performance_settings')
        .upsert({
          business_id: businessId,
          rating_system_enabled: newSettings.ratingSystemEnabled,
          auto_rate_completed_tasks: newSettings.autoRateCompletedTasks,
          default_rating: newSettings.defaultRating,
        });
      if (error) {
        console.error('Error updating performance settings:', error);
        Alert.alert('Error', 'Failed to update performance settings.');
      } else {
        setPerformanceSettings(newSettings);
        Alert.alert('Success', 'Performance settings updated successfully.');
      }
    } catch (error: any) {
      console.error('Error updating performance settings:', error);
      Alert.alert('Error', error?.message || 'Unknown error.');
    }
  };

  // Modular star rating UI
  const renderStarRating = () => (
    <View style={adminStyles.rowCenter}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <TouchableOpacity
          key={rating}
          onPress={() => updatePerformanceSettings({
            ...performanceSettings,
            defaultRating: rating
          })}
          style={adminStyles.starBtn}
        >
          <FontAwesome5
            name={performanceSettings.defaultRating >= rating ? 'star' : 'star-o'}
            size={20}
            color={performanceSettings.defaultRating >= rating ? '#FFD700' : '#ccc'}
          />
        </TouchableOpacity>
      ))}
      <Text style={adminStyles.starText}>
        ({performanceSettings.defaultRating}/5)
      </Text>
    </View>
  );

  return (
    <ScrollView style={darkMode ? adminStyles.darkContainer : adminStyles.container}>
      {/* Performance Settings */}
      <View style={darkMode ? adminStyles.darkCard : adminStyles.card}>
        <Text style={[adminStyles.sectionTitle, adminStyles.mb16]}>Performance Management</Text>
        {/* Rating System Settings */}
        <View style={adminStyles.mb16}>
          <Text style={adminStyles.ratingTitle}>Rating System</Text>
          <View style={adminStyles.mb12}>
            <TouchableOpacity
              style={[adminStyles.rowCenter, adminStyles.mb8]}
              onPress={() => updatePerformanceSettings({
                ...performanceSettings,
                ratingSystemEnabled: !performanceSettings.ratingSystemEnabled
              })}
            >
              <FontAwesome5
                name={performanceSettings.ratingSystemEnabled ? 'toggle-on' : 'toggle-off'}
                size={20}
                color={performanceSettings.ratingSystemEnabled ? '#4CAF50' : '#ccc'}
                style={adminStyles.mr8}
              />
              <Text style={adminStyles.toggleLabel}>
                Enable Task Rating System
              </Text>
            </TouchableOpacity>
          </View>
          <View style={adminStyles.mb12}>
            <TouchableOpacity
              style={[adminStyles.rowCenter, adminStyles.mb8]}
              onPress={() => updatePerformanceSettings({
                ...performanceSettings,
                autoRateCompletedTasks: !performanceSettings.autoRateCompletedTasks
              })}
            >
              <FontAwesome5
                name={performanceSettings.autoRateCompletedTasks ? 'toggle-on' : 'toggle-off'}
                size={20}
                color={performanceSettings.autoRateCompletedTasks ? '#4CAF50' : '#ccc'}
                style={adminStyles.mr8}
              />
              <Text style={adminStyles.toggleLabel}>
                Auto-rate Completed Tasks
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={adminStyles.ratingDesc}>
            Default Rating for Auto-rated Tasks:
          </Text>
          {renderStarRating()}
        </View>
        {/* Action Buttons */}
        <View style={adminStyles.rowBetween}>
          <TouchableOpacity
            style={[adminStyles.actionButton, adminStyles.bgPrimary, adminStyles.flex1, adminStyles.mr8]}
            onPress={handleViewPerformance}
            disabled={loadingMetrics}
          >
            <FontAwesome5 name="chart-line" size={16} color="#fff" style={adminStyles.mr8} />
            <Text style={adminStyles.actionButtonText}>{loadingMetrics ? 'Loading...' : 'View Performance'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[adminStyles.actionButton, adminStyles.bgSuccess, adminStyles.flex1, adminStyles.ml8]}
            onPress={calculatePerformanceMetrics}
          >
            <FontAwesome5 name="sync-alt" size={16} color="#fff" style={adminStyles.mr8} />
            <Text style={adminStyles.actionButtonText}>Recalculate</Text>
          </TouchableOpacity>
        </View>
        <PerformanceMetricsModal
          visible={metricsModalVisible}
          onClose={() => setMetricsModalVisible(false)}
          metrics={metrics}
        />
      </View>
      {/* Quick Stats */}
      <View style={darkMode ? adminStyles.darkCard : adminStyles.card}>
        <Text style={[adminStyles.sectionTitle, adminStyles.mb16]}>Quick Stats</Text>
        <View style={adminStyles.rowAround}>
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="tasks" size={24} color="#1976d2" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textPrimary]}>
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text style={adminStyles.statsLabel}>Completed</Text>
          </View>
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="star" size={24} color="#FFD700" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textGold]}>
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text style={adminStyles.statsLabel}>Rated</Text>
          </View>
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="users" size={24} color="#4CAF50" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textSuccess]}>
              {employees.length}
            </Text>
            <Text style={adminStyles.statsLabel}>Employees</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default PerformanceTab;