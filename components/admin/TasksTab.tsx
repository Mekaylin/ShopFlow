
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AddTaskModal from '../ui/AddTaskModal';
import type { Employee, Material, Task, User } from '../utility/types';

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
        setAddTaskError('Failed to add task.');
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tasks</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddTaskModal(true)}>
        <Text style={styles.addBtnText}>+ Add Task</Text>
      </TouchableOpacity>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.taskItem}>
            <Text style={styles.taskName}>{item.name}</Text>
            <Text style={styles.taskMeta}>Assigned to: {employees.find(e => e.id === item.assigned_to)?.name || 'Unknown'}</Text>
            <Text style={styles.taskMeta}>Start: {item.start} | Due: {item.deadline}</Text>
            <Text style={styles.taskStatus}>{item.completed ? 'Completed' : 'In Progress'}</Text>
            {item.completed && item.completed_at && (
              <Text style={styles.completedAt}>Completed at: {new Date(item.completed_at).toLocaleString()}</Text>
            )}
            {/* Add more task actions as needed */}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks found.</Text>}
      />
      <AddTaskModal
        visible={showAddTaskModal}
        onClose={() => setShowAddTaskModal(false)}
        currentEmployee={selectedEmployee ?? undefined}
        onAddTask={handleAddTask}
        loading={addTaskLoading}
        error={addTaskError}
        setError={setAddTaskError}
      />
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