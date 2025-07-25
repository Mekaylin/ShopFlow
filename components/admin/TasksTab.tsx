import React, { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import AddTaskModal from '../ui/AddTaskModal';
import type { Employee, Material, User } from '../utility/types';
import AdminModal from './AdminModal';
import TaskRatingModal from './TaskRatingModal';
// Extend Task type locally to include optional rating property for UI
type Task = import('../utility/types').Task & { rating?: number };

interface TasksTabProps {
  user: User;
  employees: Employee[];
  materials: Material[];
  materialTypes: Record<string, any>;
  darkMode: boolean;
  performanceSettings: any;
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  lateThreshold: number;
  lateTaskNotifiedIds: string[];
  setLateTaskNotifiedIds: React.Dispatch<React.SetStateAction<string[]>>;
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
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [addTaskError, setAddTaskError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [taskToRate, setTaskToRate] = useState<Task | null>(null);
  // Store ratings for tasks in state
  const [taskRatings, setTaskRatings] = useState<Record<string, number>>({});
  const [ratingError, setRatingError] = useState('');

  // Fetch ratings for all tasks on mount or when tasks change
  React.useEffect(() => {
    const fetchRatings = async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const taskIds = tasks.map(t => t.id);
        if (taskIds.length === 0) return;
        const { data, error } = await supabase
          .from('task_ratings')
          .select('task_id, rating')
          .in('task_id', taskIds);
        if (!error && data) {
          const ratingsMap: Record<string, number> = {};
          data.forEach((r: { task_id: string; rating: number }) => {
            ratingsMap[r.task_id] = r.rating;
          });
          setTaskRatings(ratingsMap);
        }
      } catch (e) {
        // Optionally handle error
      }
    };
    fetchRatings();
  }, [tasks]);

  // Handle rating submission to task_ratings table
  const handleSubmitRating = async (rating: number) => {
    if (!taskToRate) return;
    setRatingError('');
    try {
      const { supabase } = await import('../../lib/supabase');
      // Upsert rating for this task by this admin
      const { error } = await supabase
        .from('task_ratings')
        .upsert({
          task_id: taskToRate.id,
          employee_id: taskToRate.assigned_to,
          admin_id: user.id,
          rating,
          rated_at: new Date().toISOString(),
          business_id: user.business_id,
        }, { onConflict: 'task_id' });
      if (error) {
        setRatingError('Failed to submit rating. ' + error.message);
        return;
      }
      setTaskRatings(prev => ({ ...prev, [taskToRate.id]: rating }));
    } catch (e) {
      setRatingError('Unexpected error.');
    } finally {
      setShowRatingModal(false);
      setTaskToRate(null);
    }
  };

  // Edit task handler
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [editTaskLoading, setEditTaskLoading] = useState(false);
  const [editTaskError, setEditTaskError] = useState('');
  const handleEditTask = async (taskId: string, updates: any) => {
    setEditTaskLoading(true);
    setEditTaskError('');
    try {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)
        .select('*')
        .single();
      if (error || !data) {
        setEditTaskError('Failed to update task.' + (error?.message ? ` (${error.message})` : ''));
        return;
      }
      setTasks((prev: Task[]) => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
      setTaskToEdit(null);
    } catch (e) {
      setEditTaskError('Unexpected error.');
    } finally {
      setEditTaskLoading(false);
    }
  };

  const handleAddTask = async (taskData: any) => {
    setAddTaskLoading(true);
    setAddTaskError('');
    try {
      // Insert task logic (should match supabase schema)
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.from('tasks').insert({
        ...taskData,
        business_id: user.business_id,
      }).select('*').single();
      if (error || !data) {
        setAddTaskError('Failed to add task.' + (error?.message ? ` (${error.message})` : ''));
        return;
      }
      setTasks((prev: Task[]) => [...prev, data]);
      setShowAddTaskModal(false);
    } catch (e) {
      setAddTaskError('Unexpected error.');
    } finally {
      setAddTaskLoading(false);
    }
  };

  // Delete task handler
  const [deleteTaskLoading, setDeleteTaskLoading] = useState(false);
  const [deleteTaskError, setDeleteTaskError] = useState('');
  const handleDeleteTask = async (taskId: string) => {
    setDeleteTaskLoading(true);
    setDeleteTaskError('');
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) {
        // Log the full error object for debugging
        console.error('[Delete Task] Full error:', error);
        setDeleteTaskError('Failed to delete task. ' + (error.message || JSON.stringify(error)));
        return;
      }
      setTasks((prev: Task[]) => prev.filter((t: Task) => t.id !== taskId));
    } catch (e) {
      // Log any unexpected error
      console.error('[Delete Task] Exception:', e);
      setDeleteTaskError('Unexpected error: ' + (typeof e === 'object' && e && 'message' in e ? (e as any).message : JSON.stringify(e)));
    } finally {
      setDeleteTaskLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTaskModal(true)}>
        <Text style={styles.addBtnText}>+ Add Task</Text>
      </TouchableOpacity>
      {/* Employee Picker Modal */}
      {showAddTaskModal && !selectedEmployee && (
        <AdminModal visible={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} title="Select Employee">
          <View>
            {employees.map(emp => (
              <TouchableOpacity
                key={emp.id}
                style={{ padding: 12, borderBottomWidth: 1, borderColor: '#eee' }}
                onPress={() => setSelectedEmployee(emp)}
              >
                <Text style={{ fontSize: 16 }}>{emp.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </AdminModal>
      )}
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => setTaskToEdit(item)} activeOpacity={0.8}>
            <View style={styles.taskItem}>
              <Text style={styles.taskName}>{item.name}</Text>
              <Text style={styles.taskMeta}>Assigned to: {employees.find(e => e.id === item.assigned_to)?.name || 'Unknown'}</Text>
              <Text style={styles.taskMeta}>Start: {item.start} | Due: {item.deadline}</Text>
              <Text style={styles.taskStatus}>{item.completed ? 'Completed' : 'In Progress'}</Text>
              {item.completed && item.completed_at && (
                <Text style={styles.completedAt}>Completed at: {new Date(item.completed_at).toLocaleString()}</Text>
              )}
              {!item.completed && (
                <TouchableOpacity
                  style={{ backgroundColor: '#388e3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 }}
                  onPress={async () => {
                    try {
                      await handleEditTask(item.id, { completed: true, completed_at: new Date().toISOString() });
                    } catch (err) {
                      console.error('Mark as Completed error (admin):', err);
                      setEditTaskError('Failed to mark as completed. See console for details.');
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark as Completed</Text>
                </TouchableOpacity>
              )}
              {item.completed && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                  <Text style={{ color: '#888', marginRight: 8 }}>
                    Rating: {typeof taskRatings[item.id] === 'number' ? taskRatings[item.id] : 'Not rated'}
                  </Text>
                  <TouchableOpacity
                    style={{ backgroundColor: '#FFD700', borderRadius: 6, padding: 4, paddingHorizontal: 10, marginRight: 8 }}
                    onPress={() => {
                      setTaskToRate(item);
                      setShowRatingModal(true);
                    }}
                  >
                    <Text style={{ color: '#333', fontWeight: 'bold' }}>Rate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#1976d2', borderRadius: 6, padding: 4, paddingHorizontal: 10, marginRight: 8 }}
                    onPress={async () => {
                      // Auto-rate logic: 5 if completed on/before deadline, 3 if late
                      const deadline = new Date(item.deadline);
                      const completedAt = item.completed_at ? new Date(item.completed_at) : null;
                      let autoRating = 5;
                      if (completedAt && completedAt > deadline) autoRating = 3;
                      await handleSubmitRating(autoRating);
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Auto Rate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ backgroundColor: '#e53935', borderRadius: 6, padding: 4, paddingHorizontal: 10, marginLeft: 8, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => {
                      if (deleteTaskLoading) return;
                      if (Platform.OS === 'web') {
                        if (window.confirm && typeof window.confirm === 'function') {
                          if (!window.confirm('Are you sure you want to delete this task?')) return;
                        }
                        handleDeleteTask(item.id);
                      } else {
                        Alert.alert(
                          'Delete Task',
                          'Are you sure you want to delete this task?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteTask(item.id) },
                          ]
                        );
                      }
                    }}
                    disabled={deleteTaskLoading}
                  >
                    {deleteTaskLoading ? (
                      <ActivityIndicator size="small" color="#fff" style={{ marginRight: 6 }} />
                    ) : null}
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
                  </TouchableOpacity>
      {deleteTaskError ? (
        <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{deleteTaskError}</Text>
      ) : null}
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
      />
      <AddTaskModal
        visible={!!selectedEmployee || !!taskToEdit}
        onClose={() => {
          setSelectedEmployee(null);
          setShowAddTaskModal(false);
          setTaskToEdit(null);
        }}
        currentEmployee={selectedEmployee ?? (taskToEdit ? employees.find(e => e.id === taskToEdit.assigned_to) : undefined)}
        onAddTask={handleAddTask}
        onEditTask={handleEditTask}
        loading={addTaskLoading || editTaskLoading}
        error={addTaskError || editTaskError}
        setError={msg => { setAddTaskError(msg); setEditTaskError(msg); }}
        taskToEdit={taskToEdit}
        materials={materials}
      />
      {(addTaskError || editTaskError) && (
        <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{addTaskError || editTaskError}</Text>
      )}
      {materials.length === 0 && (
        <View style={{ margin: 16, padding: 12, backgroundColor: '#fffbe6', borderRadius: 8, borderWidth: 1, borderColor: '#ffe082' }}>
          <Text style={{ color: '#b71c1c', fontWeight: 'bold', marginBottom: 4 }}>DEBUG: No materials found for this business.</Text>
          <Text style={{ fontSize: 12, color: '#333' }}>If you see this, check your Supabase materials table for business_id values.</Text>
        </View>
      )}
      {showRatingModal && (
        <TaskRatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          onSubmit={handleSubmitRating}
          task={taskToRate}
        />
      )}
      {ratingError ? (
        <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{ratingError}</Text>
      ) : null}
      {deleteTaskError ? (
        <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{deleteTaskError}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#1976d2' },
  addBtn: { backgroundColor: '#1976d2', borderRadius: 20, padding: 10, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  taskItem: { backgroundColor: '#e3f2fd', borderRadius: 10, padding: 16, marginBottom: 12 },
  taskName: { fontSize: 18, fontWeight: 'bold', color: '#263238' },
  taskMeta: { fontSize: 14, color: '#666', marginBottom: 2 },
  taskStatus: { fontSize: 14, color: '#388e3c', fontWeight: 'bold' },
  completedAt: { color: '#888', fontSize: 13, marginBottom: 4 },
  emptyText: { color: '#888', fontStyle: 'italic', textAlign: 'center', marginTop: 32 },
});