import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { Employee, Material, MaterialType, Task } from '../utility/types';
import { minutesLate } from '../utility/utils';
import NotificationPanel from './NotificationPanel';
import AdminModal from './AdminModal';

import type { PerformanceSettings, User } from '../utility/types';
interface TasksTabProps {
  user: User;
  employees: Employee[];
  materials: Material[];
  materialTypes: Record<string, MaterialType[]>;
  darkMode: boolean;
  performanceSettings: PerformanceSettings;
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  lateThreshold: number;
  lateTaskNotifiedIds: string[];
  setLateTaskNotifiedIds: (ids: string[]) => void;
  onRateTask: (task: Task) => void;
}

const TasksTab: React.FC<TasksTabProps> = ({
  user,
  employees,
  materials,
  materialTypes,
  darkMode,
  performanceSettings,
  tasks,
  setTasks,
  lateThreshold,
  lateTaskNotifiedIds,
  setLateTaskNotifiedIds,
  onRateTask,
}) => {
  // Task state
  const [selectedTaskEmployee, setSelectedTaskEmployee] = useState<Employee | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10); // Initialize new task date
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedMaterialForTask, setSelectedMaterialForTask] = useState<string>('');
  const [selectedMaterialTypeForTask, setSelectedMaterialTypeForTask] = useState<string>('');
  const [materialQuantityForTask, setMaterialQuantityForTask] = useState('');
  const [materialsForNewTask, setMaterialsForNewTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  const router = useRouter();
  const params = useLocalSearchParams();
  // Task CRUD handlers
  const handleCompleteTask = async (taskId: string) => {
    // TODO: Implement complete task logic
    // Example: mark as completed in supabase and update state
  };
  const handleDeleteTask = async (taskId: string) => {
    // TODO: Implement delete task logic
    // Example: delete from supabase and update state
  };
  const renderItem = ({ item }: { item: Employee | Task }) => {
    if ('assigned_to' in item) {
      const task = item as Task;
      const isLate = !task.completed && typeof task.deadline === 'string' && typeof task.completed_at === 'string' && minutesLate(task.deadline, task.completed_at) > lateThreshold;
      return (
        <View key={task.id} style={{
          backgroundColor: task.completed ? '#e8f5e9' : isLate ? '#ffebee' : '#fffde7',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          shadowColor: '#1976d2',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 1,
          borderLeftWidth: 6,
          borderLeftColor: task.completed ? '#388e3c' : isLate ? '#c62828' : '#ff9800',
        }}>
          <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#1976d2', marginBottom: 2 }}>{task.name}</Text>
          <Text style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Start: {task.start} | Due: {task.deadline}</Text>
          {task.completed && (
            <Text style={{ color: '#388e3c', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>
              Completed at: {task.completed_at ? new Date(task.completed_at).toLocaleString() : 'N/A'}
            </Text>
          )}
          {isLate && !task.completed && typeof task.deadline === 'string' && typeof task.completed_at === 'string' && (
            <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Late by {minutesLate(task.deadline, task.completed_at)} min</Text>
          )}
          {/* Show materials used with type dropdown if applicable */}
          {Array.isArray(task.materials_used) && task.materials_used.length > 0 && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontSize: 13, color: '#1976d2', fontWeight: 'bold', marginRight: 4 }}>Materials Used:</Text>
                <TouchableOpacity
                  onPress={() => alert('Materials and types used for this task, if any.')}
                  style={{ padding: 2 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FontAwesome5 name="info-circle" size={13} color="#1976d2" />
                </TouchableOpacity>
              </View>
              {task.materials_used.map((mu, idx2) => {
                const mat = materials.find(m => m.id === mu.materialId);
                const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
                return (
                  <Text key={idx2} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.name})` : ''}: {mu.quantity} {mat?.unit}</Text>
                );
              })}
            </View>
          )}
          {/* Rating Section for Completed Tasks */}
          {task.completed && performanceSettings.ratingSystemEnabled && (
            <View style={{ marginTop: 8, marginBottom: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#1976d2', fontWeight: 'bold', marginRight: 4 }}>
                  Task Rating
                </Text>
                <TouchableOpacity
                  onPress={() => alert('Rate the quality of task completion. Tap to open the rating modal.')}
                  style={{ padding: 2 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FontAwesome5 name="info-circle" size={13} color="#1976d2" />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={{
                  backgroundColor: '#FFD700',
                  borderRadius: 6,
                  paddingVertical: 6,
                  paddingHorizontal: 12,
                  alignSelf: 'flex-start',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
                onPress={() => onRateTask(task)}
              >
                <FontAwesome5 name="star" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                  Rate Task
                </Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            {!task.completed && (
              <TouchableOpacity style={{ backgroundColor: '#388e3c', borderRadius: 8, padding: 8, marginRight: 8 }} onPress={() => handleCompleteTask(task.id)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 8 }} onPress={() => handleDeleteTask(task.id)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else if (item && typeof item === 'object' && 'id' in item && 'name' in item) {
      // Employee
      return (
        <TouchableOpacity style={{
          backgroundColor: '#fff',
          borderRadius: 14,
          marginBottom: 10,
          alignItems: 'center',
          padding: 10,
          borderWidth: 2,
          borderColor: '#1976d2',
          flexDirection: 'row',
        }} onPress={() => setSelectedTaskEmployee(item as Employee)}>
          <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' }}>
            {'photoUri' in item && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
            ) : (
              <FontAwesome5 name="user" size={18} color="#b3c0e0" />
            )}
          </View>
          <View>
            <Text style={{ fontWeight: 'bold', color: '#1976d2', fontSize: 15 }}>{item.name}</Text>
            <Text style={{ color: '#888', fontSize: 12 }}>{'department' in item && item.department ? item.department : 'No Dept'}</Text>
          </View>
        </TouchableOpacity>
      );
    }
    return null;
  };

  // Day/Week/Month filter state
  const [filterTab, setFilterTab] = useState<'day' | 'week' | 'month'>('day');
  // Calculate date range for filter
  const today = new Date();
  let startDate = today;
  if (filterTab === 'week') {
    startDate = new Date(today);
    startDate.setDate(today.getDate() - today.getDay()); // Sunday
  } else if (filterTab === 'month') {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }
  // Helper: is task in range
  const inRange = (dateStr: string | undefined) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return d >= startDate && d <= today;
  };
  // Filtered tasks by date range
  const filteredTasks = tasks.filter(t => inRange(t.deadline));
  // Data: always use (Employee | Task)[] and type guard in renderItem
  const data: (Employee | Task)[] = !selectedTaskEmployee
    ? employees
    : filteredTasks.filter(t => t.assigned_to === selectedTaskEmployee.id);

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Day/Week/Month Filter Tabs */}
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 12, marginBottom: 8 }}>
        {(['day', 'week', 'month'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={{
              backgroundColor: filterTab === tab ? '#1976d2' : '#e3f2fd',
              borderRadius: 8,
              paddingVertical: 8,
              paddingHorizontal: 18,
              marginHorizontal: 4,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setFilterTab(tab)}
          >
            <Text style={{ color: filterTab === tab ? '#fff' : '#1976d2', fontWeight: 'bold', marginRight: 4 }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            <TouchableOpacity
              onPress={() => alert(
                tab === 'day' ? 'Shows tasks due today.' : tab === 'week' ? 'Shows tasks due this week.' : 'Shows tasks due this month.'
              )}
              style={{ padding: 2 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome5 name="info-circle" size={14} color={filterTab === tab ? '#fff' : '#1976d2'} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </View>
      {/* Notification Bell Icon */}
      <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 1000 }}>
        <TouchableOpacity
          onPress={() => setShowNotifications(true)}
          accessibilityLabel="Show Notifications"
        >
          <FontAwesome5 name="bell" size={26} color="#1976d2" />
          {notifications.filter(n => n.type === 'late').length > 0 && (
            <View style={{ position: 'absolute', top: -4, right: -4, backgroundColor: '#c62828', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{notifications.filter(n => n.type === 'late').length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      {showNotifications && (
        <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} />
      )}
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 8 }}
        keyboardShouldPersistTaps="handled"
      />
      <TouchableOpacity
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          backgroundColor: '#1976d2',
          borderRadius: 32,
          width: 56,
          height: 56,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#1976d2',
          shadowOpacity: 0.18,
          shadowRadius: 8,
          elevation: 4,
          zIndex: 100,
        }}
        onPress={() => router.push({ pathname: '/admin-dashboard', params: { ...params, addTask: '1' } })}
        accessibilityLabel="Add Task"
      >
        <FontAwesome5 name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      {/* Add Task Modal */}
      <AdminModal visible={!!params.addTask} onClose={() => router.back()} title={!selectedTaskEmployee ? 'Select Employee' : `Add Task for ${selectedTaskEmployee?.name || ''}`}>
        {!selectedTaskEmployee ? (
          <View>
            <FlatList
              data={employees}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                  onPress={() => setSelectedTaskEmployee(item)}
                >
                  <Text style={{ fontSize: 16 }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => router.back()}>
              <Text style={adminStyles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <TextInput style={adminStyles.inputText} placeholder="Task Title" value={newTaskName} onChangeText={setNewTaskName} />
            <TouchableOpacity
              style={[adminStyles.inputText, { justifyContent: 'center' }]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#333', fontSize: 16 }}>
                {newTaskDate}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={new Date(newTaskDate)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setNewTaskDate(selectedDate.toISOString().slice(0, 10));
                  }
                }}
                maximumDate={new Date(2100, 11, 31)}
                minimumDate={new Date(2000, 0, 1)}
              />
            )}
            <TextInput style={adminStyles.inputText} placeholder="Start Time (e.g. 09:00)" value={newTaskStart} onChangeText={setNewTaskStart} />
            <TextInput style={adminStyles.inputText} placeholder="Deadline (e.g. 17:00)" value={newTaskDeadline} onChangeText={setNewTaskDeadline} />
            {/* Materials selection (reuse existing logic) */}
            <View style={{ marginTop: 12, marginBottom: 12, backgroundColor: '#f5faff', borderRadius: 10, padding: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text style={{ fontWeight: 'bold', color: '#1976d2', marginRight: 4 }}>Add Materials Used</Text>
                <TouchableOpacity
                  onPress={() => alert('Optionally add materials and types used for this task. You can leave this blank if not needed.')}
                  style={{ padding: 2 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FontAwesome5 name="info-circle" size={14} color="#1976d2" />
                </TouchableOpacity>
              </View>
              {/* ...existing code for materials... */}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity style={adminStyles.addBtn} onPress={async () => {
                if (!newTaskName || !newTaskStart || !newTaskDeadline || !selectedTaskEmployee) return;
                const { data, error } = await supabase
                  .from('tasks')
                  .insert({
                    name: newTaskName,
                    assigned_to: selectedTaskEmployee.id,
                    business_id: user.business_id,
                    start: newTaskStart,
                    deadline: newTaskDeadline,
                    completed: false,
                    completed_at: null,
                    materials_used: materialsForNewTask,
                  })
                  .select('*')
                  .single();
                if (!error && data) setTasks([...tasks, data]);
                setNewTaskName('');
                setNewTaskStart('');
                setNewTaskDeadline('');
                setMaterialsForNewTask([]);
                setSelectedTaskEmployee(null);
                router.back();
              }}>
                <Text style={adminStyles.addBtnText}>Add Task</Text>
              </TouchableOpacity>
              <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setSelectedTaskEmployee(null)}>
                <Text style={adminStyles.closeBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </AdminModal>
    </SafeAreaView>
  );
}

export default TasksTab;