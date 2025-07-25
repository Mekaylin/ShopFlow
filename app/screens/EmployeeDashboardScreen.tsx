import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import AddTaskModal from '../../components/ui/AddTaskModal';
// --- Welcome/Goodbye Animation State ---
import { ActivityIndicator, Alert, Animated, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationPanel, { Notification } from '../../components/admin/NotificationPanel';
import { supabase } from '../../lib/supabase';
// Helper: Welcome/Goodbye animation state must be inside the component
// Helper to queue clock events locally
type ClockEvent = {
  employee_id: string;
  business_id: string;
  action: string;
  clock_in?: string;
  clock_out?: string;
  lunch_start?: string;
  lunch_end?: string;
};



async function queueClockEvent(event: ClockEvent) {
  const key = 'offline_clock_events';
  try {
    const existing = await AsyncStorage.getItem(key);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(event);
    await AsyncStorage.setItem(key, JSON.stringify(queue));
  } catch {}
}

// Helper to sync queued events
async function syncClockEvents() {
  const key = 'offline_clock_events';
  try {
    const existing = await AsyncStorage.getItem(key);
    if (!existing) return;
    const queue = JSON.parse(existing);
    const remaining = [];
    for (const event of queue as ClockEvent[]) {
      try {
        // Only send the correct columns to Supabase
        const { error } = await supabase.from('clock_events').insert(event);
        if (error) remaining.push(event);
      } catch {
        remaining.push(event);
      }
    }
    if (remaining.length === 0) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, JSON.stringify(remaining));
    }
  } catch {}
}

interface Employee {
  id: string;
  name: string;
  code: string;
  business_id: string;
  work_start?: string; // 'HH:mm', e.g. '08:00'
  work_end?: string;   // 'HH:mm', e.g. '17:00'
  lunch_start?: string; // 'HH:mm', e.g. '12:00'
  lunch_end?: string;   // 'HH:mm', e.g. '13:00'
}

interface Material {
  id: string;
  name: string;
  unit: string;
}
// Demo materials (managed by admin)
const initialMaterials: Material[] = [
  { id: 'm1', name: 'Steel', unit: 'kg' },
  { id: 'm2', name: 'Paint', unit: 'liters' },
  { id: 'm3', name: 'Oil', unit: 'liters' },
];

interface Task {
  id: string;
  name: string;
  start: string;
  deadline: string;
  completed: boolean;
  completed_at?: string; // ISO string
  assigned_to: string;
  materials_used?: { materialId: string; quantity: number }[];
}
const initialTasks: Task[] = [
  { id: '1', name: 'Replace windshield', start: '8:00', deadline: '10:00', completed: false, assigned_to: 'e1', materials_used: [] },
  { id: '2', name: 'Paint bumper', start: '10:15', deadline: '12:00', completed: false, assigned_to: 'e2', materials_used: [] },
  { id: '3', name: 'Oil change', start: '13:00', deadline: '14:00', completed: false, assigned_to: 'e3', materials_used: [] },
];

// Removed auto-logout for all-day running app
// const AUTO_LOGOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EmployeeDashboardScreenProps {
  onLogout: () => void;
  user?: any;
}

import { useRouter } from 'expo-router';

