import { FontAwesome5 } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Image, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/cloud.js';
import { adminStyles } from '../utility/styles';
import { Employee, Material, MaterialType, Task } from '../utility/types';
import { minutesLate } from '../utility/utils';
import AdminModal from './AdminModal';

interface TasksTabProps {
  user: any;
  employees: Employee[];
  materials: Material[];
  materialTypes: Record<string, MaterialType[]>;
  darkMode: boolean;
  performanceSettings: any;
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
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedMaterialForTask, setSelectedMaterialForTask] = useState<string>('');
  const [selectedMaterialTypeForTask, setSelectedMaterialTypeForTask] = useState<string>('');
  const [materialQuantityForTask, setMaterialQuantityForTask] = useState('');
  const [materialsForNewTask, setMaterialsForNewTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskEmployee, setAddTaskEmployee] = useState<Employee | null>(null);

  // Task CRUD handlers
  const handleAddTaskForEmployee = async () => {
    if (!newTaskName || !newTaskStart || !newTaskDeadline || !selectedTaskEmployee) return;
    
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        name: newTaskName,
        assignedTo: selectedTaskEmployee.id,
        business_id: user.business_id,
        start: newTaskStart,
        deadline: newTaskDeadline,
        completed: false,
        completedAt: null,
        materialsUsed: materialsForNewTask,
      })
      .select('*')
      .single();
      
    if (!error && data) {
      setTasks([...tasks, data]);
      setNewTaskName('');
      setNewTaskStart('');
      setNewTaskDeadline('');
      setMaterialsForNewTask([]);
    }
  };

  const handleAddMaterialToTask = () => {
    if (!selectedMaterialForTask || !materialQuantityForTask) return;
    const quantity = parseFloat(materialQuantityForTask);
    if (isNaN(quantity) || quantity <= 0) return;
    
    setMaterialsForNewTask([...materialsForNewTask, {
      materialId: selectedMaterialForTask,
      materialTypeId: selectedMaterialTypeForTask || undefined,
      quantity: quantity
    }]);
    
    setSelectedMaterialForTask('');
    setSelectedMaterialTypeForTask('');
    setMaterialQuantityForTask('');
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: true, completedAt: new Date().toISOString() }
        : t
    ));
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (!error) setTasks(tasks.filter(t => t.id !== taskId));
  };

  // Header component
  const ListHeaderComponent = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={adminStyles.sectionTitle}>Tasks</Text>
      </View>
      {!selectedTaskEmployee ? null : (
        <>
          <Text style={[adminStyles.addEmployeeTitle, { marginBottom: 8 }]}>Tasks for {selectedTaskEmployee.name}</Text>
          {tasks.filter(t => t.assignedTo === selectedTaskEmployee.id).length === 0 ? (
            <Text style={{ color: '#888', marginVertical: 8 }}>No tasks assigned.</Text>
          ) : null}
        </>
      )}
    </>
  );

  // Footer component for add task form
  const ListFooterComponent = selectedTaskEmployee ? (
    <View style={[adminStyles.addEmployeeCard, { width: '100%', alignItems: 'stretch', marginTop: 0 }]}> 
      <Text style={adminStyles.addEmployeeTitle}>Add Task for {selectedTaskEmployee.name}</Text>
      <TextInput style={[adminStyles.inputText, { width: '100%', marginBottom: 10 }]} placeholder="Task Title" value={newTaskName} onChangeText={setNewTaskName} />
      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        <View style={[adminStyles.dropdownContainer, { flex: 1, marginRight: 6 }]}>
          <Text style={adminStyles.dropdownLabel}>Start</Text>
          <TouchableOpacity
            style={[adminStyles.dropdown, { width: '100%' }]}
            onPress={() => {
              const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
              const idx = times.indexOf(newTaskStart);
              setNewTaskStart(times[(idx + 1) % times.length]);
            }}
          >
            <Text style={adminStyles.dropdownText}>{newTaskStart || 'Select'}</Text>
          </TouchableOpacity>
        </View>
        <View style={[adminStyles.dropdownContainer, { flex: 1, marginLeft: 6 }]}>
          <Text style={adminStyles.dropdownLabel}>Deadline</Text>
          <TouchableOpacity
            style={[adminStyles.dropdown, { width: '100%' }]}
            onPress={() => {
              const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
              const idx = times.indexOf(newTaskDeadline);
              setNewTaskDeadline(times[(idx + 1) % times.length]);
            }}
          >
            <Text style={adminStyles.dropdownText}>{newTaskDeadline || 'Select'}</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Material selection UI */}
      <View style={{ marginTop: 12, marginBottom: 12, backgroundColor: '#f5faff', borderRadius: 10, padding: 10 }}>
        <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 4 }}>Add Materials Used</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ marginRight: 6 }}>Material:</Text>
          <View style={{ flex: 1 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {materials.map(mat => (
                <TouchableOpacity
                  key={mat.id}
                  style={{
                    backgroundColor: selectedMaterialForTask === mat.id ? '#1976d2' : '#e3f2fd',
                    borderRadius: 8,
                    padding: 6,
                    marginRight: 6,
                  }}
                  onPress={() => {
                    setSelectedMaterialForTask(mat.id);
                    setSelectedMaterialTypeForTask('');
                  }}
                >
                  <Text style={{ color: selectedMaterialForTask === mat.id ? '#fff' : '#1976d2' }}>{mat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
        {selectedMaterialForTask && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ marginRight: 6 }}>Type:</Text>
            <View style={{ flex: 1 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {(materialTypes[selectedMaterialForTask] || []).map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={{
                      backgroundColor: selectedMaterialTypeForTask === type.id ? '#1976d2' : '#e3f2fd',
                      borderRadius: 8,
                      padding: 6,
                      marginRight: 6,
                    }}
                    onPress={() => setSelectedMaterialTypeForTask(type.id)}
                  >
                    <Text style={{ color: selectedMaterialTypeForTask === type.id ? '#fff' : '#1976d2' }}>{type.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ marginRight: 6 }}>Quantity:</Text>
          <TextInput
            style={[adminStyles.inputText, { flex: 1 }]}
            placeholder="Quantity"
            value={materialQuantityForTask}
            onChangeText={setMaterialQuantityForTask}
            keyboardType="numeric"
          />
          <TouchableOpacity style={[adminStyles.addBtn, { marginLeft: 8 }]} onPress={handleAddMaterialToTask}>
            <Text style={adminStyles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        {materialsForNewTask.length > 0 && (
          <View style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 13, color: '#888' }}>Added:</Text>
            {materialsForNewTask.map((mu, idx) => {
              const mat = materials.find(m => m.id === mu.materialId);
              const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
              return (
                <Text key={idx} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.name})` : ''}: {mu.quantity} {mat?.unit}</Text>
              );
            })}
          </View>
        )}
      </View>
      <TouchableOpacity style={[adminStyles.addBtn, { marginTop: 8, alignSelf: 'center', minWidth: 120 }]} onPress={handleAddTaskForEmployee}>
        <Text style={adminStyles.addBtnText}>Add Task</Text>
      </TouchableOpacity>
    </View>
  ) : null;

  // Data: always use (Employee | Task)[] and type guard in renderItem
  const data: (Employee | Task)[] = !selectedTaskEmployee
    ? employees
    : tasks.filter(t => t.assignedTo === selectedTaskEmployee.id);

  const renderItem = ({ item }: { item: Employee | Task }) => {
    if ('assignedTo' in item) {
      // Task
      const isLate = !item.completed && typeof item.deadline === 'string' && typeof item.completedAt === 'string' && minutesLate(item.deadline, item.completedAt) > lateThreshold;
      return (
        <View key={item.id} style={{
          backgroundColor: item.completed ? '#e8f5e9' : isLate ? '#ffebee' : '#fffde7',
          borderRadius: 14,
          padding: 14,
          marginBottom: 12,
          shadowColor: '#1976d2',
          shadowOpacity: 0.06,
          shadowRadius: 6,
          elevation: 1,
          borderLeftWidth: 6,
          borderLeftColor: item.completed ? '#388e3c' : isLate ? '#c62828' : '#ff9800',
        }}>
          <Text style={{ fontWeight: 'bold', fontSize: 17, color: '#1976d2', marginBottom: 2 }}>{item.name}</Text>
          <Text style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Start: {item.start} | Due: {item.deadline}</Text>
          {item.completed && (
            <Text style={{ color: '#388e3c', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Completed at: {item.completedAt ? new Date(item.completedAt).toLocaleString() : ''}</Text>
          )}
          {isLate && !item.completed && typeof item.deadline === 'string' && typeof item.completedAt === 'string' && (
            <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Late by {minutesLate(item.deadline, item.completedAt)} min</Text>
          )}
          {/* Show materials used with type dropdown if applicable */}
          {Array.isArray(item.materialsUsed) && item.materialsUsed.length > 0 && (
            <View style={{ marginTop: 4, marginBottom: 4 }}>
              <Text style={{ fontSize: 13, color: '#1976d2', fontWeight: 'bold' }}>Materials Used:</Text>
              {item.materialsUsed.map((mu, idx2) => {
                const mat = materials.find(m => m.id === mu.materialId);
                const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
                return (
                  <Text key={idx2} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.name})` : ''}: {mu.quantity} {mat?.unit}</Text>
                );
              })}
            </View>
          )}
          
          {/* Rating Section for Completed Tasks */}
          {item.completed && performanceSettings.ratingSystemEnabled && (
            <View style={{ marginTop: 8, marginBottom: 8, padding: 8, backgroundColor: '#f8f9fa', borderRadius: 8 }}>
              <Text style={{ fontSize: 13, color: '#1976d2', fontWeight: 'bold', marginBottom: 4 }}>
                Task Rating
              </Text>
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
                onPress={() => onRateTask(item)}
              >
                <FontAwesome5 name="star" size={14} color="#fff" style={{ marginRight: 6 }} />
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 12 }}>
                  Rate Task
                </Text>
              </TouchableOpacity>
            </View>
          )}
          
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
            {!item.completed && (
              <TouchableOpacity style={{ backgroundColor: '#388e3c', borderRadius: 8, padding: 8, marginRight: 8 }} onPress={() => handleCompleteTask(item.id)}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark Complete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 8 }} onPress={() => handleDeleteTask(item.id)}>
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    } else {
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
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <FlatList
        data={data}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
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

      {/* Add Task Modal */}
      <AdminModal visible={showAddTaskModal} onClose={() => setShowAddTaskModal(false)} title={!addTaskEmployee ? 'Select Employee' : `Add Task for ${addTaskEmployee.name}`}>
        {!addTaskEmployee ? (
          <>
            <FlatList
              data={employees}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' }}
                  onPress={() => setAddTaskEmployee(item)}
                >
                  <Text style={{ fontSize: 16 }}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAddTaskModal(false)}>
              <Text style={adminStyles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput style={adminStyles.inputText} placeholder="Task Title" value={newTaskName} onChangeText={setNewTaskName} />
            <TextInput style={adminStyles.inputText} placeholder="Start Time (e.g. 09:00)" value={newTaskStart} onChangeText={setNewTaskStart} />
            <TextInput style={adminStyles.inputText} placeholder="Deadline (e.g. 17:00)" value={newTaskDeadline} onChangeText={setNewTaskDeadline} />
            {/* Materials selection (reuse existing logic) */}
            <View style={{ marginTop: 12, marginBottom: 12, backgroundColor: '#f5faff', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: 4 }}>Add Materials Used</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ marginRight: 6 }}>Material:</Text>
                <View style={{ flex: 1 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {materials.map(mat => (
                      <TouchableOpacity
                        key={mat.id}
                        style={{
                          backgroundColor: selectedMaterialForTask === mat.id ? '#1976d2' : '#e3f2fd',
                          borderRadius: 8,
                          padding: 6,
                          marginRight: 6,
                        }}
                        onPress={() => {
                          setSelectedMaterialForTask(mat.id);
                          setSelectedMaterialTypeForTask('');
                        }}
                      >
                        <Text style={{ color: selectedMaterialForTask === mat.id ? '#fff' : '#1976d2' }}>{mat.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              {selectedMaterialForTask && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ marginRight: 6 }}>Type:</Text>
                  <View style={{ flex: 1 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {(materialTypes[selectedMaterialForTask] || []).map(type => (
                        <TouchableOpacity
                          key={type.id}
                          style={{
                            backgroundColor: selectedMaterialTypeForTask === type.id ? '#1976d2' : '#e3f2fd',
                            borderRadius: 8,
                            padding: 6,
                            marginRight: 6,
                          }}
                          onPress={() => setSelectedMaterialTypeForTask(type.id)}
                        >
                          <Text style={{ color: selectedMaterialTypeForTask === type.id ? '#fff' : '#1976d2' }}>{type.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ marginRight: 6 }}>Quantity:</Text>
                <TextInput
                  style={[adminStyles.inputText, { flex: 1 }]}
                  placeholder="Quantity"
                  value={materialQuantityForTask}
                  onChangeText={setMaterialQuantityForTask}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={adminStyles.addBtn} onPress={handleAddMaterialToTask}>
                  <Text style={adminStyles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
              {/* List added materials for this task */}
              {materialsForNewTask.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: 'bold', color: '#1976d2' }}>Materials for Task:</Text>
                  {materialsForNewTask.map((mu, idx) => {
                    const mat = materials.find(m => m.id === mu.materialId);
                    const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
                    return (
                      <Text key={idx} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.name})` : ''}: {mu.quantity} {mat?.unit}</Text>
                    );
                  })}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
              <TouchableOpacity style={adminStyles.addBtn} onPress={async () => {
                if (!newTaskName || !newTaskStart || !newTaskDeadline || !addTaskEmployee) return;
                const { data, error } = await supabase
                  .from('tasks')
                  .insert({
                    name: newTaskName,
                    assignedTo: addTaskEmployee.id,
                    business_id: user.business_id,
                    start: newTaskStart,
                    deadline: newTaskDeadline,
                    completed: false,
                    completedAt: null,
                    materialsUsed: materialsForNewTask,
                  })
                  .select('*')
                  .single();
                if (!error && data) setTasks([...tasks, data]);
                setNewTaskName('');
                setNewTaskStart('');
                setNewTaskDeadline('');
                setMaterialsForNewTask([]);
                setAddTaskEmployee(null);
                setShowAddTaskModal(false);
              }}>
                <Text style={adminStyles.addBtnText}>Add Task</Text>
              </TouchableOpacity>
              <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setAddTaskEmployee(null)}>
                <Text style={adminStyles.closeBtnText}>Back</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </AdminModal>
    </SafeAreaView>
  );
};

export default TasksTab; 