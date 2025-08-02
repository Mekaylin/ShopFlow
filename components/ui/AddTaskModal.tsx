import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
// @ts-ignore
import { Picker } from '@react-native-picker/picker';
import AdminModal from '../admin/AdminModal';
import { fetchMaterialTypes } from '../utility/fetchMaterialTypes';
import { Employee, MaterialType } from '../utility/types';
import { Colors } from '../../constants/Colors';

// Unified AddTaskModal for both admin and employee flows
import { Material } from '../utility/types';
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
  materials?: Material[]; // Pass materials for dropdown
  darkMode?: boolean; // Add darkMode support

};
const AddTaskModal: React.FC<AddTaskModalProps> = (props) => {
  const {
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
    taskToEdit,
    materials = [],
    darkMode = false,
  } = props;
  
  // Theme colors based on darkMode
  const themeColors = darkMode ? Colors.dark : Colors.light;
  
  // Determine which employee to use (must be before any hook that uses it)
  const employee = currentEmployee || selectedEmployee; // Only declare these once
  const [showMaterials, setShowMaterials] = useState(false);
  const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
  const [selectedMaterialTypeId, setSelectedMaterialTypeId] = useState('');
  // Fetch material types when modal opens (if employee has business_id)
  useEffect(() => {
    if (visible && employee?.business_id) {
      fetchMaterialTypes(employee.business_id)
        .then(setMaterialTypes)
        .catch(() => setMaterialTypes([]));
    }
  }, [visible, employee?.business_id]);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('');
  const [materialsForTask, setMaterialsForTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);


  // Determine which employee to use (already declared above)
  // const employee = currentEmployee || selectedEmployee;

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
    // If editing and marking as completed, always set completed_at
    if (taskToEdit && onEditTask) {
      const updates: any = {
        name: newTaskName,
        start: newTaskStart,
        deadline: newTaskDeadline,
        materials_used: materialsForTask,
      };
      if (completed && !taskToEdit.completed) {
        updates.completed = true;
        updates.completed_at = new Date().toISOString();
      }
      await onEditTask(taskToEdit.id, updates);
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
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: themeColors.border, 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 10, 
            fontSize: 16,
            backgroundColor: themeColors.surface,
            color: themeColors.text
          }}
          placeholder="Task Title"
          placeholderTextColor={themeColors.textSecondary}
          value={newTaskName}
          onChangeText={setNewTaskName}
          accessibilityLabel="Task Title"
          testID="task-title-input"
        />
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: themeColors.border, 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 10, 
            fontSize: 16,
            backgroundColor: themeColors.surface,
            color: themeColors.text
          }}
          placeholder="Start Time (e.g. 09:00)"
          placeholderTextColor={themeColors.textSecondary}
          value={newTaskStart}
          onChangeText={setNewTaskStart}
          accessibilityLabel="Start Time"
          testID="task-start-input"
        />
        <TextInput
          style={{ 
            borderWidth: 1, 
            borderColor: themeColors.border, 
            borderRadius: 8, 
            padding: 12, 
            marginBottom: 10, 
            fontSize: 16,
            backgroundColor: themeColors.surface,
            color: themeColors.text
          }}
          placeholder="Deadline (e.g. 17:00)"
          placeholderTextColor={themeColors.textSecondary}
          value={newTaskDeadline}
          onChangeText={setNewTaskDeadline}
          accessibilityLabel="Deadline"
          testID="task-deadline-input"
        />
        {/* Optional: Materials section, collapsible */}
        <TouchableOpacity
          style={{ 
            marginTop: 10, 
            marginBottom: 4, 
            backgroundColor: themeColors.backgroundSecondary, 
            borderRadius: 8, 
            padding: 8, 
            alignItems: 'center' 
          }}
          onPress={() => setShowMaterials(prev => !prev)}
        >
          <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>{showMaterials ? 'Hide Materials' : 'Add Materials (Optional)'}</Text>
        </TouchableOpacity>
        {showMaterials && (
          <View style={{ marginBottom: 8 }}>
            {/* Material Dropdown */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ marginRight: 6, color: themeColors.text }}>Material:</Text>
              <View style={{ 
                flex: 1, 
                borderWidth: 1, 
                borderColor: themeColors.border, 
                borderRadius: 6, 
                backgroundColor: themeColors.surface 
              }}>
                <Picker
                  selectedValue={selectedMaterialId}
                  onValueChange={setSelectedMaterialId}
                  style={{ height: 44 }}
                  itemStyle={{ fontSize: 16 }}
                >
                  {(!materials || materials.length === 0) ? (
                    <Picker.Item label="No materials available" value="" />
                  ) : (
                    <>
                      <Picker.Item label="Select Material" value="" />
                      {materials.map((mat: Material) => (
                        <Picker.Item key={mat.id} label={`${mat.name} (${mat.unit})`} value={mat.id} />
                      ))}
                    </>
                  )}
                </Picker>
              </View>
            </View>
            {/* Type Dropdown */}
            {materialTypes.length > 0 && selectedMaterialId && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ marginRight: 6, color: themeColors.text }}>Type (optional):</Text>
                <View style={{ 
                  flex: 1, 
                  borderWidth: 1, 
                  borderColor: themeColors.border, 
                  borderRadius: 6, 
                  backgroundColor: themeColors.surface 
                }}>
                  <Picker
                    selectedValue={selectedMaterialTypeId}
                    onValueChange={setSelectedMaterialTypeId}
                    style={{ height: 44 }}
                    itemStyle={{ fontSize: 16 }}
                  >
                    <Picker.Item label="Select Type (optional)" value="" />
                    {materialTypes
                      .filter(type => type.material_id === selectedMaterialId)
                      .map(type => (
                        <Picker.Item key={type.id} label={type.name} value={type.id} />
                      ))}
                  </Picker>
                </View>
              </View>
            )}
            {/* Quantity Textbox */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ marginRight: 6, color: themeColors.text }}>Quantity:</Text>
              <TextInput
                style={{ 
                  borderWidth: 1, 
                  borderColor: themeColors.border, 
                  borderRadius: 6, 
                  padding: 6, 
                  flex: 1, 
                  backgroundColor: themeColors.surface,
                  color: themeColors.text
                }}
                placeholder="Quantity"
                placeholderTextColor={themeColors.textSecondary}
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
                    {materials?.find((m: Material) => m.id === mat.materialId)?.name || mat.materialId}
                    {mat.materialTypeId ? ` (${materialTypes.find(t => t.id === mat.materialTypeId)?.name || mat.materialTypeId})` : ''}
                    : {mat.quantity}
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
      </ScrollView>
    </AdminModal>
  );
};

export default AddTaskModal;
