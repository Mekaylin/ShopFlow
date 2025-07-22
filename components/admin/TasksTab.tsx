// Extend Task type to include rating using declaration merging
declare module '../utility/types' {
  interface Task {
    rating?: number;
  }
}
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
  // Materials logic
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialTypeId, setSelectedMaterialTypeId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialsForTask, setMaterialsForTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
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
      materials_used: materialsForTask,
    });
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskDeadline('');
    setMaterialsForTask([]);
    setSelectedEmployee(null);
    onClose();
  };
  return (
    <AdminModal visible={visible} onClose={() => { setSelectedEmployee(null); onClose(); }} title={!selectedEmployee ? 'Select Employee' : `Add Task for ${selectedEmployee?.name || ''}`}>
      {!selectedEmployee ? (
        <View>
          {/* Material selection UI */}
          <Text style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 4 }}>Add Materials for Task</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ marginRight: 6 }}>Material:</Text>
            <TextInput
              style={[adminStyles.inputText, { flex: 1 }]}
              placeholder="Material ID or Name"
              value={selectedMaterialId}
              onChangeText={setSelectedMaterialId}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ marginRight: 6 }}>Type:</Text>
            <TextInput
              style={[adminStyles.inputText, { flex: 1 }]}
              placeholder="Type ID (optional)"
              value={selectedMaterialTypeId}
              onChangeText={setSelectedMaterialTypeId}
            />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={{ marginRight: 6 }}>Quantity:</Text>
            <TextInput
              style={[adminStyles.inputText, { flex: 1 }]}
              placeholder="Quantity"
              value={materialQuantity}
              onChangeText={setMaterialQuantity}
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={[adminStyles.addBtn, { marginBottom: 8 }]}
            onPress={() => {
              if (!selectedMaterialId || !materialQuantity) return;
              setMaterialsForTask(prev => [...prev, {
                materialId: selectedMaterialId,
                materialTypeId: selectedMaterialTypeId || undefined,
                quantity: Number(materialQuantity)
              }]);
              setSelectedMaterialId('');
              setSelectedMaterialTypeId('');
              setMaterialQuantity('');
            }}
          >
            <Text style={adminStyles.addBtnText}>Add Material</Text>
          </TouchableOpacity>
          {/* List added materials */}
          {materialsForTask.length > 0 && (
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: 'bold' }}>Materials for this task:</Text>
              {materialsForTask.map((mat, idx) => (
                <Text key={idx} style={{ fontSize: 14 }}>
                  {mat.materialId}{mat.materialTypeId ? ` (${mat.materialTypeId})` : ''}: {mat.quantity}
                </Text>
              ))}
            </View>
          )}
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

