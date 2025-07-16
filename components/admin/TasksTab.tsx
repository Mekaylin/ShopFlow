// --- AddTaskModal extracted for deduplication and reliability ---
// ...existing code...
type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployee: Employee | null;
  setSelectedEmployee: (e: Employee | null) => void;
  onAddTask: (taskData: any) => Promise<void>;
  loading: boolean;
  error: string;
  setError: (msg: string) => void;
};
const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  employees,
  selectedEmployee,
  setSelectedEmployee,
  onAddTask,
  loading,
  error,
  setError
}) => {
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  // Materials logic can be added here if needed
  const handleAdd = async () => {
    setError('');
    if (!newTaskName || !newTaskStart || !newTaskDeadline || !selectedEmployee) {
      setError('Please fill all required fields.');
      return;
    }
    await onAddTask({
      name: newTaskName,
      assigned_to: selectedEmployee.id,
      start: newTaskStart,
      deadline: newTaskDeadline,
      // Add materials if needed
    });
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskDeadline('');
    setSelectedEmployee(null);
    onClose();
  };
  return (
    <AdminModal visible={visible} onClose={() => { setSelectedEmployee(null); onClose(); }} title={!selectedEmployee ? 'Select Employee' : `Add Task for ${selectedEmployee?.name || ''}`}>
      {!selectedEmployee ? (
        <View>
          <FlatList
            data={employees}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                onPress={() => setSelectedEmployee(item)}
              >
                <Text style={{ fontSize: 16 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={adminStyles.closeBtn} onPress={() => { setSelectedEmployee(null); onClose(); }}>
            <Text style={adminStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View>
          <TextInput
            style={adminStyles.inputText}
            placeholder="Task Title"
            value={newTaskName}
            onChangeText={setNewTaskName}
            accessibilityLabel="Task Title"
            testID="task-title-input"
          />
          <TextInput
            style={adminStyles.inputText}
            placeholder="Start Time (e.g. 09:00)"
            value={newTaskStart}
            onChangeText={setNewTaskStart}
            accessibilityLabel="Start Time"
            testID="task-start-input"
          />
          <TextInput
            style={adminStyles.inputText}
            placeholder="Deadline (e.g. 17:00)"
            value={newTaskDeadline}
            onChangeText={setNewTaskDeadline}
            accessibilityLabel="Deadline"
            testID="task-deadline-input"
          />
          {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <TouchableOpacity style={adminStyles.addBtn} onPress={handleAdd} disabled={loading}>
              <Text style={adminStyles.addBtnText}>{loading ? 'Adding...' : 'Add Task'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setSelectedEmployee(null)}>
              <Text style={adminStyles.closeBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </AdminModal>
  );
};
import { FontAwesome5 } from '@expo/vector-icons';
// Removed native DateTimePicker for Expo Go compatibility
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, Image, SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { Employee, Material, MaterialType, Task } from '../utility/types';
import { minutesLate } from '../utility/utils';
import AdminModal from './AdminModal';
import NotificationPanel from './NotificationPanel';

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
  // Removed showDatePicker state for Expo Go compatibility
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedMaterialForTask, setSelectedMaterialForTask] = useState<string>('');
  const [selectedMaterialTypeForTask, setSelectedMaterialTypeForTask] = useState<string>('');
  const [materialQuantityForTask, setMaterialQuantityForTask] = useState('');
  const [materialsForNewTask, setMaterialsForNewTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  const router = useRouter();
  // Remove params.addTask usage; use local state for modal
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [addTaskError, setAddTaskError] = useState('');
  // Task CRUD handlers
  const handleAddTask = async (taskData: any) => {
    setAddTaskLoading(true);
    setAddTaskError('');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          business_id: user.business_id,
          completed: false,
          completed_at: null,
          materials_used: [], // Add materials if needed
        })
        .select('*')
        .single();
      if (error || !data) {
        setAddTaskError('Failed to add task.');
        return;
      }
      setTasks([...tasks, data]);
    } catch (e) {
      setAddTaskError('Unexpected error.');
    } finally {
      setAddTaskLoading(false);
    }
  };
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
          borderRadius: 10,
          padding: 8,
          marginBottom: 8,
          marginHorizontal: 2,
          shadowColor: '#1976d2',
          shadowOpacity: 0.06,
          shadowRadius: 3,
          elevation: 1,
          borderLeftWidth: 3,
          borderLeftColor: task.completed ? '#388e3c' : isLate ? '#c62828' : '#ff9800',
          minWidth: 0,
          maxWidth: '100%',
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
      // Employee: clicking opens Add Task modal for that employee
      return (
        <TouchableOpacity
          style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            marginBottom: 6,
            alignItems: 'center',
            paddingVertical: 7,
            paddingHorizontal: 4,
            borderWidth: 1.2,
            borderColor: '#1976d2',
            flexDirection: 'row',
            minWidth: 0,
            maxWidth: '100%',
          }}
          onPress={() => {
            setSelectedTaskEmployee(item as Employee);
            setShowAddTaskModal(true);
          }}
        >
          <View style={{ width: 28, height: 28, borderRadius: 14, marginRight: 7, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' }}>
            {'photoUri' in item && item.photoUri ? (
              <Image source={{ uri: item.photoUri }} style={{ width: 28, height: 28, borderRadius: 14 }} />
            ) : (
              <FontAwesome5 name="user" size={16} color="#b3c0e0" />
            )}
          </View>
          <View>
            <Text style={{ fontWeight: 'bold', color: '#1976d2', fontSize: 13 }}>{item.name}</Text>
            <Text style={{ color: '#888', fontSize: 11 }}>{'department' in item && item.department ? item.department : 'No Dept'}</Text>
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
      {/* Banner with Notification Icon and Centered Heading */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingBottom: 10, backgroundColor: '#f5faff', position: 'relative' }}>
        {/* Notification Bell Icon (top left) */}
        <View style={{ position: 'absolute', left: 16, top: 0, bottom: 0, justifyContent: 'center' }}>
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
        {/* Centered Heading */}
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1976d2', textAlign: 'center' }}>Employee Dashboard</Text>
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
        onPress={() => setShowAddTaskModal(true)}
        accessibilityLabel="Add Task"
      >
        <FontAwesome5 name="plus" size={28} color="#fff" />
      </TouchableOpacity>
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        employees={employees}
        selectedEmployee={selectedTaskEmployee}
        setSelectedEmployee={setSelectedTaskEmployee}
        onAddTask={handleAddTask}
        loading={addTaskLoading}
        error={addTaskError}
        setError={setAddTaskError}
      />
    </SafeAreaView>
  );
}

export default TasksTab;