import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../lib/supabase';
import { adminStyles } from '../utility/styles';
import { Employee } from '../utility/types';
import AdminModal from './AdminModal';
import AdminRow from './AdminRow';

import type { User } from '../utility/types';

interface EmployeesTabProps {
  user: User;
  darkMode: boolean;
  employees: Employee[];
  setEmployees: (employees: Employee[]) => void;
  departments: string[];
  setDepartments: (departments: string[]) => void;
  biometricEnabled?: boolean;
  biometricLoggedIn?: boolean;
}

const EmployeesTab: React.FC<EmployeesTabProps> = ({
  user,
  darkMode,
  employees,
  setEmployees,
  departments,
  setDepartments,
  biometricEnabled = false,
  biometricLoggedIn = false,
}) => {
  // State
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newEmployeeLunchStart, setNewEmployeeLunchStart] = useState('12:00');
  const [newEmployeeLunchEnd, setNewEmployeeLunchEnd] = useState('12:30');
  const [newEmployeePhotoUri, setNewEmployeePhotoUri] = useState<string | undefined>(undefined);
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState('');
  const [newDepartment, setNewDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Modal state using local state instead of navigation
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [showAssignTaskModal, setShowAssignTaskModal] = useState(false);

  // Assign Task Handler
  const handleAssignTask = async () => {
    if (!newTaskName || !newTaskStart || !newTaskDeadline) {
      Alert.alert('Missing Fields', 'Please fill in all task fields.');
      return false;
    }
    setLoading(true);
    try {
      // Use snake_case for all fields to match Supabase schema
      const payload = {
        name: newTaskName,
        assigned_to: editEmployee?.id,
        business_id: user.business_id,
        start: newTaskStart,
        deadline: newTaskDeadline,
        completed: false,
        completed_at: null,
      };
      const { error } = await supabase
        .from('tasks')
        .insert(payload);
      if (error) {
        setError(error.message || 'Failed to assign task.');
        return false;
      } else {
        Alert.alert('Success', 'Task assigned!');
        router.back();
        setNewTaskName('');
        setNewTaskStart('');
        setNewTaskDeadline('');
        return true;
      }
    } catch (err) {
      setError('Unexpected error assigning task.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleAddEmployee = async () => {
    setLoading(true);
    try {
      console.log('handleAddEmployee called');
      console.log('Current user:', user);

      // Check authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('You must be logged in to add an employee.');
        Alert.alert('Add Employee Error', 'No Supabase session found.');
        setLoading(false);
        return false;
      }

      if (!user || !user.business_id || !user.id) {
        setError('User session missing. Please log in again.');
        Alert.alert('Add Employee Error', 'User object missing business_id or id.');
        setLoading(false);
        return false;
      }

      if (!newEmployeeName || !newEmployeeCode) {
        setError('Please enter both name and code.');
        Alert.alert('Add Employee Error', 'Name and code are required.');
        setLoading(false);
        return false;
      }

      // Prepare payload with a new UUID for id
      const payload = {
        id: uuidv4(),
        name: newEmployeeName,
        code: newEmployeeCode,
        lunch_start: newEmployeeLunchStart || null,
        lunch_end: newEmployeeLunchEnd || null,
        photo_url: newEmployeePhotoUri || null,
        department: newEmployeeDepartment || null,
        business_id: user.business_id,
      };
      console.log('Payload:', payload);

      let data: any = null, error: any = null;
      try {
        const result = await Promise.race([
          supabase
            .from('employees')
            .insert([payload])
            .select('*')
            .single(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 8000)),
        ]);
        if (result && typeof result === 'object' && ('data' in result || 'error' in result)) {
          data = (result as any).data;
          error = (result as any).error;
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error('Add employee timeout or network error:', errMsg, err);
        Alert.alert('Add Employee Error', `Timeout or network error: ${errMsg}`);
        setError('Request timed out or network error. Check your connection and Supabase policies.');
        setLoading(false);
        return false;
      }

      console.log('Add employee response:', { data, error });

      if (error || !data) {
        console.error('Add employee error (full object):', error);
        Alert.alert('Add Employee Error', `Supabase error: ${JSON.stringify(error, null, 2)}`);
        setError(`Code: ${error?.code || 'N/A'}\nMessage: ${error?.message || 'Failed to add employee.'}\nHint: ${error?.hint || ''}`);
        setLoading(false);
        return false;
      }

      console.log('Employee added successfully:', data);
      Alert.alert('Success', 'Employee added successfully!');

      // Refetch employees from Supabase to ensure UI is up to date
      try {
        const { data: allEmployees, error: fetchError } = await supabase
          .from('employees')
          .select('*')
          .eq('business_id', user.business_id);
        console.log('Refetch employees response:', { allEmployees, fetchError });
        if (!fetchError && allEmployees) setEmployees(allEmployees);
      } catch (fetchErr) {
        const fetchErrMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
        console.error('Refetch employees error:', fetchErrMsg, fetchErr);
        Alert.alert('Refetch Employees Error', `Error: ${fetchErrMsg}`);
      }

      setNewEmployeeName('');
      setNewEmployeeCode('');
      setNewEmployeeLunchStart('12:00');
      setNewEmployeeLunchEnd('12:30');
      setNewEmployeePhotoUri(undefined);
      setNewEmployeeDepartment('');
      setLoading(false);
      return true;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('handleAddEmployee exception:', errMsg, err);
      Alert.alert('Add Employee Exception', `Exception: ${errMsg}`);
      setError('Unexpected error adding employee.');
      setLoading(false);
      return false;
    }
  };

  const handleSaveEmployee = async () => {
    if (!editEmployee) return;
    console.log('handleSaveEmployee called');
    console.log('User:', user);
    console.log('EditEmployee:', editEmployee);
    console.log('Payload:', {
      name: newEmployeeName,
      code: newEmployeeCode,
      lunch_start: newEmployeeLunchStart,
      lunch_end: newEmployeeLunchEnd,
      photo_url: newEmployeePhotoUri,
      department: newEmployeeDepartment,
    });

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({
          name: newEmployeeName,
          code: newEmployeeCode,
          lunch_start: newEmployeeLunchStart,
          lunch_end: newEmployeeLunchEnd,
          photo_url: newEmployeePhotoUri,
          department: newEmployeeDepartment,
        })
        .eq('id', editEmployee.id)
        .select('*')
        .single();

      console.log('Save employee response:', { data, error });
      if (error) {
        setError(error.message || 'Failed to save employee.');
      } else if (data) {
        setEmployees(employees.map(e => e.id === editEmployee.id ? data : e));
        setEditEmployee(null);
        setNewEmployeeName('');
        setNewEmployeeCode('');
        setNewEmployeeLunchStart('12:00');
        setNewEmployeeLunchEnd('12:30');
        setNewEmployeePhotoUri(undefined);
        setNewEmployeeDepartment('');
      }
    } catch (err) {
      setError('Unexpected error saving employee.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    console.log('handleDeleteEmployee called for id:', id);
    setLoading(true);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      console.log('Delete employee response:', { error });
      if (error) {
        setError(error.message || 'Failed to delete employee.');
      } else {
        setEmployees(employees.filter(e => e.id !== id));
      }
    } catch (err) {
      setError('Unexpected error deleting employee.');
    } finally {
      setLoading(false);
    }
  };

  const pickEmployeePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera roll permissions are required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewEmployeePhotoUri(result.assets[0].uri);
    }
  };

  const handleAddDepartment = async () => {
    console.log('handleAddDepartment called');
    console.log('Current user:', user);
    setLoading(true);
    try {
      // Defensive: check for valid session/user
      if (!user || !user.business_id || !user.id) {
        setError('User session missing. Please log in again.');
        setLoading(false);
        return;
      }

      // Sanitize payload (snake_case)
      const payload = {
        name: newDepartment,
        business_id: user.business_id,
      };
      console.log('Payload:', payload);

      if (!newDepartment) {
        setError('Please enter a department name.');
        setLoading(false);
        return;
      }

      if (departments.includes(newDepartment)) {
        setError('This department already exists.');
        setLoading(false);
        return;
      }

      const { error } = await supabase
        .from('departments')
        .insert(payload);
      console.log('Add department response:', { error });

      if (error) {
        console.error('Add department error (full object):', error);
        setError(`Code: ${error?.code || 'N/A'}\nMessage: ${error?.message || 'Failed to add department.'}\nHint: ${error?.hint || ''}`);
        setLoading(false);
        return;
      }

      console.log('Department added successfully:', payload);
      setDepartments([...departments, newDepartment]);
      setNewDepartment('');
      router.back();
    } catch (err) {
      console.error('handleAddDepartment exception:', err);
      setError('Unexpected error adding department.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff' }}>
      <ScrollView 
        style={{ flex: 1, padding: 8 }}
        contentContainerStyle={{ 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          justifyContent: 'center', 
          paddingBottom: 100 // Extra padding to ensure content doesn't get cut off
        }}
      >
        {employees.map(emp => (
          <TouchableOpacity
            key={emp.id}
            onPress={() => {
              setEditEmployee(emp);
              setNewEmployeeName(emp.name || '');
              setNewEmployeeCode(emp.code || '');
              setNewEmployeeLunchStart(((emp as any).lunch_start ?? emp.lunchStart) || '12:00');
              setNewEmployeeLunchEnd(((emp as any).lunch_end ?? emp.lunchEnd) || '12:30');
              setNewEmployeePhotoUri(((emp as any).photo_url ?? emp.photoUri) || undefined);
              setNewEmployeeDepartment(emp.department || '');
            }}
            activeOpacity={0.85}
            style={{
              backgroundColor: darkMode ? '#23263a' : '#fff',
              borderRadius: 10,
              marginBottom: 7,
              marginHorizontal: 2,
              paddingVertical: 8,
              paddingHorizontal: 6,
              borderWidth: 1.2,
              borderColor: '#1976d2',
              flexDirection: 'row',
              alignItems: 'center',
              minWidth: 0,
              maxWidth: '100%',
            }}
          >
            <AdminRow
              icon={((emp as any).photo_url || emp.photoUri) ? undefined : 'user'}
              title={emp.name}
              subtitle={emp.department || 'No Dept'}
              actions={
                <TouchableOpacity
                  onPress={e => {
                    e.stopPropagation && e.stopPropagation();
                    setEditEmployee(emp);
                    setShowAssignTaskModal(true);
                  }}
                  style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 6 }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>Assign Task</Text>
                </TouchableOpacity>
              }
              style={{ backgroundColor: 'transparent' }}
            >
              <Text style={{ color: '#888', fontSize: 12, marginBottom: 2 }}>{`Lunch: ${((emp as any).lunch_start ?? emp.lunchStart) || ''} - ${((emp as any).lunch_end ?? emp.lunchEnd) || ''}`}</Text>
            </AdminRow>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Fixed position buttons at bottom */}
      <View style={{ 
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: darkMode ? '#181a20' : '#f5faff',
        padding: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: darkMode ? '#333' : '#e0e0e0'
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center' }}>
          <TouchableOpacity 
            style={[adminStyles.addBtn, { flex: 1, marginRight: 8 }]} 
            onPress={() => setShowAddEmployeeModal(true)}
          >
            <Text style={adminStyles.addBtnText}>Add New Employee</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[adminStyles.addBtn, { flex: 1, backgroundColor: '#388e3c' }]} 
            onPress={() => setShowAddDeptModal(true)}
          >
            <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>Add Department</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Add Employee Modal */}
      <AdminModal visible={!!showAddEmployeeModal} onClose={() => setShowAddEmployeeModal(false)} title="Add New Employee">
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={[adminStyles.inputText, { flex: 1 }]} placeholder="Name" value={newEmployeeName} onChangeText={setNewEmployeeName} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput style={[adminStyles.inputText, { flex: 1 }]} placeholder="Code" value={newEmployeeCode} onChangeText={setNewEmployeeCode} />
              {biometricEnabled && (
                <TouchableOpacity
                  style={{ marginLeft: 8, backgroundColor: biometricLoggedIn ? '#388e3c' : '#1976d2', borderRadius: 8, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                  onPress={async () => {}}
                  accessibilityLabel="Fingerprint login"
                >
                  <FontAwesome5 name="fingerprint" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>{biometricLoggedIn ? 'Clocked In' : 'Clock In'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={[adminStyles.inputText, { flex: 1 }]} placeholder="Lunch Start" value={newEmployeeLunchStart} onChangeText={setNewEmployeeLunchStart} />
            <TextInput style={[adminStyles.inputText, { flex: 1 }]} placeholder="Lunch End" value={newEmployeeLunchEnd} onChangeText={setNewEmployeeLunchEnd} />
          </View>
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={[adminStyles.inputText, { flex: 1 }]} placeholder="Department" value={newEmployeeDepartment} onChangeText={setNewEmployeeDepartment} />
          </View>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} onPress={pickEmployeePhoto}>
            {newEmployeePhotoUri ? (
              <Image source={{ uri: newEmployeePhotoUri }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e3f2fd', marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome5 name="camera" size={20} color="#1976d2" />
              </View>
            )}
            <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{newEmployeePhotoUri ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[adminStyles.addBtn, (!newEmployeeName || !newEmployeeCode) && { opacity: 0.5 }]}
            onPress={async () => {
              const added = await handleAddEmployee();
              if (added) {
                setShowAddEmployeeModal(false);
                setNewEmployeeName('');
                setNewEmployeeCode('');
                setNewEmployeeLunchStart('12:00');
                setNewEmployeeLunchEnd('12:30');
                setNewEmployeePhotoUri(undefined);
                setNewEmployeeDepartment('');
              }
            }}
            disabled={!newEmployeeName || !newEmployeeCode}
          >
            <Text style={adminStyles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </AdminModal>

      {/* Add Department Modal */}
      <AdminModal visible={!!showAddDeptModal} onClose={() => setShowAddDeptModal(false)} title="Add Department">
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <TextInput style={adminStyles.inputText} placeholder="Department Name" value={newDepartment} onChangeText={setNewDepartment} />
          <TouchableOpacity
            style={[adminStyles.addBtn, !newDepartment && { opacity: 0.5 }]}
            onPress={async () => {
              await handleAddDepartment();
              setShowAddDeptModal(false);
              setNewDepartment('');
            }}
            disabled={!newDepartment}
          >
            <Text style={adminStyles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </ScrollView>
      </AdminModal>

      {/* Edit Employee Modal */}
      <AdminModal visible={!!editEmployee} onClose={() => setEditEmployee(null)} title="Edit Employee">
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={adminStyles.inputText} placeholder="Name" value={newEmployeeName} onChangeText={setNewEmployeeName} />
            <TextInput style={adminStyles.inputText} placeholder="Code" value={newEmployeeCode} onChangeText={setNewEmployeeCode} />
          </View>
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={adminStyles.inputText} placeholder="Lunch Start" value={newEmployeeLunchStart} onChangeText={setNewEmployeeLunchStart} />
            <TextInput style={adminStyles.inputText} placeholder="Lunch End" value={newEmployeeLunchEnd} onChangeText={setNewEmployeeLunchEnd} />
          </View>
          <View style={adminStyles.addEmployeeInputsRow}>
            <TextInput style={adminStyles.inputText} placeholder="Department" value={newEmployeeDepartment} onChangeText={setNewEmployeeDepartment} />
          </View>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} onPress={pickEmployeePhoto}>
            {newEmployeePhotoUri ? (
              <Image source={{ uri: newEmployeePhotoUri }} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 8 }} />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#e3f2fd', marginRight: 8, alignItems: 'center', justifyContent: 'center' }}>
                <FontAwesome5 name="camera" size={20} color="#1976d2" />
              </View>
            )}
            <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{newEmployeePhotoUri ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={adminStyles.saveBtn} onPress={handleSaveEmployee}>
            <Text style={adminStyles.saveBtnText}>Save</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[adminStyles.closeBtn, { backgroundColor: '#c62828', marginTop: 12 }]} onPress={() => { if (editEmployee) handleDeleteEmployee(editEmployee.id); setEditEmployee(null); }}>
            <Text style={[adminStyles.closeBtnText, { color: '#fff' }]}>Delete Employee</Text>
          </TouchableOpacity>
        </ScrollView>
      </AdminModal>

      {/* Assign Task Modal */}
      <AdminModal
        visible={!!showAssignTaskModal}
        onClose={() => setShowAssignTaskModal(false)}
        title={editEmployee ? `Assign Task to ${editEmployee.name}` : 'Assign Task'}
      >
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
          <TextInput
            style={adminStyles.inputText}
            placeholder="Task Name"
            value={newTaskName}
            onChangeText={setNewTaskName}
          />
          <TextInput
            style={[adminStyles.inputText, { marginTop: 12 }]}
            placeholder="Start Time (e.g., 09:00)"
            value={newTaskStart}
            onChangeText={setNewTaskStart}
          />
          <TextInput
            style={[adminStyles.inputText, { marginTop: 12 }]}
            placeholder="Deadline (e.g., 17:00)"
            value={newTaskDeadline}
            onChangeText={setNewTaskDeadline}
          />
          <TouchableOpacity
            style={[adminStyles.addBtn, { marginTop: 16 }, (!newTaskName || !newTaskStart || !newTaskDeadline) && { opacity: 0.5 }]}
            onPress={async () => {
              const assigned = await handleAssignTask();
              if (assigned) router.back();
            }}
            disabled={!newTaskName || !newTaskStart || !newTaskDeadline}
          >
            <Text style={adminStyles.addBtnText}>Assign Task</Text>
          </TouchableOpacity>
        </ScrollView>
      </AdminModal>

      {/* Loading Overlay (no duplicate overlays) */}
      {loading && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0008', zIndex: 100, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 18 }}>Loading...</Text>
        </View>
      )}
      {/* Error Alert (no duplicate UI) */}
      {error && (() => { setTimeout(() => { Alert.alert('Error', error); setError(null); }, 100); return null; })()}
    </View>
  );
};

export default EmployeesTab;