import React, { useState } from 'react';
import { FlatList, Image, SafeAreaView, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { SearchAndFilterBar } from '../ui/SearchAndFilterBar';
import AdminModal from './AdminModal';
import { minutesLate } from '../utility/utils';
import { Employee, Material, MaterialType, PerformanceSettings, User } from '../utility/types';
import type { Task } from '../utility/types';
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


export const TasksTab: React.FC<TasksTabProps> = ({
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
  // --- Task state ---
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedTaskEmployee, setSelectedTaskEmployee] = useState<Employee | null>(null);
  const [showEmployeeTasksModal, setShowEmployeeTasksModal] = useState(false);
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
  // Remove unused material states (now handled in modal)
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
    try {
      const completedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed: true, completed_at: completedAt })
        .eq('id', taskId)
        .select('*')
        .single();
      if (error || !data) {
        console.error('Error marking task complete:', error);
        Alert.alert('Error', 'Failed to mark task as complete. Please try again.');
        return;
      }
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: true, completed_at: completedAt } : t));
      Alert.alert('Success', 'Task marked as complete.');
    } catch (e) {
      console.error('Exception in handleCompleteTask:', e);
      Alert.alert('Error', 'Unexpected error occurred.');
    }
  };
  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
      if (error) return;
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (e) {
      // Optionally handle error
    }
  };
  // Rating modal state
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTask, setRatingTask] = useState<Task | null>(null);
  const [taskRating, setTaskRating] = useState(0);
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const openRatingModal = (task: Task) => {
    setRatingTask(task);
    setTaskRating(task.rating || 0);
    setShowRatingModal(true);
  };

  const handleRateTask = async () => {
    if (!ratingTask) return;
    setRatingLoading(true);
    setRatingError('');
    try {
      // 1. Update the task rating in supabase
      const { data: updatedTask, error: taskError } = await supabase
        .from('tasks')
        .update({ rating: taskRating })
        .eq('id', ratingTask.id)
        .select('*')
        .single();
      if (taskError || !updatedTask) {
        setRatingError('Failed to rate task.');
        return;
      }
      setTasks(tasks.map(t => t.id === ratingTask.id ? { ...t, rating: taskRating } : t));

      // 2. Update employee performance metrics
      // Fetch all rated tasks for this employee
      const { data: ratedTasks, error: fetchError } = await supabase
        .from('tasks')
        .select('rating')
        .eq('assigned_to', ratingTask.assigned_to)
        .not('rating', 'is', null);
      if (fetchError || !ratedTasks) {
        // Don't block UI, but optionally log error
      }
      // Calculate average rating
      const ratings = ratedTasks?.map((t: { rating: number }) => t.rating).filter(r => typeof r === 'number');
      const avgRating = ratings && ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;

      // Update employee performance table (assume table: employee_performance)
      if (avgRating !== null) {
        await supabase
          .from('employee_performance')
          .upsert([
            {
              employee_id: ratingTask.assigned_to,
              avg_task_rating: avgRating,
              last_updated: new Date().toISOString(),
            }
          ], { onConflict: 'employee_id' });
      }

      setShowRatingModal(false);
      setRatingTask(null);
    } catch (e) {
      setRatingError('Unexpected error.');
    } finally {
      setRatingLoading(false);
    }
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
                onPress={() => openRatingModal(task)}
              >
                <FontAwesome5 name="star" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                  {task.rating ? `Rated: ${task.rating}/5` : 'Rate Task'}
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
      // Employee: clicking opens modal showing all their tasks for the day
      return (
        <View
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
            justifyContent: 'space-between',
          }}
        >
          <TouchableOpacity
            style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
            onPress={() => {
              setSelectedTaskEmployee(item as Employee);
              setShowEmployeeTasksModal(true);
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
          <TouchableOpacity
            style={{ marginLeft: 10, padding: 6, borderRadius: 16, backgroundColor: '#e3f2fd' }}
            onPress={() => {
              setSelectedTaskEmployee(item as Employee);
              setShowAddTaskModal(true);
            }}
            accessibilityLabel={`Add task for ${item.name}`}
          >
            <FontAwesome5 name="plus" size={16} color="#1976d2" />
          </TouchableOpacity>
        </View>
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
  // Filtered tasks by search
  const filteredTasksBySearch = tasks.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) &&
    (!statusFilter || (statusFilter === 'completed' ? t.completed : !t.completed))
  );
  // Data: always use (Employee | Task)[] and type guard in renderItem
  const data: (Employee | Task)[] = filteredTasksBySearch.length > 0 || search ? filteredTasksBySearch : employees;

  // Get today's tasks for selected employee
  const todaysTasksForEmployee = selectedTaskEmployee
    ? tasks.filter(t => t.assigned_to === selectedTaskEmployee.id && inRange(t.deadline))
    : [];

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* Banner with Centered Heading */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingTop: 18, paddingBottom: 10, backgroundColor: '#f5faff', position: 'relative' }}>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#1976d2', textAlign: 'center' }}>Employee Dashboard</Text>
      </View>
      <View style={{ paddingHorizontal: 8, marginBottom: 4 }}>
        <SearchAndFilterBar
          searchValue={search}
          onSearchChange={setSearch}
          filterChips={[{ label: 'All', value: '' }, { label: 'Completed', value: 'completed' }, { label: 'Pending', value: 'pending' }]}
          selectedFilter={statusFilter}
          onFilterChange={setStatusFilter}
          placeholder="Search tasks by name..."
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 8 }}
        keyboardShouldPersistTaps="handled"
      />

      {/* Modal: Show all tasks for selected employee for the day */}
      <AdminModal
        visible={showEmployeeTasksModal && !!selectedTaskEmployee}
        onClose={() => { setShowEmployeeTasksModal(false); setSelectedTaskEmployee(null); }}
        title={selectedTaskEmployee ? `${selectedTaskEmployee.name}'s Tasks for Today` : 'Tasks'}
      >
        {todaysTasksForEmployee.length === 0 ? (
          <Text style={{ color: '#888', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No tasks assigned for today.
          </Text>
        ) : (
          <FlatList
            data={todaysTasksForEmployee}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={{ backgroundColor: item.completed ? '#e8f5e9' : '#fffde7', borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 16, color: '#1976d2' }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>Start: {item.start} | Due: {item.deadline}</Text>
                {item.completed && (
                  <Text style={{ color: '#388e3c', fontWeight: 'bold', fontSize: 13 }}>Completed</Text>
                )}
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
        <TouchableOpacity style={adminStyles.closeBtn} onPress={() => { setShowEmployeeTasksModal(false); setSelectedTaskEmployee(null); }}>
          <Text style={adminStyles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </AdminModal>

      {/* Add Task Modal: allow adding tasks for selected employee */}
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

      {/* Rating Modal */}
      <AdminModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        title={ratingTask ? `Rate Task: ${ratingTask.name}` : 'Rate Task'}
      >
        <View style={{ alignItems: 'center', padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>Select Rating (1-5)</Text>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            {[1,2,3,4,5].map(star => (
              <TouchableOpacity key={star} onPress={() => setTaskRating(star)}>
                <FontAwesome5 name="star" size={32} color={taskRating >= star ? '#FFD700' : '#ccc'} style={{ marginHorizontal: 4 }} />
              </TouchableOpacity>
            ))}
          </View>
          {ratingError ? <Text style={{ color: 'red', marginBottom: 8 }}>{ratingError}</Text> : null}
          <TouchableOpacity
            style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 12, marginBottom: 8 }}
            onPress={handleRateTask}
            disabled={ratingLoading}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{ratingLoading ? 'Saving...' : 'Save Rating'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowRatingModal(false)}>
            <Text style={adminStyles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </AdminModal>
    </SafeAreaView>
  );
}