function EmployeeDashboardScreen({ onLogout, user }: EmployeeDashboardScreenProps) {
  // Welcome/Goodbye animation state (moved inside component)
  const [showGreeting, setShowGreeting] = useState<null | 'welcome' | 'goodbye'>(null);
  const greetingAnim = useRef(new Animated.Value(0)).current;
  const triggerGreeting = (type: 'welcome' | 'goodbye', name: string) => {
    setShowGreeting(type);
    greetingAnim.setValue(0);
    Animated.timing(greetingAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => {
        Animated.timing(greetingAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => setShowGreeting(null));
      }, 1400);
    });
  };
  // --- Add Task Modal State for Employee ---
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [addTaskLoading, setAddTaskLoading] = useState(false);
  const [addTaskError, setAddTaskError] = useState('');
  const handleAddTask = async (taskData: any) => {
    setAddTaskLoading(true);
    setAddTaskError('');
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskData,
          business_id: user?.business_id,
        })
        .select('*')
        .single();
      if (error || !data) {
        setAddTaskError('Failed to add task.');
        return;
      }
      setTasks((prev: Task[]) => [...prev, data]);
    } catch (e) {
      setAddTaskError('Unexpected error.');
    } finally {
      setAddTaskLoading(false);
    }
  };
  const router = useRouter();
  // Fetch employees, tasks, and materials from Supabase on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: empData, error: empError } = await supabase.from('employees').select('*');
        if (empError) throw empError;
        setEmployees(empData || []);
        const { data: taskData, error: taskError } = await supabase.from('tasks').select('*');
        if (taskError) throw taskError;
        setTasks(taskData || []);
        const { data: matData, error: matError } = await supabase.from('materials').select('*');
        if (matError) throw matError;
        setMaterials(matData || []);
      } catch (err) {
        Alert.alert('Error', 'Failed to load data from cloud.');
      }
    };
    fetchData();
  }, []);

  // --- CLOCK IN/OUT LOGIC ---
  const [clockLoading, setClockLoading] = useState(false);
  const handleClockInOut = async () => {
    setClockInError('');
    const code = codePrompt.trim();
    console.log('[ClockIn] Attempting clock in/out with code:', code);
    // Validate code format: must be alphanumeric, 3-10 chars
    if (!code || !/^[a-zA-Z0-9]{3,10}$/.test(code)) {
      console.warn('[ClockIn] Invalid code format:', code);
      setClockInError('Please enter a valid employee code (3-10 alphanumeric characters).');
      return;
    }
    // Find employee by code (case-insensitive)
    const employee = employees.find(e => e.code.toLowerCase() === code.toLowerCase());
    if (!employee) {
      console.warn('[ClockIn] No employee found for code:', code);
      setClockInError('Invalid employee code. Please check and try again.');
      Alert.alert('Invalid Code', 'The employee code you entered is incorrect. Please try again.');
      return;
    }
    // Auto-detect action based on working hours and lunch times
    // Assumes employee object has work_start, work_end, lunch_start, lunch_end as 'HH:mm' strings
    const nowDate = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const nowHM = pad(nowDate.getHours()) + ':' + pad(nowDate.getMinutes());
    let action: 'in' | 'out' | 'lunch' | 'lunchBack' = 'in';
    if (employee.work_start && employee.work_end && employee.lunch_start && employee.lunch_end) {
      // Helper to compare HH:mm
      const isBetween = (start: string, end: string, time: string) => {
        return start <= time && time <= end;
      };
      if (isBetween(employee.work_start, employee.lunch_start, nowHM)) {
        action = 'in';
      } else if (isBetween(employee.lunch_start, employee.lunch_end, nowHM)) {
        action = 'lunch';
      } else if (isBetween(employee.lunch_end, employee.work_end, nowHM)) {
        action = 'lunchBack';
      } else {
        action = 'out';
      }
    } else {
      // Fallback to previous logic if schedule not set
      if (clockedIn && !onLunch) action = 'out';
      else if (clockedIn && !onLunch) action = 'lunch';
      else if (clockedIn && onLunch) action = 'lunchBack';
      else action = 'in';
    }
    console.log('[ClockIn] Action auto-detected:', action, 'Current time:', nowHM, 'Schedule:', {
      work_start: employee.work_start,
      lunch_start: employee.lunch_start,
      lunch_end: employee.lunch_end,
      work_end: employee.work_end
    });
    setClockLoading(true);
    // Prevent duplicate clock events within 1 minute
    try {
      const { data: recentEvents, error: recentError } = await supabase
        .from('clock_events')
        .select('id, action, created_at')
        .eq('employee_id', employee.id)
        .order('created_at', { ascending: false })
        .limit(1);
      if (recentError) {
        console.error('[ClockIn] Error fetching recent events:', recentError);
        throw recentError;
      }
      if (recentEvents && recentEvents.length > 0) {
        const lastEvent = recentEvents[0];
        const lastTime = new Date(lastEvent.created_at).getTime();
        const now = Date.now();
        console.log('[ClockIn] Last event:', lastEvent, 'Now:', now, 'LastTime:', lastTime);
        if (lastEvent.action === action && now - lastTime < 60000) {
          console.warn('[ClockIn] Duplicate clock event detected:', lastEvent);
          setClockLoading(false);
          setClockInError('Duplicate clock event detected. Please wait a moment before trying again.');
          return;
        }
      }
      // Insert clock event with correct timestamp column based on action
      const now = new Date().toISOString();
      const event: any = {
        business_id: employee.business_id,
        employee_id: employee.id,
        action,
      };
      if (action === 'in') event.clock_in = now;
      if (action === 'out') event.clock_out = now;
      if (action === 'lunch') event.lunch_start = now;
      if (action === 'lunchBack') event.lunch_end = now;
      console.log('[ClockIn] Inserting event:', event);
      const { error } = await supabase.from('clock_events').insert(event);
      if (error) {
        console.error('[ClockIn] Error inserting clock event:', error);
        throw error;
      }
      setNotifications(prev => [
        { id: Math.random().toString(36).slice(2), message: `Clock ${action} for ${employee.name} at ${new Date().toLocaleTimeString()}`, timestamp: new Date().toISOString(), type: 'info' },
        ...prev.slice(0, 19),
      ]);
      if (action === 'in') {
        setClockedIn(true); setOnLunch(false);
        triggerGreeting('welcome', employee.name);
        Alert.alert('Clocked In', `${employee.name} clocked in at ${new Date().toLocaleTimeString()}`);
        // Robust error log after successful clock in
        console.info('[ClockIn][Success]', {
          employeeId: employee.id,
          employeeName: employee.name,
          action,
          timestamp: new Date().toISOString(),
          event,
        });
      }
      else if (action === 'out') {
        setClockedIn(false); setOnLunch(false);
        triggerGreeting('goodbye', employee.name);
        Alert.alert('Clocked Out', `${employee.name} clocked out at ${new Date().toLocaleTimeString()}`);
      }
      else if (action === 'lunch') { setOnLunch(true); Alert.alert('Lunch', `${employee.name} started lunch at ${new Date().toLocaleTimeString()}`); }
      else if (action === 'lunchBack') { setOnLunch(false); Alert.alert('Back', `${employee.name} ended lunch at ${new Date().toLocaleTimeString()}`); }
      // Modal rendering moved to main return block
      setCodePrompt('');
      console.log('[ClockIn] Clock event successful for', employee.name, 'Action:', action);
    } catch (err) {
      console.error('[ClockIn] Failed to clock event:', err);
      setClockInError('Failed to clock event. Please check your connection or try again.');
    } finally {
      setClockLoading(false);
    }
  };

  // --- MATERIALS/COMPLETE TASK LOGIC ---
  const [taskMaterials, setTaskMaterials] = useState<{ [taskId: string]: { materialId: string; quantity: string }[] }>({});
  const handleSaveMaterials = async (taskId: string) => {
    const materialsArr = (taskMaterials[taskId] || [])
      .filter(m => m.quantity && !isNaN(Number(m.quantity)))
      .map(m => ({ materialId: m.materialId, quantity: Number(m.quantity) }));
    if (materialsArr.length === 0) {
      Alert.alert('No Materials', 'Please enter quantities for at least one material before saving.');
      return;
    }
    try {
      const { error } = await supabase.from('tasks').update({ materials_used: materialsArr }).eq('id', taskId);
      if (error) {
        console.error('Supabase error saving materials:', error);
        Alert.alert('Error', 'Failed to save materials.');
        return;
      }
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, materials_used: materialsArr } : t));
      Alert.alert('Saved', 'Materials used have been saved for this task.');
    } catch (err) {
      console.error('Unexpected error saving materials:', err);
      Alert.alert('Error', 'Failed to save materials.');
    }
  };
  const handleCompleteTask = async (taskId: string) => {
    try {
      const completedAt = new Date().toISOString();
      const { data, error } = await supabase.from('tasks').update({ completed: true, completed_at: completedAt }).eq('id', taskId).select('*').single();
      if (error || !data) {
        console.error('Supabase error completing task:', error);
        Alert.alert('Error', 'Failed to complete task.');
        return;
      }
      setTasks(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
      setSelectedTask(null); // Close modal after completion
      Alert.alert('Task Completed', 'Task marked as complete.');
    } catch (err) {
      console.error('Unexpected error completing task:', err);
      Alert.alert('Error', 'Failed to complete task.');
    }
  };
  // Theme/colors
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(false);
  const isDark = darkMode;
  const insets = useSafeAreaInsets();
  // Theme toggles between light and dark
  const theme = {
    background: isDark ? '#181C24' : '#fff',
    card: isDark ? '#232A36' : '#fff',
    primary: '#1976d2',
    accent: '#388e3c',
    error: '#c62828',
    text: isDark ? '#fff' : '#1a237e',
    subtext: isDark ? '#b0b8c1' : '#263238',
    border: isDark ? '#2c3440' : '#eee',
    shadow: isDark ? '#000' : '#b0b8c1',
  };

  // Tabs: 'clock' or 'tasks'
  const [activeTab, setActiveTab] = useState<'clock' | 'tasks'>('clock');

  // State for employees, tasks, materials, etc.
  const [employees, setEmployees] = useState<Employee[]>([]); // Fetched from Supabase
  const [tasks, setTasks] = useState<Task[]>([]); // Fetched from Supabase
  const [materials, setMaterials] = useState<Material[]>([]); // Fetched from Supabase
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  // Clock in/out state
  const [codePrompt, setCodePrompt] = useState('');
  const [clockInError, setClockInError] = useState('');
  const [clockedIn, setClockedIn] = useState(false);
  const [onLunch, setOnLunch] = useState(false);
  // View Tasks state
  const [employeeTasksId, setEmployeeTasksId] = useState<string | null>(null);
  const [showEmployeeTasksPage, setShowEmployeeTasksPage] = useState(false);
  // TODO: Fetch employees, tasks, and materials from Supabase on mount

  // Settings modal state
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Tab UI
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 16, paddingHorizontal: 8 }]}> 
      {/* Welcome/Goodbye Animation Modal */}
      {showGreeting && (
        <Modal visible transparent animationType="none">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)', justifyContent: 'center', alignItems: 'center' }}>
            <Animated.View style={{
              opacity: greetingAnim,
              transform: [{ scale: greetingAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
              backgroundColor: '#fff',
              borderRadius: 24,
              padding: 36,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOpacity: 0.18,
              shadowRadius: 16,
              elevation: 8,
              minWidth: 260,
            }}>
              <Text style={{ fontSize: 32, fontWeight: 'bold', color: showGreeting === 'welcome' ? '#388e3c' : '#c62828', marginBottom: 10 }}>
                {showGreeting === 'welcome' ? 'Welcome!' : 'Goodbye!'}
              </Text>
              <Text style={{ fontSize: 22, color: '#1976d2', fontWeight: '600', marginBottom: 8 }}>
                {showGreeting === 'welcome' ? 'Have a great shift!' : 'See you next time!'}
              </Text>
              {/* Simple animation: waving hand or checkmark */}
              <Text style={{ fontSize: 48, marginTop: 8 }}>{showGreeting === 'welcome' ? '👋' : '✅'}</Text>
            </Animated.View>
          </View>
        </Modal>
      )}
      {/* Settings Button */}
      <TouchableOpacity
        style={{ position: 'absolute', top: insets.top + 10, right: 18, zIndex: 10, backgroundColor: theme.card, borderRadius: 20, padding: 10, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 2 }}
        onPress={() => setSettingsVisible(true)}
      >
        <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 18 }}>⚙️</Text>
      </TouchableOpacity>
      {/* Settings Modal */}
      <Modal visible={settingsVisible} animationType="slide" transparent onRequestClose={() => setSettingsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { alignItems: 'center', padding: 32 }]}> 
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 18 }}>Settings</Text>
            <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: theme.primary, marginBottom: 14 }]} onPress={() => { setSettingsVisible(false); router.replace('/admin-dashboard'); }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Go to Admin Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: isDark ? theme.card : theme.primary, marginBottom: 14 }]} onPress={() => setDarkMode(!darkMode)}>
              <Text style={{ color: isDark ? theme.primary : '#fff', fontWeight: 'bold', fontSize: 16 }}>{isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: theme.card, marginTop: 6, borderWidth: 1, borderColor: theme.primary }]} onPress={() => setSettingsVisible(false)}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Vertical Tabs */}
      <View style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: 38, marginBottom: 18, width: '100%' }}>
        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: activeTab === 'clock' ? theme.primary : '#e3e3e3',
            width: '90%',
            marginBottom: 18,
            alignSelf: 'center',
            paddingVertical: 36,
            borderRadius: 18,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 6,
          }]}
          onPress={() => setActiveTab('clock')}
        >
          <Text style={{ color: activeTab === 'clock' ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 24, textAlign: 'center' }}>Clock In/Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, {
            backgroundColor: activeTab === 'tasks' ? theme.primary : '#e3e3e3',
            width: '90%',
            marginBottom: 0,
            alignSelf: 'center',
            paddingVertical: 36,
            borderRadius: 18,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 6,
          }]}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={{ color: activeTab === 'tasks' ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 24, textAlign: 'center' }}>View Tasks</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'clock' ? (
        // --- CLOCK IN/OUT TAB ---
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
          <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30, fontWeight: 'bold', color: theme.primary, marginBottom: 8, letterSpacing: 0.5 }}>Clock Events</Text>
            <Text style={{ color: theme.subtext, fontSize: 16, marginBottom: 18, textAlign: 'center', maxWidth: 340 }}>
              Enter your employee code to clock in, out, or manage lunch. Your action is auto-detected based on your schedule.
            </Text>
            <View style={{ width: 350, backgroundColor: theme.card, borderRadius: 20, padding: 28, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 4, alignItems: 'center', marginBottom: 18 }}>
              <TextInput
                style={{ borderWidth: 1, borderColor: clockInError ? theme.error : '#bbb', borderRadius: 10, padding: 16, width: '100%', fontSize: 22, marginBottom: 14, backgroundColor: isDark ? '#232A36' : '#f8fafd', textAlign: 'center', letterSpacing: 1 }}
                placeholder="Enter Employee Code"
                value={codePrompt}
                onChangeText={setCodePrompt}
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={theme.subtext}
                returnKeyType="done"
                onSubmitEditing={handleClockInOut}
                accessibilityLabel="Employee Code Input"
              />
              {clockInError ? (
                <Text style={{ color: theme.error, marginBottom: 10, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>{clockInError}</Text>
              ) : null}
              <TouchableOpacity
                style={{ backgroundColor: theme.primary, width: '100%', borderRadius: 10, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 0, shadowColor: theme.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.10, shadowRadius: 4, elevation: 2 }}
                onPress={handleClockInOut}
                disabled={clockLoading}
                accessibilityLabel="Submit Clock Event"
              >
                {clockLoading ? (
                  <ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                ) : null}
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 22, letterSpacing: 1 }}>
                  {clockedIn ? (onLunch ? 'End Lunch' : 'Clock Out') : 'Clock In'}
                </Text>
              </TouchableOpacity>
              {/* Last event summary */}
              {employees.length > 0 && codePrompt && employees.find(e => e.code.toLowerCase() === codePrompt.trim().toLowerCase()) && (
                <View style={{ marginTop: 18, width: '100%', alignItems: 'center' }}>
                  <Text style={{ color: theme.subtext, fontSize: 15, marginBottom: 2 }}>Last Event:</Text>
                  {/* You could fetch and display the last event here if desired */}
                  {/* For now, just show status */}
                  <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 16 }}>
                    {clockedIn ? (onLunch ? 'On Lunch' : 'Clocked In') : 'Clocked Out'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      ) : (
        // --- VIEW TASKS TAB ---
        <View style={{ flex: 1 }}>
          {!showEmployeeTasksPage ? (
            <>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>Select Employee</Text>
              <FlatList
                data={employees || []}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.employeeBlock, { minWidth: 220, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, marginBottom: 18, padding: 18, borderWidth: 1, borderColor: '#e3e3e3' }]}
                    onPress={() => { setSelectedEmployee(item); setShowEmployeeTasksPage(true); }}
                  >
                    <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary }}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
                <TouchableOpacity onPress={() => setShowEmployeeTasksPage(false)}>
                  <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{'< Back to Employees'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowAddTaskModal(true)} style={{ backgroundColor: theme.primary, borderRadius: 20, padding: 8, paddingHorizontal: 16 }}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>+ Add Task</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary, marginBottom: 8 }}>{selectedEmployee?.name}'s Tasks</Text>
              <FlatList
                data={(tasks && selectedEmployee) ? tasks.filter(t => t.assigned_to === selectedEmployee.id) : []}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.task, item.completed && styles.taskCompleted]}
                    onPress={() => setSelectedTask(item)}
                  >
                    <Text style={styles.taskName}>{item.name}</Text>
                    <Text style={styles.taskTime}>Start: {item.start} | Due: {item.deadline}</Text>
                    <Text style={styles.taskStatus}>{item.completed ? 'Completed' : 'In Progress'}</Text>
                    {item.completed && item.completed_at && (
                      <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(item.completed_at).toLocaleString()}</Text>
                    )}
                    {!item.completed && (
                      <TouchableOpacity
                        style={{ backgroundColor: '#388e3c', borderRadius: 8, padding: 10, alignItems: 'center', marginTop: 8 }}
                        onPress={async () => {
                          try {
                            const completedAt = new Date().toISOString();
                            const { data, error } = await supabase
                              .from('tasks')
                              .update({ completed: true, completed_at: completedAt })
                              .eq('id', item.id)
                              .select('*')
                              .single();
                            if (!error && data) {
                              setTasks(prev => prev.map(t => t.id === data.id ? { ...t, ...data } : t));
                            } else {
                              console.error('Mark as Completed error (employee):', error);
                              setAddTaskError('Failed to mark as completed. See console for details.');
                            }
                          } catch (err) {
                            console.error('Mark as Completed error (employee):', err);
                            setAddTaskError('Failed to mark as completed. See console for details.');
                          }
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Mark as Completed</Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                )}
              />
              {/* Add Task Modal for Employee */}
              {selectedEmployee && (
                <>
                  <AddTaskModal
                    visible={showAddTaskModal}
                    onClose={() => setShowAddTaskModal(false)}
                    currentEmployee={selectedEmployee}
                    onAddTask={handleAddTask}
                    loading={addTaskLoading}
                    error={addTaskError}
                    setError={setAddTaskError}
                  />
                  {addTaskError && (
                    <Text style={{ color: 'red', marginTop: 8, textAlign: 'center' }}>{addTaskError}</Text>
                  )}
                </>
              )}
            </>
          )}
        </View>
      )}
      {/* Task modal with materials and completion */}
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}> 
            {selectedTask && (
              <>
                <Text style={styles.modalTitle}>{selectedTask.name}</Text>
                <Text style={styles.taskTime}>Start: {selectedTask.start} | Due: {selectedTask.deadline}</Text>
                <Text style={styles.taskStatus}>{selectedTask.completed ? 'Completed' : 'In Progress'}</Text>
                {selectedTask.completed && selectedTask.completed_at && (
                  <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(selectedTask.completed_at).toLocaleString()}</Text>
                )}
                {/* Materials entry UI (only if not completed) */}
                {!selectedTask.completed && (
                  <View style={{ marginTop: 10 }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Materials Used:</Text>
                    {materials.map(mat => (
                      <View key={mat.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={{ flex: 1 }}>{mat.name} ({mat.unit}):</Text>
                        <TextInput
                          style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 6, width: 60, marginLeft: 8, backgroundColor: '#fff' }}
                          placeholder="0"
                          keyboardType="numeric"
                          value={taskMaterials[selectedTask.id]?.find(m => m.materialId === mat.id)?.quantity || ''}
                          onChangeText={val => {
                            setTaskMaterials(prev => {
                              const prevArr = prev[selectedTask.id] || [];
                              const filtered = prevArr.filter(m => m.materialId !== mat.id);
                              return {
                                ...prev,
                                [selectedTask.id]: [...filtered, { materialId: mat.id, quantity: val }],
                              };
                            });
                          }}
                        />
                      </View>
                    ))}
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 8, paddingVertical: 10 }]} onPress={() => handleSaveMaterials(selectedTask.id)}>
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save Materials</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.accent, marginTop: 8, paddingVertical: 10, opacity: (!selectedTask || selectedTask.completed) ? 0.5 : 1 }]}
                      onPress={() => selectedTask && !selectedTask.completed && handleCompleteTask(selectedTask.id)}
                      disabled={!selectedTask || selectedTask.completed}
                    >
                      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Mark Complete</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={[styles.closeBtn, { marginTop: 18 }]} onPress={() => setSelectedTask(null)}>
                  <Text style={styles.closeBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      {/* Notification Panel Modal */}
      <Modal visible={notificationPanelVisible} animationType="slide" transparent onRequestClose={() => setNotificationPanelVisible(false)}>
        <NotificationPanel notifications={notifications} onClose={() => setNotificationPanelVisible(false)} />
      </Modal>
    </View>
  );
}

