import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { Employee, Material, PerformanceMetrics, Task } from '../utility/types';
import {
    filterTasksByDate,
    getBestPerformers,
    getLateEmployeesByClockEvents,
    getMaterialUsage,
    limitLines
} from '../utility/utils';

interface HomeTabProps {
  user: any;
  employees: Employee[];
  tasks: Task[];
  materials: Material[];
  materialTypes: Record<string, any[]>;
  clockEventsByEmployee: Record<string, any[]>;
  darkMode: boolean;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  onExport: () => void;
}

const HomeTab: React.FC<HomeTabProps> = ({
  user,
  employees,
  tasks,
  materials,
  materialTypes,
  clockEventsByEmployee,
  darkMode,
  workStart,
  workEnd,
  lunchStart,
  lunchEnd,
  onExport,
}) => {
  // Home tab state
  const [summaryRange, setSummaryRange] = React.useState<'day' | 'week' | 'month'>('day');
  const [summaryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker] = React.useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = React.useState(false);
  const [showAllLateEmpsModal, setShowAllLateEmpsModal] = React.useState(false);
  const [showAllMaterialsModal, setShowAllMaterialsModal] = React.useState(false);

  // Helper functions
  const filteredTasks = filterTasksByDate(tasks, summaryDate, summaryDate); // If you want to filter by a single day
  const materialsUsed = getMaterialUsage(materials, tasks);
  // Assume you have performance metrics available as a prop or compute them from tasks
  const performanceMetrics: PerformanceMetrics[] = [];
  const bestPerformers = getBestPerformers(performanceMetrics, 5);
  // Flatten clockEventsByEmployee to array for getLateEmployeesByClockEvents
  const allClockEvents = Object.values(clockEventsByEmployee).flat();
  const lateEmployees = getLateEmployeesByClockEvents(allClockEvents, employees, 9);

  const canExpand = (arr: any[]) => arr.length > 10;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
      {/* Range Selector */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {(['day', 'week', 'month'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={{
              flex: 1,
              paddingVertical: 8,
              backgroundColor: summaryRange === range ? '#1976d2' : '#e3f2fd',
              borderRadius: 8,
              marginHorizontal: 2,
              alignItems: 'center',
            }}
            onPress={() => setSummaryRange(range)}
          >
            <Text style={{ color: summaryRange === range ? '#fff' : '#1976d2', fontWeight: 'bold' }}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tasks Card */}
      <TouchableOpacity
        activeOpacity={canExpand(filteredTasks) ? 0.7 : 1}
        onPress={() => canExpand(filteredTasks) && setShowAllTasksModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 6 }}>Tasks</Text>
        {limitLines(filteredTasks, 10).map((t, idx) => (
          <Text key={t.id} style={{ color: t.completed ? '#388e3c' : '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
            {idx + 1}. {t.name} {t.completed ? '(Completed)' : ''}
          </Text>
        ))}
        {filteredTasks.length > 10 && (
          <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{filteredTasks.length - 10} more...</Text>
        )}
      </TouchableOpacity>

      {/* Late Employees Card */}
      <TouchableOpacity
        activeOpacity={canExpand(lateEmployees) ? 0.7 : 1}
        onPress={() => canExpand(lateEmployees) && setShowAllLateEmpsModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#c62828', marginBottom: 6 }}>Late Employees</Text>
        {limitLines(lateEmployees, 10).map((name, idx) => (
          <Text key={name} style={{ color: '#c62828', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
            {idx + 1}. {name}
          </Text>
        ))}
        {lateEmployees.length > 10 && (
          <Text style={{ color: '#c62828', fontWeight: 'bold', marginTop: 4 }}>+{lateEmployees.length - 10} more...</Text>
        )}
      </TouchableOpacity>

      {/* Materials Used Card */}
      <TouchableOpacity
        activeOpacity={canExpand(Object.entries(materialsUsed)) ? 0.7 : 1}
        onPress={() => canExpand(Object.entries(materialsUsed)) && setShowAllMaterialsModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 6 }}>Materials Used</Text>
        {Object.entries(materialsUsed).slice(0, 10).map(([matId, qty], idx) => (
          <Text key={matId} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
            {idx + 1}. {matId}: {qty}
          </Text>
        ))}
        {Object.keys(materialsUsed).length > 10 && (
          <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{Object.keys(materialsUsed).length - 10} more...</Text>
        )}
      </TouchableOpacity>

      {/* Best Performers Card */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 6 }}>Best Performers</Text>
        {bestPerformers.slice(0, 5).map((emp, idx) => (
          <Text key={emp.employee_id} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
            {idx + 1}. {emp.employee_name} ({emp.performance_score} score)
          </Text>
        ))}
        {bestPerformers.length === 0 && (
          <Text style={{ color: '#888', fontStyle: 'italic' }}>No performance data available</Text>
        )}
      </View>

      {/* Export Button */}
      <TouchableOpacity
        style={{
          backgroundColor: '#4CAF50',
          borderRadius: 8,
          paddingVertical: 12,
          paddingHorizontal: 20,
          alignItems: 'center',
          marginTop: 16,
        }}
        onPress={onExport}
      >
        <FontAwesome5 name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
        <Text style={{ color: '#fff', fontWeight: '600' }}>Export Data</Text>
      </TouchableOpacity>

      {/* All Tasks Modal */}
      <Modal visible={showAllTasksModal} transparent animationType="slide" onRequestClose={() => setShowAllTasksModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>All Tasks</Text>
            <ScrollView>
              {filteredTasks.map((task, idx) => (
                <Text key={task.id} style={{ color: task.completed ? '#388e3c' : '#263238', fontSize: 15, marginBottom: 4 }}>
                  {idx + 1}. {task.name} {task.completed ? '(Completed)' : ''}
                </Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllTasksModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* All Late Employees Modal */}
      <Modal visible={showAllLateEmpsModal} transparent animationType="slide" onRequestClose={() => setShowAllLateEmpsModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#c62828', marginBottom: 12 }}>All Late Employees</Text>
            <ScrollView>
              {lateEmployees.map((name, idx) => (
                <Text key={name} style={{ color: '#c62828', fontSize: 15, marginBottom: 4 }}>
                  {idx + 1}. {name}
                </Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllLateEmpsModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* All Materials Modal */}
      <Modal visible={showAllMaterialsModal} transparent animationType="slide" onRequestClose={() => setShowAllMaterialsModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%', maxHeight: '80%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>All Materials Used</Text>
            <ScrollView>
              {Object.entries(materialsUsed).map(([matId, qty], idx) => (
                <Text key={matId} style={{ color: '#263238', fontSize: 15, marginBottom: 4 }}>
                  {idx + 1}. {matId}: {qty}
                </Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllMaterialsModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default HomeTab; 