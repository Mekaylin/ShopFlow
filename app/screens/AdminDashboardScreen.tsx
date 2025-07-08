import { FontAwesome5 } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import PerformanceManagement from '../../components/PerformanceManagement';
import TaskRatingModal from '../../components/TaskRatingModal';
import { supabase } from '../../lib/supabase';

// Types
interface Task {
  id: string;
  name: string;
  start: string;
  deadline: string;
  completed: boolean;
  assignedTo: string;
  completedAt?: string;
  materialsUsed?: { materialId: string; materialTypeId?: string; quantity: number }[];
}

interface Employee {
  id: string;
  name: string;
  code: string;
  lunchStart: string;
  lunchEnd: string;
  photoUri?: string;
  department?: string;
}

// Add Material type
interface MaterialType {
  id: string;
  label: string;
}
interface Material {
  id: string;
  name: string;
  unit: string;
  types?: MaterialType[];
}

// Demo materials (editable)
const initialMaterials: Material[] = [
  { id: 'm1', name: 'Paint', unit: 'L' },
  { id: 'm2', name: 'Glass', unit: 'pcs' },
  { id: 'm3', name: 'Oil', unit: 'L' },
];

// Helper: parse time string (HH:MM) to Date (today)
function parseTimeToDate(time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function minutesLate(deadline: string): number {
  const now = new Date();
  const deadlineDate = parseTimeToDate(deadline);
  return Math.floor((now.getTime() - deadlineDate.getTime()) / 60000);
}

function AdminDashboardScreen({ onLogout, user }: { onLogout: () => void, user: any }) {
  // --- IMPORTS (assume at top, not shown in snippet) ---
  // import React, { useState, useEffect } from 'react';
  // import { View, Text, TouchableOpacity, Modal, TextInput, ScrollView, FlatList, Image, Alert, Platform, SafeAreaView } from 'react-native';
  // import * as LocalAuthentication from 'expo-local-authentication';
  // import * as ImagePicker from 'expo-image-picker';
  // import * as FileSystem from 'expo-file-system';
  // import * as Sharing from 'expo-sharing';
  // import DateTimePicker from '@react-native-community/datetimepicker';
  // import { FontAwesome5 } from '@expo/vector-icons';
  // import styles from '../styles';
  // import { Employee, Task, Material, MaterialType, initialEmployees, initialTasks, initialMaterials, minutesLate } from '../data';

  // Fingerprint auth state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoggedIn, setBiometricLoggedIn] = useState(false);

  // Check for biometric support on mount
  useEffect(() => {
    (async () => {
      // Removed LocalAuthentication usage (biometric support check) as not needed globally
    })();
  }, []);

  // Biometric login handler
  const handleBiometricLogin = async () => {
    // Removed LocalAuthentication usage (biometric login handler) as not needed globally
  };

  // Biometric logout handler
  const handleBiometricLogout = () => {
    setBiometricLoggedIn(false);
    Alert.alert('Logged Out', 'You have logged out.');
    onLogout();
  };
  // Dark mode state
  const [darkMode, setDarkMode] = useState(false);
  // Settings page state
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [tab, setTab] = useState<'home' | 'employees' | 'tasks' | 'materials' | 'clock' | 'performance'>('home');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  // Notification settings
  const [lateThreshold, setLateThreshold] = useState(10); // minutes
  const [lateTaskNotifiedIds, setLateTaskNotifiedIds] = useState<string[]>([]);

  // Employee state
  const [departments, setDepartments] = useState<string[]>(['Body Shop', 'Paint', 'Detailing']);
  const [newDepartment, setNewDepartment] = useState('');
  // Late task notification effect
  useEffect(() => {
    if (tab !== 'tasks') return;
    const lateTasks = tasks.filter(
      t => !t.completed && minutesLate(t.deadline) >= lateThreshold
    );
    lateTasks.forEach(t => {
      if (!lateTaskNotifiedIds.includes(t.id)) {
        Alert.alert('Task Late', `Task "${t.name}" assigned to ${t.assignedTo} is late by ${minutesLate(t.deadline)} minutes!`);
        setLateTaskNotifiedIds(ids => [...ids, t.id]);
      }
    });
    // Reset notified list if tasks are completed or no longer late
    setLateTaskNotifiedIds(ids => ids.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && !task.completed && minutesLate(task.deadline) >= lateThreshold;
    }));
  }, [tasks, tab, lateThreshold]);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeCode, setNewEmployeeCode] = useState('');
  const [newEmployeeLunchStart, setNewEmployeeLunchStart] = useState('12:00');
  const [newEmployeeLunchEnd, setNewEmployeeLunchEnd] = useState('12:30');
  const [newEmployeePhotoUri, setNewEmployeePhotoUri] = useState<string | undefined>(undefined);
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState('');
  // Task state
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStart, setNewTaskStart] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const [selectedTaskEmployee, setSelectedTaskEmployee] = useState<Employee | null>(null);
  const [selectedMaterialForTask, setSelectedMaterialForTask] = useState<string>('');
  const [selectedMaterialTypeForTask, setSelectedMaterialTypeForTask] = useState<string>('');
  const [materialQuantityForTask, setMaterialQuantityForTask] = useState('');
  const [materialsForNewTask, setMaterialsForNewTask] = useState<{ materialId: string; materialTypeId?: string; quantity: number }[]>([]);
  // Material state
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('');
  const [materialTypes, setMaterialTypes] = useState<{ [materialId: string]: MaterialType[] }>({});
  const [newMaterialTypeLabel, setNewMaterialTypeLabel] = useState('');
  const [selectedMaterialIdForType, setSelectedMaterialIdForType] = useState<string | null>(null);
  // Modal for viewing employee's tasks
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  // Working hours/lunch settings
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('12:30');
  const saveTimes = () => {
    if (!/^\d{2}:\d{2}$/.test(workStart) || !/^\d{2}:\d{2}$/.test(workEnd) || !/^\d{2}:\d{2}$/.test(lunchStart) || !/^\d{2}:\d{2}$/.test(lunchEnd)) {
      Alert.alert('Invalid time', 'Please use HH:MM format for all times.');
      return;
    }
    Alert.alert('Saved', 'Working hours and lunch times updated.');
  };

  // Fetch employees from Supabase on mount
  useEffect(() => {
    async function fetchEmployees() {
      if (!user?.business_id) return;
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('business_id', user.business_id);
      if (!error && data) setEmployees(data);
    }
    fetchEmployees();
  }, [user?.business_id]);

  // Add employee to Supabase
  const handleAddEmployee = async () => {
    if (!newEmployeeName || !newEmployeeCode) return;
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
    if (!error && data) setEmployees([...employees, data]);
    setNewEmployeeName('');
    setNewEmployeeCode('');
    setNewEmployeeLunchStart('12:00');
    setNewEmployeeLunchEnd('12:30');
    setNewEmployeePhotoUri(undefined);
    setNewEmployeeDepartment('');
  };

  // Edit employee in Supabase
  const handleSaveEmployee = async () => {
    if (!editEmployee) return;
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
    if (!error && data) setEmployees(employees.map(e => e.id === editEmployee.id ? data : e));
    setEditEmployee(null);
    setNewEmployeeName('');
    setNewEmployeeCode('');
    setNewEmployeeLunchStart('12:00');
    setNewEmployeeLunchEnd('12:30');
    setNewEmployeePhotoUri(undefined);
    setNewEmployeeDepartment('');
  };

  // Delete employee from Supabase
  const handleDeleteEmployee = async (id: string) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', id);
    if (!error) setEmployees(employees.filter(e => e.id !== id));
  };

  // Pick employee photo
  const pickEmployeePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission denied', 'Camera roll permissions are required.');
      return;
    }
    // Use new MediaType API to resolve deprecation warning
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

  // Task CRUD
  useEffect(() => {
    async function fetchTasks() {
      if (!user?.business_id) return;
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('business_id', user.business_id);
      if (!error && data) setTasks(data);
    }
    fetchTasks();
  }, [user?.business_id]);

  const handleAddTask = async () => {
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
        materialsUsed: [],
      })
      .select('*')
      .single();
    if (!error && data) setTasks([...tasks, data]);
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskDeadline('');
    setSelectedTaskEmployee(null);
  };

  const handleEditTask = async () => {
    if (!editTask) return;
    const { data, error } = await supabase
      .from('tasks')
      .update({
        name: newTaskName,
        assignedTo: newEmployeeCode, // assuming newEmployeeCode is employee id
        start: newTaskStart,
        deadline: newTaskDeadline,
      })
      .eq('id', editTask.id)
      .select('*')
      .single();
    if (!error && data) setTasks(tasks.map(t => t.id === editTask.id ? data : t));
    setEditTask(null);
    setNewTaskName('');
    setNewTaskStart('');
    setNewTaskDeadline('');
    setNewEmployeeCode('');
  };

  const handleDeleteTask = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id);
    if (!error) setTasks(tasks.filter(t => t.id !== id));
  };

  // Material CRUD
  useEffect(() => {
    async function fetchMaterials() {
      if (!user?.business_id) return;
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('business_id', user.business_id);
      if (!error && data) setMaterials(data);
    }
    fetchMaterials();
  }, [user?.business_id]);

  const handleAddMaterial = async () => {
    if (!newMaterialName || !newMaterialUnit) return;
    const { data, error } = await supabase
      .from('materials')
      .insert({
        name: newMaterialName,
        unit: newMaterialUnit,
        business_id: user.business_id,
      })
      .select('*')
      .single();
    if (!error && data) setMaterials([...materials, data]);
    setNewMaterialName('');
    setNewMaterialUnit('');
  };

  const handleEditMaterial = async () => {
    if (!editMaterial) return;
    const { data, error } = await supabase
      .from('materials')
      .update({
        name: newMaterialName,
        unit: newMaterialUnit,
      })
      .eq('id', editMaterial.id)
      .select('*')
      .single();
    if (!error && data) setMaterials(materials.map(m => m.id === editMaterial.id ? data : m));
    setEditMaterial(null);
    setNewMaterialName('');
    setNewMaterialUnit('');
  };

  const handleDeleteMaterial = async (id: string) => {
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id);
    if (!error) setMaterials(materials.filter(m => m.id !== id));
  };

  // Add Material Type logic
  const handleAddMaterialType = (materialId: string) => {
    if (!newMaterialTypeLabel) return;
    const newType = { id: Date.now().toString(), label: newMaterialTypeLabel };
    setMaterialTypes(prev => ({
      ...prev,
      [materialId]: [...(prev[materialId] || []), newType]
    }));
    setNewMaterialTypeLabel('');
  };

  // Performance Management Functions
  useEffect(() => {
    async function fetchPerformanceSettings() {
      if (!user?.business_id) return;
      const { data, error } = await supabase
        .from('performance_settings')
        .select('*')
        .eq('business_id', user.business_id)
        .single();
      
      if (!error && data) {
        setPerformanceSettings({
          ratingSystemEnabled: data.rating_system_enabled,
          autoRateCompletedTasks: data.auto_rate_completed_tasks,
          defaultRating: data.default_rating
        });
      }
    }
    fetchPerformanceSettings();
  }, [user?.business_id]);

  const updatePerformanceSettings = async (newSettings: any) => {
    if (!user?.business_id) return;
    
    const { error } = await supabase
      .from('performance_settings')
      .upsert({
        business_id: user.business_id,
        rating_system_enabled: newSettings.ratingSystemEnabled,
        auto_rate_completed_tasks: newSettings.autoRateCompletedTasks,
        default_rating: newSettings.defaultRating,
        updated_at: new Date().toISOString()
      });

    if (!error) {
      setPerformanceSettings(newSettings);
      Alert.alert('Success', 'Performance settings updated successfully!');
    } else {
      Alert.alert('Error', 'Failed to update performance settings.');
    }
  };

  const handleRateTask = (task: any) => {
    // Find the employee for this task
    const employee = employees.find(e => e.name === task.assignedTo);
    if (!employee) {
      Alert.alert('Error', 'Employee not found for this task.');
      return;
    }

    setSelectedTaskForRating(task);
    setSelectedEmployeeForRating(employee);
    setShowTaskRatingModal(true);
  };

  const handleTaskRatingSubmitted = () => {
    // Refresh tasks to show updated rating status
    // This will be handled by the TaskRatingModal component
    setShowTaskRatingModal(false);
    setSelectedTaskForRating(null);
    setSelectedEmployeeForRating(null);
  };

  const calculatePerformanceMetrics = async () => {
    if (!user?.business_id) return;
    
    try {
      // Call the database function to calculate metrics for all employees
      const { data: employeeList } = await supabase
        .from('employees')
        .select('id')
        .eq('business_id', user.business_id);

      if (employeeList) {
        for (const employee of employeeList) {
          // Calculate for day, week, and month
          const periods = ['day', 'week', 'month'] as const;
          for (const period of periods) {
            const now = new Date();
            let startDate: Date;
            let endDate: Date = now;

            switch (period) {
              case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
              case 'week':
                const dayOfWeek = now.getDay();
                const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysToSubtract);
                break;
              case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            }

            await supabase.rpc('calculate_performance_metrics', {
              p_employee_id: employee.id,
              p_business_id: user.business_id,
              p_period_type: period,
              p_start_date: startDate.toISOString().split('T')[0],
              p_end_date: endDate.toISOString().split('T')[0]
            });
          }
        }
      }
    } catch (error) {
      console.error('Error calculating performance metrics:', error);
    }
  };

  // View employee's tasks
  const openEmployeeTasks = (employee: Employee) => {
    setSelectedEmployee(employee);
  };
  const closeEmployeeTasks = () => {
    setSelectedEmployee(null);
  };

  // Mark task complete from employee modal
  const handleCompleteTask = (taskId: string) => {
    setTasks(tasks.map(t =>
      t.id === taskId
        ? { ...t, completed: true, completedAt: new Date().toISOString() }
        : t
    ));
  };

  // Tab bar UI
  const renderTabBar = () => (
    <View style={{ flexDirection: 'row', marginBottom: 16, marginTop: 8 }}>
      {[
        { name: 'home', icon: 'home', label: 'Home' },
        { name: 'employees', icon: 'users', label: 'Employees' },
        { name: 'tasks', icon: 'tasks', label: 'Tasks' },
        { name: 'materials', icon: 'boxes', label: 'Materials' },
        { name: 'clock', icon: 'clock', label: 'Clock Events' },
        { name: 'performance', icon: 'chart-line', label: 'Performance' },
      ].map(tabObj => (
        <TouchableOpacity
          key={tabObj.name}
          style={{
            flex: 1,
            paddingVertical: 8,
            backgroundColor: tab === tabObj.name ? (darkMode ? '#222b45' : '#1976d2') : (darkMode ? '#333950' : '#e3f2fd'),
            borderRadius: 8,
            marginHorizontal: 2,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          }}
          onPress={() => setTab(tabObj.name as any)}
        >
          <FontAwesome5
            name={tabObj.icon}
            size={16}
            color={tab === tabObj.name ? '#fff' : (darkMode ? '#b3c0e0' : '#1976d2')}
            style={{ marginBottom: 2 }}
          />
          <Text style={{ color: tab === tabObj.name ? '#fff' : (darkMode ? '#b3c0e0' : '#1976d2'), fontWeight: 'bold', textAlign: 'center', fontSize: 11 }}>
            {tabObj.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
  // Helper: get date string (YYYY-MM-DD)
  function getDateString(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  // Helper: filter tasks by date (today, week, month)
  function filterTasksByDate(range: 'day' | 'week' | 'month', refDate: Date) {
    if (!tasks.length) return [];
    const today = new Date(refDate);
    return tasks.filter(task => {
      if (!task.start) return false;
      // Assume task.start is in HH:MM and task has a createdAt or fallback to today
      // For demo, use completedAt or fallback to today
      let date = task.completedAt ? new Date(task.completedAt) : today;
      if (range === 'day') {
        return getDateString(date) === getDateString(today);
      } else if (range === 'week') {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return date >= weekStart && date <= weekEnd;
      } else if (range === 'month') {
        return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
      }
      return false;
    });
  }

  // Helper: filter materials used by date
  function getMaterialsUsed(range: 'day' | 'week' | 'month', refDate: Date) {
    const filteredTasks = filterTasksByDate(range, refDate);
    const materialMap: { [id: string]: number } = {};
    filteredTasks.forEach(task => {
      if (Array.isArray(task.materialsUsed)) {
        task.materialsUsed.forEach(mu => {
          if (!materialMap[mu.materialId]) materialMap[mu.materialId] = 0;
          materialMap[mu.materialId] += mu.quantity;
        });
      }
    });
    return Object.entries(materialMap).map(([id, qty]) => {
      const mat = materials.find(m => m.id === id);
      return mat ? `${mat.name}: ${qty} ${mat.unit}` : `Material ${id}: ${qty}`;
    });
  }

  // Helper: get late employees (arrived after workStart)
  function getLateEmployees(refDate: Date) {
    // For demo, randomly pick employees as late
    // In real app, would compare clock-in time to workStart
    if (!employees.length) return [];
    const late = employees.filter((e, i) => i % 3 === 0); // 1/3 late for demo
    return late.map(e => e.name);
  }

  // Home tab state
  const [summaryRange, setSummaryRange] = useState<'day' | 'week' | 'month'>('day');
  const [summaryDate, setSummaryDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportType, setExportType] = useState<'tasks' | 'materials' | 'employees' | 'attendance' | 'all'>('all');
  const [exportStartDate, setExportStartDate] = useState<Date>(new Date());
  const [exportEndDate, setExportEndDate] = useState<Date>(new Date());
  const [showExportStartPicker, setShowExportStartPicker] = useState(false);
  const [showExportEndPicker, setShowExportEndPicker] = useState(false);

  // Home tab UI
  // State for expanded modals for week/month view
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);
  const [showAllLateEmpsModal, setShowAllLateEmpsModal] = useState(false);
  const [showAllMaterialsModal, setShowAllMaterialsModal] = useState(false);

  const filteredTasks = filterTasksByDate(summaryRange, summaryDate);
  const materialsUsed = getMaterialsUsed(summaryRange, summaryDate);

  // Helper to limit lines per card
  const limitLines = <T,>(arr: T[], max: number) => arr.slice(0, max);

  // For week/month, show modal with all data when card is pressed
  const canExpand = summaryRange === 'week' || summaryRange === 'month';

  // Export logic
  const handleExport = async () => {
    let data = '';
    let filename = '';
    const start = exportStartDate;
    const end = exportEndDate;
    function inRange(date: Date) {
      return date >= start && date <= end;
    }
    if (exportType === 'tasks' || exportType === 'all') {
      const filtered = tasks.filter(t => {
        const d = t.completedAt ? new Date(t.completedAt) : new Date();
        return inRange(d);
      });
      data += 'Task Name,Assigned To,Start,Deadline,Completed,Completed At\n';
      filtered.forEach(t => {
        data += `${t.name},${t.assignedTo || t.assignedTo},${t.start},${t.deadline},${t.completed ? 'Yes' : 'No'},${t.completedAt || ''}\n`;
      });
      filename = 'tasks.csv';
    }
    if (exportType === 'materials' || exportType === 'all') {
      data += '\nMaterial Name,Unit\n';
      materials.forEach(m => {
        data += `${m.name},${m.unit}\n`;
      });
      filename = 'materials.csv';
    }
    if (exportType === 'employees' || exportType === 'all') {
      data += '\nEmployee Name,Code,Lunch Start,Lunch End\n';
      employees.forEach(e => {
        data += `${e.name},${e.code},${e.lunchStart},${e.lunchEnd}\n`;
      });
      filename = 'employees.csv';
    }
    if (exportType === 'attendance' || exportType === 'all') {
      data += '\nEmployee Name,Clock In,Clock Out\n';
      employees.forEach(emp => {
        const events = (clockEvents || []).filter(ev => ev.employee_id === emp.id);
        events.forEach(ev => {
          const clockIn = ev.clock_in ? new Date(ev.clock_in).toLocaleString() : '';
          const clockOut = ev.clock_out ? new Date(ev.clock_out).toLocaleString() : '';
          data += `${emp.name},${clockIn},${clockOut}\n`;
        });
      });
      filename = 'attendance.csv';
    }
    if (exportType === 'all') filename = 'all_data.csv';
    const fileUri = FileSystem.cacheDirectory + filename;
    await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
    setExportModalVisible(false);
  };
  // Export Modal
  const renderExportModal = () => (
    <Modal visible={exportModalVisible} animationType="slide" transparent onRequestClose={() => setExportModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1976d2' }}>Export Data</Text>
          <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>What do you want to export?</Text>
          {['tasks', 'materials', 'employees', 'attendance', 'all'].map(type => (
            <TouchableOpacity key={type} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} onPress={() => setExportType(type as any)}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#1976d2', marginRight: 8, backgroundColor: exportType === type ? '#1976d2' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {exportType === type && <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#fff' }} />}
              </View>
              <Text style={{ color: '#1976d2', fontWeight: exportType === type ? 'bold' : 'normal' }}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
            </TouchableOpacity>
          ))}
          <Text style={{ fontWeight: 'bold', marginTop: 12, marginBottom: 8 }}>Date Range</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <TouchableOpacity onPress={() => setShowExportStartPicker(true)} style={{ borderBottomWidth: 1, borderBottomColor: '#1976d2', marginRight: 12 }}>
              <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{getDateString(exportStartDate)}</Text>
            </TouchableOpacity>
            <Text style={{ marginHorizontal: 8 }}>to</Text>
            <TouchableOpacity onPress={() => setShowExportEndPicker(true)} style={{ borderBottomWidth: 1, borderBottomColor: '#1976d2', marginLeft: 12 }}>
              <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{getDateString(exportEndDate)}</Text>
            </TouchableOpacity>
          </View>
          {showExportStartPicker && (
            <DateTimePicker
              value={exportStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, date?: Date) => {
                setShowExportStartPicker(false);
                if (date) setExportStartDate(date);
              }}
            />
          )}
          {showExportEndPicker && (
            <DateTimePicker
              value={exportEndDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event: any, date?: Date) => {
                setShowExportEndPicker(false);
                if (date) setExportEndDate(date);
              }}
            />
          )}
          <TouchableOpacity style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 12, marginTop: 16, alignItems: 'center' }} onPress={handleExport}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Export</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ marginTop: 12, alignItems: 'center' }} onPress={() => setExportModalVisible(false)}>
            <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Employees screen
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showAddDeptModal, setShowAddDeptModal] = useState(false);
  const renderEmployees = () => (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 8 }}>
      <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingBottom: 32 }}>
        {employees.map(emp => (
          <View key={emp.id} style={{ backgroundColor: darkMode ? '#23263a' : '#fff', borderRadius: 18, margin: 8, padding: 18, width: 180, alignItems: 'center', shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' }}>
              {emp.photoUri ? (
                <Image source={{ uri: emp.photoUri }} style={{ width: 64, height: 64, borderRadius: 32 }} />
              ) : (
                <FontAwesome5 name="user" size={32} color="#b3c0e0" />
              )}
            </View>
            <Text style={{ fontWeight: 'bold', fontSize: 18, color: darkMode ? '#b3c0e0' : '#1976d2', marginBottom: 2 }}>{emp.name}</Text>
            <Text style={{ color: '#888', fontSize: 14, marginBottom: 2 }}>{emp.department || 'No Dept'}</Text>
            <Text style={{ color: '#888', fontSize: 13, marginBottom: 2 }}>{`Lunch: ${emp.lunchStart} - ${emp.lunchEnd}`}</Text>
            <View style={{ flexDirection: 'row', marginTop: 8 }}>
              <TouchableOpacity onPress={() => handleDeleteEmployee(emp.id)} style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 6 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => openEmployeeTasks(emp)} style={{ marginTop: 10, backgroundColor: '#ff9800', borderRadius: 8, padding: 6, width: '100%' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>View Tasks</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16, marginBottom: 16 }}>
        <TouchableOpacity style={[styles.addBtn, { flex: 1, marginRight: 8 }]} onPress={() => setShowAddEmployeeModal(true)}>
          <Text style={styles.addBtnText}>Add New Employee</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.addBtn, { flex: 1, backgroundColor: '#388e3c' }]} onPress={() => setShowAddDeptModal(true)}>
          <Text style={[styles.addBtnText, { color: '#fff' }]}>Add Department</Text>
        </TouchableOpacity>
      </View>
      {/* Add Employee Modal */}
      <Modal visible={showAddEmployeeModal} transparent animationType="slide" onRequestClose={() => setShowAddEmployeeModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>Add New Employee</Text>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Name" value={newEmployeeName} onChangeText={setNewEmployeeName} />
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Code" value={newEmployeeCode} onChangeText={setNewEmployeeCode} />
                {biometricEnabled && (
                  <TouchableOpacity
                    style={{ marginLeft: 8, backgroundColor: biometricLoggedIn ? '#388e3c' : '#1976d2', borderRadius: 8, padding: 8, alignItems: 'center', justifyContent: 'center' }}
                    onPress={async () => {
                      // If fingerprint login is needed here, import LocalAuthentication locally and use as needed
                    }}
                    accessibilityLabel="Fingerprint login"
                  >
                    <FontAwesome5 name="fingerprint" size={20} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 2 }}>{biometricLoggedIn ? 'Clocked In' : 'Clock In'}</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Lunch Start" value={newEmployeeLunchStart} onChangeText={setNewEmployeeLunchStart} />
              <TextInput style={styles.input} placeholder="Lunch End" value={newEmployeeLunchEnd} onChangeText={setNewEmployeeLunchEnd} />
            </View>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Department" value={newEmployeeDepartment} onChangeText={setNewEmployeeDepartment} />
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
            <TouchableOpacity style={styles.addBtn} onPress={() => { handleAddEmployee(); setShowAddEmployeeModal(false); }}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddEmployeeModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Add Department Modal */}
      <Modal visible={showAddDeptModal} transparent animationType="slide" onRequestClose={() => setShowAddDeptModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>Add Department</Text>
            <TextInput style={styles.input} placeholder="Department Name" value={newDepartment} onChangeText={setNewDepartment} />
            <TouchableOpacity style={styles.addBtn} onPress={() => {
              if (newDepartment && !departments.includes(newDepartment)) {
                setDepartments([...departments, newDepartment]);
                setNewDepartment('');
                setShowAddDeptModal(false);
              }
            }}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowAddDeptModal(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Edit Employee Modal */}
      <Modal visible={!!editEmployee} transparent animationType="slide" onRequestClose={() => setEditEmployee(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>Edit Employee</Text>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Name" value={newEmployeeName} onChangeText={setNewEmployeeName} />
              <TextInput style={styles.input} placeholder="Code" value={newEmployeeCode} onChangeText={setNewEmployeeCode} />
            </View>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Lunch Start" value={newEmployeeLunchStart} onChangeText={setNewEmployeeLunchStart} />
              <TextInput style={styles.input} placeholder="Lunch End" value={newEmployeeLunchEnd} onChangeText={setNewEmployeeLunchEnd} />
            </View>
            <View style={styles.addEmployeeInputsRow}>
              <TextInput style={styles.input} placeholder="Department" value={newEmployeeDepartment} onChangeText={setNewEmployeeDepartment} />
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
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEmployee}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setEditEmployee(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  // Tasks screen - show employees, tap to manage their tasks
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
        materialsUsed: [],
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

  const handleDeleteTaskForEmployee = async (taskId: string) => {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    if (!error) setTasks(tasks.filter(t => t.id !== taskId));
  };

  // --- Add material to new task ---
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

  // Redesigned Tasks page: FlatList-based, no nested ScrollView/FlatList
  const renderTasks = () => {
    // Header: title, cog, and "View Tasks by Employee" section
    const ListHeaderComponent = (
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={styles.sectionTitle}>Tasks</Text>
          <TouchableOpacity onPress={() => {
            setSelectedTaskEmployee(null);
            setSettingsVisible(true);
          }} style={{ padding: 6 }}>
            <FontAwesome5 name="cog" size={24} color="#1976d2" />
          </TouchableOpacity>
        </View>
                {/* Removed 'View Tasks by Employee' heading and box */}
        {!selectedTaskEmployee ? null : (
          <>
            <Text style={[styles.addEmployeeTitle, { marginBottom: 8 }]}>Tasks for {selectedTaskEmployee.name}</Text>
            {tasks.filter(t => t.assignedTo === selectedTaskEmployee.name).length === 0 ? (
              <Text style={{ color: '#888', marginVertical: 8 }}>No tasks assigned.</Text>
            ) : null}
          </>
        )}
      </>
    );

    // Footer: Add Task card (if employee selected)
    const ListFooterComponent = selectedTaskEmployee ? (
      <View style={[styles.addEmployeeCard, { width: '100%', alignItems: 'stretch', marginTop: 0 }]}> 
        <Text style={styles.addEmployeeTitle}>Add Task for {selectedTaskEmployee.name}</Text>
        <TextInput style={[styles.inputLarge, { width: '100%', marginBottom: 10 }]} placeholder="Task Title" value={newTaskName} onChangeText={setNewTaskName} />
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <View style={[styles.dropdownContainer, { flex: 1, marginRight: 6 }]}> {/* Start Time */}
            <Text style={styles.dropdownLabel}>Start</Text>
            <TouchableOpacity
              style={[styles.dropdown, { width: '100%' }]}
              onPress={() => {
                const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
                const idx = times.indexOf(newTaskStart);
                setNewTaskStart(times[(idx + 1) % times.length]);
              }}
            >
              <Text style={styles.dropdownText}>{newTaskStart || 'Select'}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.dropdownContainer, { flex: 1, marginLeft: 6 }]}> {/* Deadline */}
            <Text style={styles.dropdownLabel}>Deadline</Text>
            <TouchableOpacity
              style={[styles.dropdown, { width: '100%' }]}
              onPress={() => {
                const times = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
                const idx = times.indexOf(newTaskDeadline);
                setNewTaskDeadline(times[(idx + 1) % times.length]);
              }}
            >
              <Text style={styles.dropdownText}>{newTaskDeadline || 'Select'}</Text>
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
                      <Text style={{ color: selectedMaterialTypeForTask === type.id ? '#fff' : '#1976d2' }}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ marginRight: 6 }}>Quantity:</Text>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Quantity"
              value={materialQuantityForTask}
              onChangeText={setMaterialQuantityForTask}
              keyboardType="numeric"
            />
            <TouchableOpacity style={[styles.addBtn, { marginLeft: 8 }]} onPress={handleAddMaterialToTask}>
              <Text style={styles.addBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
          {materialsForNewTask.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={{ fontSize: 13, color: '#888' }}>Added:</Text>
              {materialsForNewTask.map((mu, idx) => {
                const mat = materials.find(m => m.id === mu.materialId);
                const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
                return (
                  <Text key={idx} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.label})` : ''}: {mu.quantity} {mat?.unit}</Text>
                );
              })}
            </View>
          )}
        </View>
        <TouchableOpacity style={[styles.addBtn, { marginTop: 8, alignSelf: 'center', minWidth: 120 }]} onPress={handleAddTaskForEmployee}>
          <Text style={styles.addBtnText}>Add Task</Text>
        </TouchableOpacity>
      </View>
    ) : null;

    // Data: always use (Employee | Task)[] and type guard in renderItem
    const data: (Employee | Task)[] = !selectedTaskEmployee
      ? employees
      : tasks.filter(t => t.assignedTo === selectedTaskEmployee.name);

    const renderItem = ({ item }: { item: Employee | Task }) => {
      if ('assignedTo' in item) {
        // Task
        const isLate = !item.completed && minutesLate(item.deadline) > lateThreshold;
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
            {isLate && !item.completed && (
              <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 13, marginBottom: 2 }}>Late by {minutesLate(item.deadline)} min</Text>
            )}
            {/* Show materials used with type dropdown if applicable */}
            {Array.isArray(item.materialsUsed) && item.materialsUsed.length > 0 && (
              <View style={{ marginTop: 4, marginBottom: 4 }}>
                <Text style={{ fontSize: 13, color: '#1976d2', fontWeight: 'bold' }}>Materials Used:</Text>
                {item.materialsUsed.map((mu, idx2) => {
                  const mat = materials.find(m => m.id === mu.materialId);
                  const type = mu.materialTypeId && materialTypes[mu.materialId]?.find(t => t.id === mu.materialTypeId);
                  return (
                    <Text key={idx2} style={{ fontSize: 14 }}>{mat?.name}{type ? ` (${type.label})` : ''}: {mu.quantity} {mat?.unit}</Text>
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
                  onPress={() => handleRateTask(item)}
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
              <TouchableOpacity style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 8 }} onPress={() => handleDeleteTaskForEmployee(item.id)}>
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
          }} onPress={() => setSelectedTaskEmployee(item)}>
            <View style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, backgroundColor: '#e3f2fd', alignItems: 'center', justifyContent: 'center' }}>
              {item.photoUri ? (
                <Image source={{ uri: item.photoUri }} style={{ width: 36, height: 36, borderRadius: 18 }} />
              ) : (
                <FontAwesome5 name="user" size={18} color="#b3c0e0" />
              )}
            </View>
            <View>
              <Text style={{ fontWeight: 'bold', color: '#1976d2', fontSize: 15 }}>{item.name}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{item.department || 'No Dept'}</Text>
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
      </SafeAreaView>
    );
  };

  // Materials screen
  const renderMaterials = () => (
    <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 8 }}>
      <Text style={[styles.sectionTitle, { marginBottom: 8 }]}>Materials</Text>
      <FlatList
        data={materials}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{
            backgroundColor: darkMode ? '#23263a' : '#fff',
            borderRadius: 14,
            marginBottom: 10,
            padding: 14,
            shadowColor: '#1976d2',
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold', color: darkMode ? '#b3c0e0' : '#1976d2', fontSize: 16 }}>{item.name} <Text style={{ color: '#888', fontWeight: 'normal' }}>({item.unit})</Text></Text>
              {/* Only show the name, not 'Material Name' */}
              {materialTypes[item.id] && materialTypes[item.id].length > 0 && (
                <View style={{ marginTop: 4, flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 13, color: '#888', marginRight: 4 }}>Types:</Text>
                  {materialTypes[item.id].map(type => (
                    <View key={type.id} style={{ backgroundColor: '#e3f2fd', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4, marginBottom: 2 }}>
                      <Text style={{ fontSize: 13, color: '#1976d2' }}>{type.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={handleEditMaterial} style={{ marginRight: 8 }}>
                <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDeleteMaterial(item.id)} style={{ marginRight: 8 }}>
                <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedMaterialIdForType(item.id)}>
                <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Add Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
      <View style={{ flexDirection: 'row', marginTop: 8, marginBottom: 8 }}>
        <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="Name" value={newMaterialName} onChangeText={setNewMaterialName} />
        <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Unit" value={newMaterialUnit} onChangeText={setNewMaterialUnit} />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddMaterial}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
      </View>
      {editMaterial && (
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
          <TextInput style={[styles.input, { flex: 2, marginRight: 6 }]} placeholder="Name" value={newMaterialName} onChangeText={setNewMaterialName} />
          <TextInput style={[styles.input, { flex: 1, marginRight: 6 }]} placeholder="Unit" value={newMaterialUnit} onChangeText={setNewMaterialUnit} />
          <TouchableOpacity style={styles.saveBtn} onPress={handleAddMaterial}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* Add Material Type Modal */}
      <Modal visible={!!selectedMaterialIdForType} transparent animationType="slide" onRequestClose={() => setSelectedMaterialIdForType(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1976d2', marginBottom: 12 }}>Add Material Type</Text>
            <TextInput style={styles.input} placeholder="Type Label" value={newMaterialTypeLabel} onChangeText={setNewMaterialTypeLabel} />
            <TouchableOpacity style={styles.addBtn} onPress={() => selectedMaterialIdForType && handleAddMaterialType(selectedMaterialIdForType)}><Text style={styles.addBtnText}>Add</Text></TouchableOpacity>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMaterialIdForType(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );

  // Dynamic styles for dark mode
  const themedStyles = {
    container: [styles.container, darkMode && { backgroundColor: '#181a20' }],
    headerRow: [styles.headerRow],
    title: [styles.title, darkMode && { color: '#b3c0e0' }],
    sectionTitle: [styles.sectionTitle, darkMode && { color: '#b3c0e0' }],
    logoutBtn: [styles.logoutBtn, darkMode && { backgroundColor: '#23263a', borderColor: '#b3c0e0' }],
    logoutBtnText: [styles.logoutBtnText, darkMode && { color: '#b3c0e0' }],
    modalOverlay: [styles.modalOverlay],
    modalContent: [styles.modalContent, darkMode && { backgroundColor: '#23263a' }],
    modalTitle: [styles.modalTitle, darkMode && { color: '#b3c0e0' }],
    closeBtn: [styles.closeBtn, darkMode && { backgroundColor: '#333950' }],
    closeBtnText: [styles.closeBtnText, darkMode && { color: '#b3c0e0' }],
    settingsCard: [styles.settingsCard, darkMode && { backgroundColor: '#23263a' }],
    settingsTitle: [styles.settingsTitle, darkMode && { color: '#b3c0e0' }],
    // Fix for notify-if-late textbox being cut off
    notifyLateInput: [styles.input, { minWidth: 60, flex: 0, width: 100, maxWidth: 140, alignSelf: 'flex-start' }],
  };

  // Fetch clock events for all employees in this business
  const [clockEvents, setClockEvents] = useState<any[]>([]);

  // Fetch clock events for all employees in this business
  useEffect(() => {
    async function fetchClockEvents() {
      if (!user?.business_id) return;
      const { data, error } = await supabase
        .from('clock_events')
        .select('*')
        .eq('business_id', user.business_id)
        .order('clock_in', { ascending: false });
      if (!error && data) setClockEvents(data);
    }
    fetchClockEvents();
  }, [user?.business_id]);

  // Helper: group clock events by employee
  const clockEventsByEmployee = employees.reduce((acc, emp) => {
    acc[emp.id] = clockEvents.filter(ev => ev.employee_id === emp.id);
    return acc;
  }, {} as Record<string, any[]>);

  // Helper: get late employees for a given day
  function getLateEmployeesByClockEvents(date: Date) {
    const workStartTime = workStart || '08:00';
    const lateList: string[] = [];
    employees.forEach(emp => {
      const events = clockEventsByEmployee[emp.id] || [];
      // Find first clock_in for this day
      const event = events.find(ev => {
        const d = new Date(ev.clock_in);
        return d.toDateString() === date.toDateString();
      });
      if (event) {
        const clockIn = new Date(event.clock_in);
        const [h, m] = workStartTime.split(':').map(Number);
        const workStartDate = new Date(clockIn);
        workStartDate.setHours(h, m, 0, 0);
        if (clockIn > workStartDate) {
          lateList.push(emp.name);
        }
      }
    });
    return lateList;
  }

  // Performance Management State
  const [performanceSettings, setPerformanceSettings] = useState({
    ratingSystemEnabled: true,
    autoRateCompletedTasks: false,
    defaultRating: 3
  });
  const [showPerformanceManagement, setShowPerformanceManagement] = useState(false);
  const [showTaskRatingModal, setShowTaskRatingModal] = useState(false);
  const [selectedTaskForRating, setSelectedTaskForRating] = useState<any>(null);
  const [selectedEmployeeForRating, setSelectedEmployeeForRating] = useState<any>(null);

  const renderClockEvents = () => {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 16 }}>
            Clock Events
          </Text>
          
          {clockEvents.length === 0 ? (
            <Text style={{ color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
              No clock events recorded yet
            </Text>
          ) : (
            clockEvents.map((event, index) => (
              <View key={event.id || index} style={{
                backgroundColor: '#f8f9fa',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderLeftWidth: 4,
                borderLeftColor: event.type === 'in' ? '#4CAF50' : '#FF9800'
              }}>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {event.employee_name}
                </Text>
                <Text style={{ color: '#666', fontSize: 12 }}>
                  {event.type === 'in' ? 'Clock In' : 'Clock Out'} - {new Date(event.timestamp).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  // Clock events state
  // Duplicate declaration removed below:
  // const [clockEvents, setClockEvents] = useState<any[]>([]);
  
  // UI state variables
  const [showWorkHours, setShowWorkHours] = useState(false);

  // Calculate filtered tasks and materials when summary range or date changes
  useEffect(() => {
    const filtered = filterTasksByDate(summaryRange, summaryDate);
  }, [summaryRange, summaryDate, tasks, materials]);

  return (
    <SafeAreaView style={[...themedStyles.container, { position: 'relative', flex: 1 }]}> {/* Ensure relative positioning for absolute children */}
      <View style={themedStyles.headerRow}>
        <FontAwesome5 name="user" size={32} color={darkMode ? '#b3c0e0' : '#1976d2'} style={{ marginRight: 10 }} />
        <Text style={themedStyles.title}>Admin Dashboard</Text>
        <TouchableOpacity
          style={{ marginLeft: 'auto', padding: 6 }}
          onPress={() => setSettingsVisible(true)}
        >
          <FontAwesome5 name="cog" size={26} color={darkMode ? '#b3c0e0' : '#1976d2'} />
        </TouchableOpacity>
      </View>
      {renderTabBar()}
      <View style={{ flex: 1 }}>
        {/* Home Tab Content */}
        {tab === 'home' && (
          <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 8 }} contentContainerStyle={{ paddingBottom: 100 }}>
            {/* --- Range selector and Export/Filter controls --- */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              {/* Range Selector */}
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {['day', 'week', 'month'].map(range => (
                  <TouchableOpacity
                    key={range}
                    style={{
                      backgroundColor: summaryRange === range ? '#1976d2' : '#e3f2fd',
                      borderRadius: 8,
                      paddingVertical: 6,
                      paddingHorizontal: 14,
                      marginRight: 6,
                    }}
                    onPress={() => setSummaryRange(range as any)}
                  >
                    <Text style={{ color: summaryRange === range ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 15 }}>{range.charAt(0).toUpperCase() + range.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={{ marginLeft: 8, padding: 6, borderRadius: 8, backgroundColor: '#e3f2fd' }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <FontAwesome5 name="calendar" size={18} color="#1976d2" />
                  <Text style={{ color: '#1976d2', fontSize: 13 }}>{getDateString(summaryDate)}</Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={summaryDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event: any, date?: Date) => {
                      setShowDatePicker(false);
                      if (date) setSummaryDate(date);
                    }}
                  />
                )}
              </View>
              {/* (Export button moved to bottom) */}
            </View>
            {/* Cards: Tasks, Late Employees, Materials Used */}
            <View style={{ flexDirection: 'column', gap: 16 }}>
              {/* Tasks Card */}
              <TouchableOpacity
                activeOpacity={canExpand ? 0.7 : 1}
                onPress={() => canExpand && setShowAllTasksModal(true)}
                style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 6 }}>Tasks</Text>
                {limitLines(filteredTasks, 10).map((t, idx) => (
                  <Text key={t.id} style={{ color: t.completed ? '#388e3c' : '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                    {idx + 1}. {t.name} {t.completed ? '(Completed)' : ''}
                  </Text>
                ))}
                {filteredTasks.length > 10 && (
                  <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{filteredTasks.length - 10} more...</Text>
                )}
              </TouchableOpacity>
              {/* Late Employees Card */}
              <TouchableOpacity
                activeOpacity={canExpand ? 0.7 : 1}
                onPress={() => canExpand && setShowAllLateEmpsModal(true)}
                style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#c62828', marginBottom: 6 }}>Late Employees</Text>
                {limitLines(getLateEmployeesByClockEvents(summaryDate), 10).map((name, idx) => (
                  <Text key={name} style={{ color: '#c62828', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                    {idx + 1}. {name}
                  </Text>
                ))}
                {getLateEmployeesByClockEvents(summaryDate).length > 10 && (
                  <Text style={{ color: '#c62828', fontWeight: 'bold', marginTop: 4 }}>+{getLateEmployeesByClockEvents(summaryDate).length - 10} more...</Text>
                )}
              </TouchableOpacity>
              {/* Materials Used Card */}
              <TouchableOpacity
                activeOpacity={canExpand ? 0.7 : 1}
                onPress={() => canExpand && setShowAllMaterialsModal(true)}
                style={{ backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 6 }}>Materials Used</Text>
                {limitLines(materialsUsed, 10).map((mat, idx) => (
                  <Text key={mat} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                    {idx + 1}. {mat}
                  </Text>
                ))}
                {materialsUsed.length > 10 && (
                  <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{materialsUsed.length - 10} more...</Text>
                )}
              </TouchableOpacity>
            </View>
            {/* Modals for week/month full lists */}
            <Modal visible={showAllTasksModal} animationType="slide" transparent onRequestClose={() => setShowAllTasksModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '90%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 }}>All Tasks</Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {filteredTasks.map((t, idx) => (
                      <Text key={t.id} style={{ color: t.completed ? '#388e3c' : '#263238', fontSize: 15, marginBottom: 2 }}>
                        {idx + 1}. {t.name} {t.completed ? '(Completed)' : ''}
                      </Text>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setShowAllTasksModal(false)}>
                    <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <Modal visible={showAllLateEmpsModal} animationType="slide" transparent onRequestClose={() => setShowAllLateEmpsModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '90%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#c62828', marginBottom: 10 }}>All Late Employees</Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {getLateEmployeesByClockEvents(summaryDate).map((name, idx) => (
                      <Text key={name} style={{ color: '#c62828', fontSize: 15, marginBottom: 2 }}>
                        {idx + 1}. {name}
                      </Text>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setShowAllLateEmpsModal(false)}>
                    <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            <Modal visible={showAllMaterialsModal} animationType="slide" transparent onRequestClose={() => setShowAllMaterialsModal(false)}>
              <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 24, width: '90%', maxHeight: '90%' }}>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 10 }}>All Materials Used</Text>
                  <ScrollView style={{ maxHeight: 400 }}>
                    {materialsUsed.map((mat, idx) => (
                      <Text key={mat} style={{ color: '#263238', fontSize: 15, marginBottom: 2 }}>
                        {idx + 1}. {mat}
                      </Text>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={{ marginTop: 16, alignSelf: 'center' }} onPress={() => setShowAllMaterialsModal(false)}>
                    <Text style={{ color: '#c62828', fontWeight: 'bold', fontSize: 16 }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
            {/* Export Modal */}
            {renderExportModal()}
          </ScrollView>
        )}
        {/* Move Export button to bottom of Home tab */}
        {tab === 'home' && (
          <View style={{ position: 'absolute', bottom: 16, left: 0, right: 0, alignItems: 'center', zIndex: 10 }}>
            <TouchableOpacity style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 14, minWidth: 160, alignItems: 'center', shadowColor: '#1976d2', shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 }} onPress={() => setExportModalVisible(true)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Export Data</Text>
            </TouchableOpacity>
          </View>
        )}
        {tab === 'employees' && renderEmployees()}
        {tab === 'tasks' && renderTasks()}
        {tab === 'materials' && renderMaterials()}
        {tab === 'clock' && renderClockEvents()}
        {tab === 'performance' && (
          <View style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 16 }}>
                Performance Management
              </Text>
              
              {/* Performance Settings */}
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 }}>
                  Rating System Settings
                </Text>
                
                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    onPress={() => updatePerformanceSettings({
                      ...performanceSettings,
                      ratingSystemEnabled: !performanceSettings.ratingSystemEnabled
                    })}
                  >
                    <FontAwesome5
                      name={performanceSettings.ratingSystemEnabled ? 'toggle-on' : 'toggle-off'}
                      size={20}
                      color={performanceSettings.ratingSystemEnabled ? '#4CAF50' : '#ccc'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 14, color: '#333' }}>
                      Enable Task Rating System
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}
                    onPress={() => updatePerformanceSettings({
                      ...performanceSettings,
                      autoRateCompletedTasks: !performanceSettings.autoRateCompletedTasks
                    })}
                  >
                    <FontAwesome5
                      name={performanceSettings.autoRateCompletedTasks ? 'toggle-on' : 'toggle-off'}
                      size={20}
                      color={performanceSettings.autoRateCompletedTasks ? '#4CAF50' : '#ccc'}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ fontSize: 14, color: '#333' }}>
                      Auto-rate Completed Tasks
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>
                    Default Rating for Auto-rated Tasks:
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <TouchableOpacity
                        key={rating}
                        onPress={() => updatePerformanceSettings({
                          ...performanceSettings,
                          defaultRating: rating
                        })}
                        style={{ marginRight: 8 }}
                      >
                        <FontAwesome5
                          name={performanceSettings.defaultRating >= rating ? 'star' : 'star-o'}
                          size={20}
                          color={performanceSettings.defaultRating >= rating ? '#FFD700' : '#ccc'}
                        />
                      </TouchableOpacity>
                    ))}
                    <Text style={{ marginLeft: 8, fontSize: 14, color: '#666' }}>
                      ({performanceSettings.defaultRating}/5)
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#1976d2',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flex: 1,
                    marginRight: 8,
                    alignItems: 'center'
                  }}
                  onPress={() => {
                    calculatePerformanceMetrics();
                    setShowPerformanceManagement(true);
                  }}
                >
                  <FontAwesome5 name="chart-line" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>View Performance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#4CAF50',
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    flex: 1,
                    marginLeft: 8,
                    alignItems: 'center'
                  }}
                  onPress={calculatePerformanceMetrics}
                >
                  <FontAwesome5 name="sync-alt" size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Recalculate</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Stats */}
            <View style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 }}>
                Quick Stats
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                <View style={{ alignItems: 'center' }}>
                  <FontAwesome5 name="tasks" size={24} color="#1976d2" />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginTop: 4 }}>
                    {tasks.filter(t => t.completed).length}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Completed</Text>
                </View>
                
                <View style={{ alignItems: 'center' }}>
                  <FontAwesome5 name="star" size={24} color="#FFD700" />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FFD700', marginTop: 4 }}>
                    {employees.length}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Employees</Text>
                </View>
                
                <View style={{ alignItems: 'center' }}>
                  <FontAwesome5 name="chart-bar" size={24} color="#4CAF50" />
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4CAF50', marginTop: 4 }}>
                    {tasks.filter(t => !t.completed).length}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#666' }}>Pending</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
      {/* Logout button moved to settings modal */}
      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={themedStyles.modalOverlay}>
          <View style={[...themedStyles.modalContent, { maxHeight: '90%' }]}> {/* Settings Page */}
            <Text style={themedStyles.modalTitle}>Settings</Text>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={themedStyles.settingsCard}>
                <Text style={themedStyles.settingsTitle}>Task Options</Text>
                {biometricEnabled && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 16, marginRight: 8, color: darkMode ? '#b3c0e0' : undefined }}>Fingerprint Login</Text>
                    <TouchableOpacity
                      style={[styles.checkbox, biometricEnabled && styles.checkboxChecked, darkMode && { borderColor: '#b3c0e0', backgroundColor: biometricEnabled ? '#b3c0e0' : '#23263a' }]}
                      onPress={async () => {
                        if (!biometricEnabled) {
                          // Prompt for fingerprint to enable
                          // If fingerprint login is needed here, import LocalAuthentication locally and use as needed
                        } else {
                          setBiometricEnabled(false);
                          setBiometricLoggedIn(false);
                          Alert.alert('Disabled', 'Fingerprint login disabled.');
                        }
                      }}
                    >
                      {biometricEnabled && <FontAwesome5 name="check" size={14} color={darkMode ? '#23263a' : '#fff'} />}
                    </TouchableOpacity>
                    <Text style={{ marginLeft: 8, color: biometricEnabled ? '#388e3c' : '#c62828', fontWeight: 'bold' }}>
                      {biometricEnabled ? 'Enabled' : 'Disabled'}
                    </Text>
                    {biometricEnabled && !biometricLoggedIn && (
                      <TouchableOpacity style={{ marginLeft: 12, backgroundColor: '#1976d2', borderRadius: 8, padding: 8 }} onPress={handleBiometricLogin}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Login with Fingerprint</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: darkMode ? '#b3c0e0' : undefined }}>Dark Mode</Text>
                  <TouchableOpacity
                    style={[styles.checkbox, darkMode && styles.checkboxChecked, { borderColor: '#b3c0e0', backgroundColor: darkMode ? '#b3c0e0' : '#fff' }]}
                    onPress={() => setDarkMode(v => !v)}
                  >
                    {darkMode && <FontAwesome5 name="check" size={14} color={darkMode ? '#23263a' : '#1976d2'} />}
                  </TouchableOpacity>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: darkMode ? '#b3c0e0' : undefined }}>Notify if task is late by (min)</Text>
                  <View style={{ flex: 0 }}>
                    <TextInput
                      style={[
                        styles.timeInput,
                        { minWidth: 30, maxWidth: 40, width: 36, flex: 0, alignSelf: 'flex-start', textAlign: 'center', fontSize: 15, paddingVertical: 2, paddingHorizontal: 4 },
                        darkMode ? { backgroundColor: '#23263a', color: '#b3c0e0', borderColor: '#b3c0e0' } : null
                      ]}
                      value={lateThreshold.toString()}
                      onChangeText={(v: string) => setLateThreshold(Number(v.replace(/[^0-9]/g, '')) || 0)}
                      keyboardType="numeric"
                      placeholder="10"
                      placeholderTextColor={darkMode ? '#888' : undefined}
                    />
                  </View>
                </View>
              </View>
              <View style={themedStyles.settingsCard}>
                <Text style={themedStyles.settingsTitle}>Working Hours</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: darkMode ? '#b3c0e0' : undefined }}>Work Start</Text>
                  <TextInput
                    style={[styles.timeInput, darkMode && { backgroundColor: '#23263a', color: '#b3c0e0', borderColor: '#b3c0e0' }]}
                    value={workStart}
                    onChangeText={setWorkStart}
                    placeholder="08:00"
                    placeholderTextColor={darkMode ? '#888' : undefined}
                  />
                  <Text style={[styles.timeLabel, darkMode && { color: '#b3c0e0' }]}>End</Text>
                  <TextInput
                    style={[styles.timeInput, darkMode && { backgroundColor: '#23263a', color: '#b3c0e0', borderColor: '#b3c0e0' }]}
                    value={workEnd}
                    onChangeText={setWorkEnd}
                    placeholder="17:00"
                    placeholderTextColor={darkMode ? '#888' : undefined}
                  />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, marginRight: 8, color: darkMode ? '#b3c0e0' : undefined }}>Lunch Start</Text>
                  <TextInput
                    style={[styles.timeInput, darkMode && { backgroundColor: '#23263a', color: '#b3c0e0', borderColor: '#b3c0e0' }]}
                    value={lunchStart}
                    onChangeText={setLunchStart}
                    placeholder="12:00"
                    placeholderTextColor={darkMode ? '#888' : undefined}
                  />
                  <Text style={[styles.timeLabel, darkMode && { color: '#b3c0e0' }]}>End</Text>
                  <TextInput
                    style={[styles.timeInput, darkMode && { backgroundColor: '#23263a', color: '#b3c0e0', borderColor: '#b3c0e0' }]}
                    value={lunchEnd}
                    onChangeText={setLunchEnd}
                    placeholder="12:30"
                    placeholderTextColor={darkMode ? '#888' : undefined}
                  />
                </View>
                <TouchableOpacity style={styles.saveBtn} onPress={saveTimes}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
              {/* Add more settings here as needed */}
            </ScrollView>
            {/* Logout and Close buttons at the bottom, side by side */}
            {/* Logout and Close buttons, logout higher up and close at the bottom */}
            <View style={{ flexDirection: 'column', marginTop: 12 }}>
              {/* Place Logout and Close buttons side by side at the bottom */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 24, marginBottom: 8, gap: 16 }}>
                {biometricEnabled && biometricLoggedIn ? (
                  <TouchableOpacity style={[themedStyles.closeBtn, { flex: 1, minWidth: 120 }]} onPress={handleBiometricLogout}>
                    <Text style={themedStyles.closeBtnText}>Logout (Fingerprint)</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[themedStyles.closeBtn, { flex: 1, minWidth: 120 }]} onPress={onLogout}>
                    <Text style={themedStyles.closeBtnText}>Logout</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[themedStyles.closeBtn, { flex: 1, minWidth: 120 }]} onPress={() => setSettingsVisible(false)}>
                  <Text style={themedStyles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
            {/* Removed duplicate close button */}
          </View>
        </View>
      </Modal>

      {/* Task Rating Modal */}
      <TaskRatingModal
        visible={showTaskRatingModal}
        onClose={() => {
          setShowTaskRatingModal(false);
          setSelectedTaskForRating(null);
          setSelectedEmployeeForRating(null);
        }}
        task={selectedTaskForRating}
        employee={selectedEmployeeForRating}
        business={user}
        onRatingSubmitted={handleTaskRatingSubmitted}
      />

      {/* Performance Management Modal */}
      <Modal
        visible={showPerformanceManagement}
        animationType="slide"
        onRequestClose={() => setShowPerformanceManagement(false)}
      >
        <PerformanceManagement
          business={user}
          onClose={() => setShowPerformanceManagement(false)}
        />
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  taskEmployeeCard: {
    backgroundColor: '#f5faff',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
    marginBottom: 18,
    shadowColor: '#1976d2',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
    alignItems: 'center',
  },
  inputLarge: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    fontSize: 20,
    minWidth: 100,
    backgroundColor: '#fff',
    color: '#222',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  taskNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263238',
    marginBottom: 4,
  },
  dropdownContainer: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'flex-start',
  },
  dropdownLabel: {
    fontSize: 14,
    color: '#1976d2',
    marginBottom: 2,
    fontWeight: 'bold',
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    minWidth: 80,
    alignItems: 'center',
    marginBottom: 4,
  },
  dropdownText: {
    fontSize: 16,
    color: '#222',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#1976d2',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#1976d2',
    borderColor: '#1976d2',
  },
  settingsCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    shadowColor: '#1976d2',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
  },
  addEmployeeCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 14,
    padding: 16,
    marginTop: 18,
    marginBottom: 18,
    shadowColor: '#1976d2',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  addEmployeeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  addEmployeeInputsRow: {
    flexDirection: 'row',
    width: '100%',
    marginBottom: 8,
    gap: 8,
  },
  editBtnText: { color: '#1976d2', fontWeight: 'bold', fontSize: 16 },
  container: { flex: 1, padding: 20, backgroundColor: '#f8fafd' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 8, color: '#1a237e' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 18, marginBottom: 8, color: '#333' },
  timeCard: { backgroundColor: '#e3f2fd', borderRadius: 14, padding: 16, marginBottom: 18, shadowColor: '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  timeSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timeSummary: { fontSize: 16, color: '#1976d2', fontWeight: 'bold', marginRight: 12 },
  timeEditRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  timeInput: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 8, width: 60, fontSize: 16, marginHorizontal: 4, backgroundColor: '#fff', color: '#222' },
  timeSep: { fontSize: 18, color: '#888', marginHorizontal: 2 },
  timeLabel: { fontSize: 15, color: '#333', marginHorizontal: 6 },
  employeeBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  employeeName: { fontSize: 16, fontWeight: 'bold', color: '#1a237e', flex: 1 },
  editBtn: { color: '#1976d2', marginHorizontal: 8 },
  deleteBtn: { color: '#c62828', marginHorizontal: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  editRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#bbb',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    flex: 1.5,
    fontSize: 17,
    minWidth: 100,
    backgroundColor: '#fff',
    color: '#222',
  },
  addBtn: { backgroundColor: '#388e3c', borderRadius: 8, padding: 10, marginLeft: 8 },
  addBtnText: { color: '#fff', fontWeight: 'bold' },
  saveBtn: { backgroundColor: '#1976d2', borderRadius: 8, padding: 10, marginLeft: 8 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' },
  taskBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  taskName: { fontSize: 16, color: '#263238', flex: 1 },
  task: { backgroundColor: '#e3f2fd', padding: 12, borderRadius: 8, marginBottom: 10 },
  taskCompleted: { backgroundColor: '#c8e6c9' },
  taskTime: { fontSize: 14, color: '#666', marginBottom: 8 },
  completeBtn: { backgroundColor: '#388e3c', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 6 },
  completeBtnText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, color: '#1976d2', alignSelf: 'center' },
  closeBtn: { marginTop: 16, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center', minWidth: 90 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, textAlign: 'center' },

  materialBlock: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 4 },
  materialName: { fontSize: 16, color: '#263238', flex: 1 },

  // New style for logout button at the bottom
  logoutBtn: {
    alignSelf: 'center',
    position: 'absolute',
    bottom: 24,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: '#1976d2',
    minWidth: 60,
    elevation: 2,
    shadowColor: '#1976d2',
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  logoutBtnText: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;