export default EmployeeDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 30, fontWeight: 'bold', marginBottom: 36, alignSelf: 'center', letterSpacing: 1 },
  buttonCol: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  actionBtn: { width: '92%', paddingVertical: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginHorizontal: 8, marginBottom: 0, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 6 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 24, letterSpacing: 0.5 },
  task: { backgroundColor: '#e3f2fd', padding: 18, borderRadius: 10, marginBottom: 14, shadowColor: '#b0b8c1', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  taskCompleted: { backgroundColor: '#c8e6c9' },
  taskName: { fontSize: 17, fontWeight: 'bold', color: '#263238' },
  taskTime: { fontSize: 15, color: '#666', marginBottom: 8 },
  taskStatus: { fontSize: 14, color: '#388e3c', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '92%', maxHeight: '80%' },
  codeModalContent: { backgroundColor: '#fff', borderRadius: 14, padding: 28, width: '88%', alignItems: 'center' },
  codeInput: { borderWidth: 1, borderColor: '#bbb', borderRadius: 8, padding: 14, width: '100%', fontSize: 19, marginTop: 18 },
  codeBtnRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 16 },
  codeBtn: { flex: 1, backgroundColor: '#1976d2', borderRadius: 8, padding: 10, alignItems: 'center', marginHorizontal: 6 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, alignSelf: 'center', letterSpacing: 0.5 },
  employeeBlock: { marginBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 },
  employeeName: { fontSize: 19, fontWeight: 'bold', color: '#1a237e', marginBottom: 8 },
  empTaskList: { marginLeft: 10 },
  noTask: { color: '#888', fontStyle: 'italic' },
  closeBtn: { marginTop: 20, backgroundColor: '#1976d2', borderRadius: 10, padding: 14, alignItems: 'center', minWidth: 100 },
  closeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18, textAlign: 'center' },
  settingsBtn: {
    width: 160,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  fullPageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  fullPageContent: { flex: 1, width: '100%', padding: 24, justifyContent: 'flex-start', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  // --- MaterialDropdown component ---
  dropdown: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 8, backgroundColor: '#f5faff', marginBottom: 6 },
  dropdownList: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, backgroundColor: '#fff', marginBottom: 6 },
  // --- End MaterialDropdown component ---
});
