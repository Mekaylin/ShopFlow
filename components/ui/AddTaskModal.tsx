import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import AdminModal from '../admin/AdminModal';
import { Employee } from '../utility/types';

// Unified AddTaskModal for both admin and employee flows
export type AddTaskModalProps = {
  visible: boolean;
  onClose: () => void;
  // For admin: pass employees, selectedEmployee, setSelectedEmployee
  // For employee: pass just currentEmployee, leave employees/selectedEmployee undefined
  employees?: Employee[];
  selectedEmployee?: Employee | null;
  setSelectedEmployee?: (e: Employee | null) => void;
  currentEmployee?: Employee;
  onAddTask: (taskData: any) => Promise<void>;
  onEditTask?: (taskId: string, updates: any) => Promise<void>;
  loading: boolean;
  error: string;
  setError: (msg: string) => void;
  taskToEdit?: any;

};


const AddTaskModal: React.FC<AddTaskModalProps> = ({
  visible,
  onClose,
  employees,
  selectedEmployee,
  setSelectedEmployee,
  currentEmployee,
  onAddTask,
  onEditTask,
  loading,
  error,
  setError,
  taskToEdit
}) => {
  const [showMaterials, setShowMaterials] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedMaterialTypeId, setSelectedMaterialTypeId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialsForTask, setMaterialsForTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  // Determine which employee to use
  const employee = currentEmployee || selectedEmployee;

  // Populate fields if editing
  useEffect(() => {
    if (taskToEdit) {
      setNewTaskName(taskToEdit.name || '');
      setNewTaskStart(taskToEdit.start || '');
      setNewTaskDeadline(taskToEdit.deadline || '');
      setMaterialsForTask(taskToEdit.materials_used || []);
      setCompleted(!!taskToEdit.completed);
      setCompletedAt(taskToEdit.completed_at || null);
    } else {
      setNewTaskName('');
      setNewTaskStart('');
      setNewTaskDeadline('');
      setMaterialsForTask([]);
      setCompleted(false);
      setCompletedAt(null);
    }
  }, [taskToEdit, visible]);

  const handleAddOrEdit = async () => {
    setError('');
    if (!newTaskName || !newTaskStart || !newTaskDeadline || !employee) {
      setError('Please fill all required fields.');
      return;
    }
    if (taskToEdit && onEditTask) {
      await onEditTask(taskToEdit.id, {
        name: newTaskName,
        start: newTaskStart,
        deadline: newTaskDeadline,
        materials_used: materialsForTask,
      });
    } else {
      await onAddTask({
        name: newTaskName,
        assigned_to: employee.id,
        start: newTaskStart,
        deadline: newTaskDeadline,
        materials_used: materialsForTask,
      });
    }
    if (setSelectedEmployee) setSelectedEmployee(null);
    onClose();
  };

  const handleMarkCompleted = async () => {
    setError('');
    if (taskToEdit && onEditTask) {
      await onEditTask(taskToEdit.id, {
        completed: true,
        completed_at: new Date().toISOString(),
      });
      setCompleted(true);
      setCompletedAt(new Date().toISOString());
      if (setSelectedEmployee) setSelectedEmployee(null);
      onClose();
    }
  };

  if (!employee) return null;

  return (
    <AdminModal visible={visible} onClose={() => { if (setSelectedEmployee) setSelectedEmployee(null); onClose(); }} title={`${taskToEdit ? 'Edit Task' : 'Add Task'} for ${employee?.name || ''}`}>
      <View>
        <TextInput
          style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 }}
          placeholder="Task Title"
          value={newTaskName}
          onChangeText={setNewTaskName}
          accessibilityLabel="Task Title"
          testID="task-title-input"
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 }}
          placeholder="Start Time (e.g. 09:00)"
          value={newTaskStart}
          onChangeText={setNewTaskStart}
          accessibilityLabel="Start Time"
          testID="task-start-input"
        />
        <TextInput
          style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 16 }}
          placeholder="Deadline (e.g. 17:00)"
          value={newTaskDeadline}
          onChangeText={setNewTaskDeadline}
          accessibilityLabel="Deadline"
          testID="task-deadline-input"
        />
        {/* Optional: Materials section, collapsible */}
        <TouchableOpacity
          style={{ marginTop: 10, marginBottom: 4, backgroundColor: '#e3f2fd', borderRadius: 8, padding: 8, alignItems: 'center' }}
          onPress={() => setShowMaterials(prev => !prev)}
        >
          <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{showMaterials ? 'Hide Materials' : 'Add Materials (Optional)'}</Text>
        </TouchableOpacity>
        {showMaterials && (
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ marginRight: 6 }}>Material:</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 6, flex: 1, backgroundColor: '#fff' }}
                placeholder="Material ID or Name"
                value={selectedMaterialId}
                onChangeText={setSelectedMaterialId}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ marginRight: 6 }}>Type:</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 6, flex: 1, backgroundColor: '#fff' }}
                placeholder="Type ID (optional)"
                value={selectedMaterialTypeId}
                onChangeText={setSelectedMaterialTypeId}
              />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ marginRight: 6 }}>Quantity:</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 6, flex: 1, backgroundColor: '#fff' }}
                placeholder="Quantity"
                value={materialQuantity}
                onChangeText={setMaterialQuantity}
                keyboardType="numeric"
              />
            </View>
            <TouchableOpacity
              style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 8, marginBottom: 8, alignItems: 'center' }}
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
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Add Material</Text>
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
          </View>
        )}
        {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <TouchableOpacity
            style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 100 }}
            onPress={handleAddOrEdit}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{loading ? (taskToEdit ? 'Updating...' : 'Adding...') : (taskToEdit ? 'Update Task' : 'Add Task')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#bbb', borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 100 }} onPress={() => { if (setSelectedEmployee) setSelectedEmployee(null); onClose(); }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
        {taskToEdit && !completed && (
          <TouchableOpacity
            style={{ backgroundColor: '#388e3c', borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 100, marginTop: 12 }}
            onPress={handleMarkCompleted}
            disabled={loading}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{loading ? 'Completing...' : 'Mark as Completed'}</Text>
          </TouchableOpacity>
        )}
        {completed && completedAt && (
          <Text style={{ color: '#388e3c', marginTop: 8 }}>Completed at: {new Date(completedAt).toLocaleString()}</Text>
        )}
      </View>
    </AdminModal>
  );
};

export default AddTaskModal;
