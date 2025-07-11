import { FontAwesome5 } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../services/cloud.js';
import { adminStyles } from '../utility/styles';
import { Employee } from '../utility/types';
import AdminModal from './AdminModal';
import AdminRow from './AdminRow';

interface EmployeesTabProps {
  user: any;
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
  // Employee state
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newEmployeeLunchStart, setNewEmployeeLunchStart] = useState('12:00');
  const [newEmployeeLunchEnd, setNewEmployeeLunchEnd] = useState('12:30');
  const [newEmployeePhotoUri, setNewEmployeePhotoUri] = useState<string | undefined>(undefined);
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState('');
  const [newDepartment, setNewDepartment] = useState('');

  // Handlers
  const handleAddEmployee = async () => {
    console.log('handleAddEmployee called');
    console.log('User:', user);
    console.log('Payload:', {
      name: newEmployeeName,
      code: newEmployeeCode,
      lunchStart: newEmployeeLunchStart,
      lunchEnd: newEmployeeLunchEnd,
      photo_uri: newEmployeePhotoUri,
      department: newEmployeeDepartment,
      business_id: user.business_id,
    });
    if (!newEmployeeName || !newEmployeeCode) {
      Alert.alert('Missing Fields', 'Please enter both name and code.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('employees')
        .insert({
          name: newEmployeeName,
          code: newEmployeeCode,
          lunchStart: newEmployeeLunchStart,
          lunchEnd: newEmployeeLunchEnd,
          photo_uri: newEmployeePhotoUri,
          department: newEmployeeDepartment,
          business_id: user.business_id,
        })
        .select('*')
        .single();
      console.log('Add employee response:', { data, error });
      if (error || !data) {
        console.error('Add employee error:', error, data);
        Alert.alert('Error', error?.message || 'Failed to add employee.');
        return;
      }
      // Refetch employees from Supabase to ensure UI is up to date
      try {
        const { data: allEmployees, error: fetchError } = await supabase
          .from('employees')
          .select('*')
          .eq('business_id', user.business_id);
        console.log('Refetch employees response:', { allEmployees, fetchError });
        if (!fetchError && allEmployees) setEmployees(allEmployees);
      } catch (fetchErr) {
        console.error('Refetch employees error:', fetchErr);
      }
      setNewEmployeeName('');
      setNewEmployeeCode('');
      setNewEmployeeLunchStart('12:00');
      setNewEmployeeLunchEnd('12:30');
      setNewEmployeePhotoUri(undefined);
      setNewEmployeeDepartment('');
    } catch (err) {
      console.error('handleAddEmployee exception:', err);
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
      lunchStart: newEmployeeLunchStart,
      lunchEnd: newEmployeeLunchEnd,
      photo_uri: newEmployeePhotoUri,
      department: newEmployeeDepartment,
    });
    try {
      const { data, error } = await supabase
        .from('employees')
        .update({
          name: newEmployeeName,
          code: newEmployeeCode,
          lunchStart: newEmployeeLunchStart,
          lunchEnd: newEmployeeLunchEnd,
          photo_uri: newEmployeePhotoUri,
          department: newEmployeeDepartment,
        })
        .eq('id', editEmployee.id)
        .select('*')
        .single();
      console.log('Save employee response:', { data, error });
      if (!error && data) setEmployees(employees.map(e => e.id === editEmployee.id ? data : e));
      setEditEmployee(null);
      setNewEmployeeName('');
      setNewEmployeeCode('');
      setNewEmployeeLunchStart('12:00');
      setNewEmployeeLunchEnd('12:30');
      setNewEmployeePhotoUri(undefined);
      setNewEmployeeDepartment('');
    } catch (err) {
      console.error('handleSaveEmployee exception:', err);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    console.log('handleDeleteEmployee called for id:', id);
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      console.log('Delete employee response:', { error });
      if (!error) setEmployees(employees.filter(e => e.id !== id));
    } catch (err) {
      console.error('handleDeleteEmployee exception:', err);
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
    console.log('User:', user);
    console.log('Payload:', {
      name: newDepartment,
      business_id: user.business_id,
    });
    if (!newDepartment) {
      Alert.alert('Missing Field', 'Please enter a department name.');
      return;
    }
    if (departments.includes(newDepartment)) {
      Alert.alert('Duplicate', 'This department already exists.');
      return;
    }
    try {
      const { error } = await supabase
        .from('departments')
        .insert({ name: newDepartment, business_id: user.business_id });
      console.log('Add department response:', { error });
      if (error) {
        Alert.alert('Error', error.message || 'Failed to add department.');
        return;
      }
      setDepartments([...departments, newDepartment]);
      setNewDepartment('');
      setShowAddDeptModal(false);
    } catch (err) {
      console.error('handleAddDepartment exception:', err);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 8 }}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 32 }}>
        {employees.map(emp => (
          <AdminRow
            key={emp.id}
            icon={emp.photoUri ? undefined : 'user'}
            title={emp.name}
            subtitle={emp.department || 'No Dept'}
            actions={
              <TouchableOpacity onPress={() => handleDeleteEmployee(emp.id)} style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 6 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            }
            style={{ backgroundColor: darkMode ? '#23263a' : '#fff' }}
          >
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>{`Lunch: ${emp.lunchStart} - ${emp.lunchEnd}`}</Text>
          </AdminRow>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, marginBottom: 16 }}>
        <TouchableOpacity style={[adminStyles.addBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowAddEmployeeModal(true)}>
          <Text style={adminStyles.addBtnText}>Add New Employee</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[adminStyles.addBtn, { flex: 1, backgroundColor: '#388e3c' }]} onPress={() => setShowAddDeptModal(true)}>
          <Text style={[adminStyles.addBtnText, { color: '#fff' }]}>Add Department</Text>
        </TouchableOpacity>
      </View>

      {/* Add Employee Modal */}
      <AdminModal visible={showAddEmployeeModal} onClose={() => setShowAddEmployeeModal(false)} title="Add New Employee">
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
        <TouchableOpacity style={adminStyles.addBtn} onPress={() => { handleAddEmployee(); setShowAddEmployeeModal(false); }}>
          <Text style={adminStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </AdminModal>

      {/* Add Department Modal */}
      <AdminModal visible={showAddDeptModal} onClose={() => setShowAddDeptModal(false)} title="Add Department">
        <TextInput style={adminStyles.inputText} placeholder="Department Name" value={newDepartment} onChangeText={setNewDepartment} />
        <TouchableOpacity style={adminStyles.addBtn} onPress={handleAddDepartment}>
          <Text style={adminStyles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </AdminModal>

      {/* Edit Employee Modal */}
      <AdminModal visible={!!editEmployee} onClose={() => setEditEmployee(null)} title="Edit Employee">
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
      </AdminModal>
    </View>
  );
};

export default EmployeesTab; 