import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/cloud.js';
import { Employee, PerformanceSettings, Task } from '../utility/types';

interface PerformanceTabProps {
  user: any;
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
  const [showPerformanceManagement] = useState(false);

  // Performance calculation function
  const calculatePerformanceMetrics = async () => {
    try {
      if (!user?.business_id) {
        console.warn('calculatePerformanceMetrics: user or user.business_id is missing', user);
        return;
      }
      const { data, error } = await supabase.rpc('calculate_performance_metrics', {
        business_id_param: user.business_id
      });
      if (error) {
        console.error('Error calculating performance metrics:', error);
        Alert.alert('Error', 'Failed to calculate performance metrics.');
      } else {
        console.log('Performance metrics calculated successfully:', data);
        Alert.alert('Success', 'Performance metrics have been calculated and updated.');
      }
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
    }
  };

  // Update performance settings
  const updatePerformanceSettings = async (newSettings: PerformanceSettings) => {
    try {
      if (!user?.business_id) return;
      const { error } = await supabase
        .from('performance_settings')
        .upsert({
          business_id: user.business_id,
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
    } catch (error) {
      console.error('Error updating performance settings:', error);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
      {/* Performance Settings */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
          Performance Management
        </Text>
        
        {/* Rating System Settings */}
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2', marginBottom: 8 }}>
            Rating System
          </Text>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              onPress={() => updatePerformanceSettings({
                ...performanceSettings,
                ratingSystemEnabled: !performanceSettings.ratingSystemEnabled
              })}
            >
              <FontAwesome5
                name={performanceSettings.ratingSystemEnabled ? 'toggle-on' : 'toggle-off'}
                size={20}
                color={performanceSettings.ratingSystemEnabled ? '#4CAF50' : '#ccc'}
                style={{ marginRight: 12 }}
              />
              <Text style={{ fontSize: 14, color: '#333' }}>
                Enable Task Rating System
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
              onPress={() => updatePerformanceSettings({
                ...performanceSettings,
                autoRateCompletedTasks: !performanceSettings.autoRateCompletedTasks
              })}
            >
              <FontAwesome5
                name={performanceSettings.autoRateCompletedTasks ? 'toggle-on' : 'toggle-off'}
                size={20}
                color={performanceSettings.autoRateCompletedTasks ? '#4CAF50' : '#ccc'}
                style={{ marginRight: 12 }}
              />
              <Text style={{ fontSize: 14, color: '#333' }}>
                Auto-rate Completed Tasks
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
              Default Rating for Auto-rated Tasks:
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  onPress={() => updatePerformanceSettings({
                    ...performanceSettings,
                    defaultRating: rating
                  })}
                  style={{ marginRight: 8 }}
                >
                  <FontAwesome5
                    name={performanceSettings.defaultRating >= rating ? 'star' : 'star-o'}
                    size={20}
                    color={performanceSettings.defaultRating >= rating ? '#FFD700' : '#ccc'}
                  />
                </TouchableOpacity>
              ))}
              <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
                ({performanceSettings.defaultRating}/5)
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity
            style={{
              backgroundColor: '#1976d2',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              flex: 1,
              marginRight: 8,
              alignItems: 'center'
            }}
            onPress={() => {
              calculatePerformanceMetrics();
            }}
          >
            <FontAwesome5 name="chart-line" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600' }}>View Performance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#4CAF50',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              flex: 1,
              marginLeft: 8,
              alignItems: 'center'
            }}
            onPress={calculatePerformanceMetrics}
          >
            <FontAwesome5 name="sync-alt" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: '600' }}>Recalculate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Quick Stats */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
          Quick Stats
        </Text>
        
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center' }}>
            <FontAwesome5 name="tasks" size={24} color="#1976d2" />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginTop: 4 }}>
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Completed</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <FontAwesome5 name="star" size={24} color="#FFD700" />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginTop: 4 }}>
              {tasks.filter(t => t.completed).length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Rated</Text>
          </View>
          
          <View style={{ alignItems: 'center' }}>
            <FontAwesome5 name="users" size={24} color="#4CAF50" />
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginTop: 4 }}>
              {employees.length}
            </Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Employees</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default PerformanceTab; 