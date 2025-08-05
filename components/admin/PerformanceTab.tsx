import { FontAwesome5 } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import SettingsToggle from '../SettingsToggle';
import { AnalyticsCharts } from '../ui/AnalyticsCharts';
import { SearchAndFilterBar } from '../ui/SearchAndFilterBar';
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
  materials: { id: string; name: string }[];
  departments: string[];
}


const PerformanceTab: React.FC<PerformanceTabProps> = ({
  user,
  employees,
  tasks,
  performanceSettings,
  setPerformanceSettings,
  darkMode,
  materials,
  departments,
}) => {
  const themeColors = darkMode ? Colors.dark : Colors.light;
  const router = useRouter();
  const params = useLocalSearchParams();

  const businessId = user?.business_id;
  const [metricsModalVisible, setMetricsModalVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);



  // --- Advanced search/filter state ---
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('');
  const [taskSearch, setTaskSearch] = useState('');
  const [taskStatusFilter, setTaskStatusFilter] = useState('');

  // --- Filtered employees and tasks for stats and analytics ---
  // Employees filtered by search and department
  const filteredEmployees = employees.filter((e: Employee) => {
    return (
      (!employeeSearch || e.name.toLowerCase().includes(employeeSearch.toLowerCase())) &&
      (!employeeDeptFilter || e.department === employeeDeptFilter)
    );
  });

  // Tasks filtered by search and status
  const filteredTasks = tasks.filter((t: Task) => {
    return (
      (!taskSearch || t.name.toLowerCase().includes(taskSearch.toLowerCase())) &&
      (!taskStatusFilter || (taskStatusFilter === 'completed' ? t.completed : !t.completed))
    );
  });


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
  const handleViewPerformance = () => {
    if (!businessId) {
      Alert.alert('Error', 'Business ID is missing.');
      return;
    }
    router.push({ pathname: '/screens/PerformanceMetricsScreen', params: { businessId } });
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
    <ScrollView
      style={darkMode ? adminStyles.darkContainer : adminStyles.container}
      contentContainerStyle={{ padding: 8, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Performance Settings */}
      <View style={[
        darkMode ? adminStyles.darkCard : adminStyles.card,
        { borderRadius: 10, padding: 10, marginBottom: 10, minWidth: 0, maxWidth: '100%' }
      ]}>
        <Text style={[adminStyles.sectionTitle, adminStyles.mb16, { fontSize: 18 }]}>Performance Management</Text>
        {/* Rating System Settings */}
        <View style={adminStyles.mb16}>
          <Text style={adminStyles.ratingTitle}>Rating System</Text>
          
          <SettingsToggle
            label="Enable Task Rating System"
            value={performanceSettings.ratingSystemEnabled}
            onValueChange={(value) => updatePerformanceSettings({
              ...performanceSettings,
              ratingSystemEnabled: value
            })}
          />
          
          <SettingsToggle
            label="Auto-rate Completed Tasks"
            description="Automatically assign ratings to tasks when completed"
            value={performanceSettings.autoRateCompletedTasks}
            onValueChange={(value) => updatePerformanceSettings({
              ...performanceSettings,
              autoRateCompletedTasks: value
            })}
          />
          
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
      {/* Quick Stats with Search & Filter */}
      <View style={darkMode ? adminStyles.darkCard : adminStyles.card}>
        <Text style={[adminStyles.sectionTitle, adminStyles.mb16]}>Quick Stats</Text>
        {/* Employee Search & Filter */}
        <SearchAndFilterBar
          searchValue={employeeSearch}
          onSearchChange={setEmployeeSearch}
          filterChips={[
            { label: 'All', value: '' },
            ...departments.map(dep => ({ label: dep, value: dep }))
          ]}
          selectedFilter={employeeDeptFilter}
          onFilterChange={setEmployeeDeptFilter}
          placeholder="Search employees by name..."
        />
        {/* Task Search & Filter */}
        <SearchAndFilterBar
          searchValue={taskSearch}
          onSearchChange={setTaskSearch}
          filterChips={[{ label: 'All', value: '' }, { label: 'Completed', value: 'completed' }, { label: 'Pending', value: 'pending' }]}
          selectedFilter={taskStatusFilter}
          onFilterChange={setTaskStatusFilter}
          placeholder="Search tasks by name..."
        />
        <View style={adminStyles.rowAround}>
          {/* Completed Tasks Stat */}
          {/* Completed Tasks Stat */}
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="tasks" size={24} color="#1976d2" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textPrimary]}>
              {filteredTasks.filter((t: Task) => t.completed).length}
            </Text>
            <Text style={adminStyles.statsLabel}>Completed</Text>
          </View>
          {/* Rated Tasks Stat */}
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="star" size={24} color="#FFD700" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textGold]}>
              {filteredTasks.filter((t: Task) => typeof (t as any).rating === 'number').length}
            </Text>
            <Text style={adminStyles.statsLabel}>Rated</Text>
          </View>
          {/* Employees Stat */}
          <View style={adminStyles.statsCol}>
            <FontAwesome5 name="users" size={24} color="#4CAF50" />
            <Text style={[adminStyles.statsNumber, adminStyles.mt4, adminStyles.textSuccess]}>
              {filteredEmployees.length}
            </Text>
            <Text style={adminStyles.statsLabel}>Employees</Text>
          </View>
        </View>
      </View>
      {/* Analytics & Trends */}
      <View style={darkMode ? adminStyles.darkCard : adminStyles.card}>
        <Text style={[adminStyles.sectionTitle, adminStyles.mb16]}>Analytics & Trends</Text>
        <AnalyticsCharts
          performanceData={filteredTasks
            .filter((t: Task) => t.completed)
            .map((t: Task) => ({
              date: t.completed_at || t.date || '',
              value: typeof (t as any).rating === 'number' ? (t as any).rating : 0
            }))}
          materialUsageData={(() => {
            // Aggregate material usage across all filtered tasks
            const usage: Record<string, number> = {};
            filteredTasks.forEach((t: Task) => {
              if (Array.isArray(t.materials_used)) {
                t.materials_used.forEach((mu: any) => {
                  if (mu.materialId) {
                    usage[mu.materialId] = (usage[mu.materialId] || 0) + mu.quantity;
                  }
                });
              }
            });
            // Map materialId to material name for better chart labels
            return Object.entries(usage).map(([materialId, used]) => {
              const materialObj = (materials ?? []).find((m: { id: string; name: string }) => m.id === materialId);
              return {
                material: materialObj ? materialObj.name : materialId,
                used
              };
            });
          })()}
          attendanceData={(() => {
            // Fallback to stub: all present, none absent
            const today = new Date();
            const days = Array.from({ length: 7 }, (_, i) => {
              const d = new Date(today);
              d.setDate(today.getDate() - (6 - i));
              return d.toISOString().slice(0, 10);
            });
            return days.map(date => ({
              date,
              present: filteredEmployees.length,
              absent: 0
            }));
          })()}
        />
      </View>
    </ScrollView>
  );
};

export default PerformanceTab;