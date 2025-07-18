import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationPanel, { Notification } from '../../components/admin/NotificationPanel';
import { supabase } from '../../lib/supabase';
// Helper to queue clock events locally
type ClockEvent = {
  employee_id: string;
  business_id: string;
  action: string;
  timestamp: string;
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

function EmployeeDashboardScreen({ onLogout }: EmployeeDashboardScreenProps) {
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
  const handleClockInOut = async () => {
    setClockInError('');
    const code = codePrompt.trim();
    if (!code) {
      setClockInError('Please enter your employee code.');
      return;
    }
    // Find employee by code
    const employee = employees.find(e => e.code === code);
    if (!employee) {
      setClockInError('Invalid code.');
      return;
    }
    // Determine action
    let action: 'in' | 'out' | 'lunch' | 'lunchBack' = 'in';
    if (clockedIn && !onLunch) action = 'out';
    else if (clockedIn && !onLunch) action = 'lunch';
    else if (clockedIn && onLunch) action = 'lunchBack';
    // Insert clock event
    const event: ClockEvent = {
      employee_id: employee.id,
      business_id: employee.business_id,
      action,
      timestamp: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('clock_events').insert(event);
      if (error) throw error;
      setNotifications(prev => [
        { id: Math.random().toString(36).slice(2), message: `Clock ${action} for ${employee.name}`, timestamp: new Date().toISOString(), type: 'info' },
        ...prev.slice(0, 19),
      ]);
      if (action === 'in') { setClockedIn(true); setOnLunch(false); Alert.alert('Clocked In', 'You are clocked in.'); }
      else if (action === 'out') { setClockedIn(false); setOnLunch(false); Alert.alert('Clocked Out', 'You have clocked out.'); }
      else if (action === 'lunch') { setOnLunch(true); Alert.alert('Lunch', 'You are on lunch.'); }
      else if (action === 'lunchBack') { setOnLunch(false); Alert.alert('Back', 'Lunch ended.'); }
      setCodePrompt('');
    } catch (err) {
      setClockInError('Failed to clock event.');
    }
  };

  // --- MATERIALS/COMPLETE TASK LOGIC ---
  const [taskMaterials, setTaskMaterials] = useState<{ [taskId: string]: { materialId: string; quantity: string }[] }>({});
  const handleSaveMaterials = async (taskId: string) => {
    const materialsArr = (taskMaterials[taskId] || [])
      .filter(m => m.quantity && !isNaN(Number(m.quantity)))
      .map(m => ({ materialId: m.materialId, quantity: Number(m.quantity) }));
    try {
      const { error } = await supabase.from('tasks').update({ materials_used: materialsArr }).eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, materials_used: materialsArr } : t));
      Alert.alert('Saved', 'Materials used have been saved for this task.');
    } catch {
      Alert.alert('Error', 'Failed to save materials.');
    }
  };
  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed: true, completed_at: new Date().toISOString() } : t));
      Alert.alert('Task Completed', 'Task marked as complete.');
    } catch {
      Alert.alert('Error', 'Failed to complete task.');
    }
  };
  // Theme/colors
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const isDark = darkMode;
  const insets = useSafeAreaInsets();
  // Match admin dashboard: white background, blue accents
  const theme = {
    background: '#fff',
    card: '#fff',
    primary: '#1976d2',
    accent: '#388e3c',
    error: '#c62828',
    text: '#1a237e',
    subtext: '#263238',
    border: '#eee',
    shadow: '#b0b8c1',
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

  // Tab UI
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 16, paddingHorizontal: 8 }]}> 
      <View style={{ flexDirection: 'row', marginBottom: 18 }}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTab === 'clock' ? theme.primary : '#e3e3e3', flex: 1, marginRight: 8 }]} onPress={() => setActiveTab('clock')}>
          <Text style={{ color: activeTab === 'clock' ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 18 }}>Clock In/Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: activeTab === 'tasks' ? theme.primary : '#e3e3e3', flex: 1 }]} onPress={() => setActiveTab('tasks')}>
          <Text style={{ color: activeTab === 'tasks' ? '#fff' : '#1976d2', fontWeight: 'bold', fontSize: 18 }}>View Tasks</Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'clock' ? (
        // --- CLOCK IN/OUT TAB ---
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>Clock In/Out</Text>
          <TextInput
            style={[styles.codeInput, { width: 220, marginBottom: 10 }]}
            placeholder="Enter Employee Code"
            value={codePrompt}
            onChangeText={setCodePrompt}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          {clockInError ? <Text style={{ color: theme.error, marginBottom: 10 }}>{clockInError}</Text> : null}
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary, width: 180, marginBottom: 10 }]} onPress={handleClockInOut}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>{clockedIn ? (onLunch ? 'End Lunch' : 'Clock Out') : 'Clock In'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // --- VIEW TASKS TAB ---
        <View style={{ flex: 1 }}>
          {!showEmployeeTasksPage ? (
            <>
              <Text style={{ fontSize: 22, fontWeight: 'bold', color: theme.primary, marginBottom: 12 }}>Select Employee</Text>
              <FlatList
                data={employees}
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
              <TouchableOpacity style={{ marginBottom: 10 }} onPress={() => setShowEmployeeTasksPage(false)}>
                <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{'< Back to Employees'}</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: theme.primary, marginBottom: 8 }}>{selectedEmployee?.name}'s Tasks</Text>
              <FlatList
                data={tasks.filter(t => t.assigned_to === selectedEmployee?.id)}
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
                  </TouchableOpacity>
                )}
              />
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
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.accent, marginTop: 8, paddingVertical: 10 }]} onPress={() => handleCompleteTask(selectedTask.id)}>
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
  fullPageOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: 'center', alignItems: 'center' },
  fullPageContent: { flex: 1, width: '100%', padding: 24, justifyContent: 'flex-start', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 },
  // --- MaterialDropdown component ---
  dropdown: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 8, backgroundColor: '#f5faff', marginBottom: 6 },
  dropdownList: { borderWidth: 1, borderColor: '#bbb', borderRadius: 6, backgroundColor: '#fff', marginBottom: 6 },
  // --- End MaterialDropdown component ---
});
