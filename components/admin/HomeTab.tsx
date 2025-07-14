import { FontAwesome5 } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { Employee, Material, PerformanceMetrics, Task } from '../utility/types';
import {
  filterTasksByDate,
  getBestPerformers,
  getLateEmployeesByClockEvents,
  getMaterialUsage,
  limitLines
} from '../utility/utils';

import type { ClockEvent, MaterialType, User } from '../utility/types';
interface HomeTabProps {
  user: User;
  employees: Employee[];
  tasks: Task[];
  materials: Material[];
  materialTypes: Record<string, MaterialType[]>;
  clockEventsByEmployee: Record<string, ClockEvent[]>;
  darkMode: boolean;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  onExport: (filteredData?: {
    dateRange: { startDate: string; endDate: string };
    summaryRange: string;
    summaryDate: string;
    filteredTasks: Task[];
    filteredMaterials: Material[];
    materialsUsed: Record<string, number>;
    bestPerformers: PerformanceMetrics[];
    lateEmployees: string[];
  }) => void;
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
  const [summaryDate, setSummaryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = React.useState(false);
  const [showAllLateEmpsModal, setShowAllLateEmpsModal] = React.useState(false);
  const [showAllMaterialsModal, setShowAllMaterialsModal] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Helper functions to calculate date ranges
  const getDateRange = (range: 'day' | 'week' | 'month', baseDate: string) => {
    const date = new Date(baseDate);
    let startDate: string;
    let endDate: string;

    switch (range) {
      case 'day':
        startDate = endDate = baseDate;
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
        break;
    }

    return { startDate, endDate };
  };

  // Calculate filtered data based on selected range and date
  const { startDate, endDate } = getDateRange(summaryRange, summaryDate);
  const filteredTasks = filterTasksByDate(tasks, startDate, endDate);
  
  // Filter materials used within the date range (using task dates since materials don't have created_at)
  const filteredMaterials = materials.filter(material => {
    // Check if this material is used in any of the filtered tasks
    return filteredTasks.some(task => 
      task.materials_used?.some((matUsed: any) => matUsed.materialId === material.id)
    );
  });
  const materialsUsed = getMaterialUsage(filteredMaterials, filteredTasks);
  
  // Calculate performance metrics from filtered tasks
  const performanceMetrics: PerformanceMetrics[] = employees.map(emp => {
    const empTasks = filteredTasks.filter(task => task.assigned_to === emp.id);
    const completedTasks = empTasks.filter(task => task.completed);
    const performance_score = empTasks.length > 0 ? (completedTasks.length / empTasks.length) * 100 : 0;
    return {
      employee_id: emp.id,
      employee_name: emp.name,
      total_tasks: empTasks.length,
      completed_tasks: completedTasks.length,
      average_rating: 0, // Would need to calculate from task ratings
      performance_score: Math.round(performance_score)
    };
  });
  
  const bestPerformers = getBestPerformers(performanceMetrics, 5);
  
  // Filter clock events within the date range
  const filteredClockEvents = Object.values(clockEventsByEmployee).flat().filter(event => {
    const eventDate = event.clock_in || event.clock_out;
    if (!eventDate) return false;
    const clockDate = new Date(eventDate).toISOString().split('T')[0];
    return clockDate >= startDate && clockDate <= endDate;
  });
  
  const lateEmployees = getLateEmployeesByClockEvents(filteredClockEvents, employees, 9);

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
            onPress={() => {
              setSummaryRange(range);
              // Reset to today when changing ranges
              setSummaryDate(new Date().toISOString().split('T')[0]);
            }}
          >
            <Text style={{ color: summaryRange === range ? '#fff' : '#1976d2', fontWeight: 'bold' }}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Picker Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#fff', borderRadius: 8, padding: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
            {summaryRange === 'day' ? `Date: ${summaryDate}` : 
             summaryRange === 'week' ? `Week of: ${summaryDate}` : 
             `Month of: ${summaryDate}`}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {summaryRange === 'day' ? 'Single day view' :
             summaryRange === 'week' ? `${startDate} to ${endDate}` :
             `${startDate} to ${endDate}`}
          </Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: '#fff', fontSize: 14 }}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Tasks Card */}
      <TouchableOpacity
        activeOpacity={canExpand(filteredTasks) ? 0.7 : 1}
        onPress={() => canExpand(filteredTasks) && setShowAllTasksModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Tasks</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {filteredTasks.length} total, {filteredTasks.filter(t => t.completed).length} completed
          </Text>
        </View>
        {filteredTasks.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No tasks found for this {summaryRange}
          </Text>
        ) : (
          <>
            {limitLines(filteredTasks, 10).map((t, idx) => (
              <Text key={t.id} style={{ color: t.completed ? '#388e3c' : '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                {idx + 1}. {t.name} {t.completed ? '(Completed)' : ''}
              </Text>
            ))}
            {filteredTasks.length > 10 && (
              <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{filteredTasks.length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Late Employees Card */}
      <TouchableOpacity
        activeOpacity={canExpand(lateEmployees) ? 0.7 : 1}
        onPress={() => canExpand(lateEmployees) && setShowAllLateEmpsModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#c62828' }}>Late Employees</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{lateEmployees.length} employees</Text>
        </View>
        {lateEmployees.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No late employees for this {summaryRange}
          </Text>
        ) : (
          <>
            {limitLines(lateEmployees, 10).map((name, idx) => (
              <Text key={name} style={{ color: '#c62828', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                {idx + 1}. {name}
              </Text>
            ))}
            {lateEmployees.length > 10 && (
              <Text style={{ color: '#c62828', fontWeight: 'bold', marginTop: 4 }}>+{lateEmployees.length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Materials Used Card */}
      <TouchableOpacity
        activeOpacity={canExpand(Object.entries(materialsUsed)) ? 0.7 : 1}
        onPress={() => canExpand(Object.entries(materialsUsed)) && setShowAllMaterialsModal(true)}
        style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Materials Used</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{Object.keys(materialsUsed).length} materials</Text>
        </View>
        {Object.keys(materialsUsed).length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No materials used for this {summaryRange}
          </Text>
        ) : (
          <>
            {Object.entries(materialsUsed).slice(0, 10).map(([matId, qty], idx) => (
              <Text key={matId} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                {idx + 1}. {matId}: {qty}
              </Text>
            ))}
            {Object.keys(materialsUsed).length > 10 && (
              <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{Object.keys(materialsUsed).length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Best Performers Card */}
      <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Best Performers</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>Top 5</Text>
        </View>
        {bestPerformers.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No performance data available for this {summaryRange}
          </Text>
        ) : (
          bestPerformers.slice(0, 5).map((emp, idx) => (
            <Text key={emp.employee_id} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
              {idx + 1}. {emp.employee_name} ({emp.performance_score}% completion - {emp.completed_tasks}/{emp.total_tasks} tasks)
            </Text>
          ))
        )}
      </View>

      {/* Export Section with Date Filter */}
      <View style={{ marginTop: 16, backgroundColor: '#fff', borderRadius: 16, padding: 18, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 12 }}>Export Data</Text>
        
        {/* Current Filter Display */}
        <View style={{ backgroundColor: '#f5f9ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Current Filter:</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1976d2' }}>
            {summaryRange.charAt(0).toUpperCase() + summaryRange.slice(1)} - {summaryDate}
          </Text>
          {summaryRange !== 'day' && (
            <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              From {startDate} to {endDate}
            </Text>
          )}
        </View>

        {/* Export Stats Preview */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4CAF50' }}>{filteredTasks.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Tasks</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2196F3' }}>{Object.keys(materialsUsed).length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Materials</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FF9800' }}>{bestPerformers.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Performers</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#9C27B0' }}>{lateEmployees.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Late</Text>
          </View>
        </View>

        {/* Quick Filter Actions */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#e3f2fd',
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
              marginRight: 4,
              borderWidth: summaryRange === 'day' && summaryDate === new Date().toISOString().split('T')[0] ? 2 : 1,
              borderColor: summaryRange === 'day' && summaryDate === new Date().toISOString().split('T')[0] ? '#1976d2' : '#ddd'
            }}
            onPress={() => {
              setSummaryRange('day');
              setSummaryDate(new Date().toISOString().split('T')[0]);
            }}
          >
            <Text style={{ color: '#1976d2', fontSize: 12, fontWeight: '600' }}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#e8f5e9',
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
              marginHorizontal: 4,
              borderWidth: summaryRange === 'week' ? 2 : 1,
              borderColor: summaryRange === 'week' ? '#4CAF50' : '#ddd'
            }}
            onPress={() => setSummaryRange('week')}
          >
            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '600' }}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: '#fff3e0',
              borderRadius: 6,
              paddingVertical: 8,
              paddingHorizontal: 12,
              alignItems: 'center',
              marginLeft: 4,
              borderWidth: summaryRange === 'month' ? 2 : 1,
              borderColor: summaryRange === 'month' ? '#FF9800' : '#ddd'
            }}
            onPress={() => setSummaryRange('month')}
          >
            <Text style={{ color: '#FF9800', fontSize: 12, fontWeight: '600' }}>This Month</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={{
            backgroundColor: exporting ? '#A5D6A7' : '#4CAF50',
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 20,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: exporting ? 0.7 : 1,
          }}
          onPress={async () => {
            setExporting(true);
            try {
              // Pass filtered data and date range to export function
              await Promise.resolve(onExport({
                dateRange: { startDate, endDate },
                summaryRange,
                summaryDate,
                filteredTasks,
                filteredMaterials,
                materialsUsed,
                bestPerformers,
                lateEmployees
              }));
              // Optionally show a success message
              // Alert.alert('Export', 'Data export started.');
            } catch (err: any) {
              if (err?.message) {
                alert('Export failed: ' + err.message);
              } else {
                alert('Export failed.');
              }
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
        >
          {exporting ? (
            <FontAwesome5 name="spinner" size={16} color="#fff" style={{ marginRight: 8 }} spin />
          ) : (
            <FontAwesome5 name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {exporting ? 'Exporting...' : `Export ${summaryRange.charAt(0).toUpperCase() + summaryRange.slice(1)} Data`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* All Tasks Modal */}
      <Modal visible={showAllTasksModal} transparent animationType="slide" onRequestClose={() => setShowAllTasksModal(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>All Tasks</Text>
            <ScrollView>
              {filteredTasks.map((task, idx) => (
                <Text key={task.id} style={[adminStyles.taskListText, task.completed ? adminStyles.textSuccess : adminStyles.textPrimary]}>
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
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={[adminStyles.modalTitle, adminStyles.textError]}>All Late Employees</Text>
            <ScrollView>
              {lateEmployees.map((name, idx) => (
                <Text key={name} style={[adminStyles.taskListText, adminStyles.textError]}>
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
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>All Materials Used</Text>
            <ScrollView>
              {Object.entries(materialsUsed).map(([matId, qty], idx) => (
                <Text key={matId} style={adminStyles.taskListText}>
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

      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>
              Select {summaryRange === 'day' ? 'Date' : summaryRange === 'week' ? 'Week Start Date' : 'Month Date'}
            </Text>
            <Text style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
              {summaryRange === 'day' ? 'Choose a specific date' :
               summaryRange === 'week' ? 'Choose any date in the week' :
               'Choose any date in the month'}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                marginVertical: 16,
                fontSize: 16,
                textAlign: 'center',
              }}
              value={summaryDate}
              onChangeText={(text) => {
                // Basic date validation
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(text) || text === '') {
                  setSummaryDate(text);
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              maxLength={10}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { backgroundColor: '#e0e0e0', flex: 0.3 }]}
                onPress={() => setSummaryDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[adminStyles.closeBtnText, { color: '#333' }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { backgroundColor: '#666', flex: 0.3 }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={adminStyles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { flex: 0.3 }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={adminStyles.closeBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default HomeTab; 