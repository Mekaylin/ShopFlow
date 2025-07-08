import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

// Demo employees (no login code needed)
interface Employee {
  id: string;
  name: string;
}
const employees: Employee[] = [
  { id: 'e1', name: 'Alex Johnson' },
  { id: 'e2', name: 'Maria Lopez' },
  { id: 'e3', name: 'Sam Patel' },
];

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
  completedAt?: string; // ISO string
  assignedTo: string;
  materialsUsed?: { materialId: string; quantity: number }[];
}
const initialTasks: Task[] = [
  { id: '1', name: 'Replace windshield', start: '8:00', deadline: '10:00', completed: false, assignedTo: 'Alex Johnson', materialsUsed: [] },
  { id: '2', name: 'Paint bumper', start: '10:15', deadline: '12:00', completed: false, assignedTo: 'Maria Lopez', materialsUsed: [] },
  { id: '3', name: 'Oil change', start: '13:00', deadline: '14:00', completed: false, assignedTo: 'Sam Patel', materialsUsed: [] },
];

// Removed auto-logout for all-day running app
// const AUTO_LOGOUT_MS = 2 * 60 * 1000; // 2 minutes

interface EmployeeDashboardScreenProps {
  onLogout: () => void;
  employee: any;
  business: any;
}

export default function EmployeeDashboardScreen({ onLogout, employee, business }: EmployeeDashboardScreenProps) {
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const isDark = darkMode;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoggedIn, setBiometricLoggedIn] = useState(false);
  const [clockEvents, setClockEvents] = useState<any[]>([]);
  const [clockedIn, setClockedIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [codePromptVisible, setCodePromptVisible] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [showEmployeeTasksPage, setShowEmployeeTasksPage] = useState(false);
  const [employeeTasksName, setEmployeeTasksName] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials); // get from admin
  // taskMaterials: { [taskId]: { materialId, quantity }[] }
  const [taskMaterials, setTaskMaterials] = useState<{ [taskId: string]: { materialId: string; quantity: string }[] }>({});
  // Animation state
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeAnim = useRef(new Animated.Value(0)).current;

  // Check for biometric support on mount
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricSupported(compatible);
    })();
  }, []);

  // Fetch clock events for this employee
  useEffect(() => {
    async function fetchClockEvents() {
      if (!employee?.id || !business?.id) return;
      const { data, error } = await supabase
        .from('clock_events')
        .select('*')
        .eq('employee_id', employee.id)
        .eq('business_id', business.id)
        .order('clock_in', { ascending: false });
      if (!error && data) setClockEvents(data);
      // Set clockedIn state if there is an open event
      setClockedIn(data && data.length > 0 && !data[0].clock_out);
    }
    fetchClockEvents();
  }, [employee?.id, business?.id]);

  // Biometric login handler
  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate with fingerprint' });
    if (result.success) {
      setBiometricLoggedIn(true);
      Alert.alert('Success', 'Fingerprint authentication successful!');
      handleClockAction();
    } else {
      setBiometricLoggedIn(false);
      Alert.alert('Failed', 'Fingerprint authentication failed.');
    }
  };
  const handleBiometricLogout = () => {
    setBiometricLoggedIn(false);
    Alert.alert('Logged out', 'Fingerprint session ended.');
  };
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [onLunch, setOnLunch] = useState(false);

  // Helper to get current time as HH:mm
  function getCurrentTime() {
    const now = new Date();
    return now.toTimeString().slice(0,5);
  }

  // Determine next action based on time and state
  function getNextClockAction() {
    const now = getCurrentTime();
    if (!clockedIn) return 'in';
    if (!onLunch && now >= lunchStart && now < lunchEnd) return 'lunch';
    if (onLunch && now >= lunchEnd) return 'lunchBack';
    if (clockedIn && now >= workEnd) return 'out';
    return 'out';
  }

  // Prompt for code or fingerprint on clock in/out
  const handleClockInOutPress = () => {
    setCodePromptVisible(true);
    setEnteredCode('');
  };

  // Handle clock action (in, lunch, lunchBack, out)
  const handleClockAction = () => {
    const action = getNextClockAction();
    if (action === 'in') {
      setClockedIn(true);
      setOnLunch(false);
      setShowWelcome(true);
      Animated.timing(welcomeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(welcomeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }).start(() => setShowWelcome(false));
        }, 1800);
      });
      Alert.alert('Clocked In', 'You are clocked in.');
    } else if (action === 'lunch') {
      setOnLunch(true);
      Alert.alert('Lunch Break', 'You are clocked out for lunch.');
    } else if (action === 'lunchBack') {
      setOnLunch(false);
      Alert.alert('Back from Lunch', 'You are clocked in from lunch.');
    } else if (action === 'out') {
      setClockedIn(false);
      setOnLunch(false);
      Alert.alert('Clocked Out', 'You have clocked out for the day.');
    }
    setCodePromptVisible(false);
  };

  // For clock in/out, use a shared code (e.g., 'emp123')
  const handleCodeSubmit = () => {
    if (enteredCode.trim() !== 'emp123') {
      Alert.alert('Invalid Code', 'Please enter the correct code to clock in/out.');
      return;
    }
    handleClockAction();
  };

  // Remove selectedEmployee modal and use full page view instead
  // Modal for viewing all employees
  const openEmployeeTasks = (employeeName: string) => {
    setEmployeeTasksName(employeeName);
    setShowEmployeeTasksPage(true);
    setModalVisible(false);
  };
  const closeEmployeeTasks = () => {
    setShowEmployeeTasksPage(false);
    setEmployeeTasksName(null);
  };

  // Render tasks for a specific employee
  const handleSaveMaterials = (taskId: string) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id !== taskId) return t;
      // Save materialsUsed as numbers
      return {
        ...t,
        materialsUsed: (taskMaterials[taskId] || [])
          .filter(m => m.quantity && !isNaN(Number(m.quantity)))
          .map(m => ({ materialId: m.materialId, quantity: Number(m.quantity) })),
      };
    }));
    Alert.alert('Saved', 'Materials used have been saved for this task.');
  };

  const handleCompleteTask = (taskId: string) => {
    Alert.alert(
      'Are you sure?',
      'Mark this task as completed? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, Complete', style: 'destructive', onPress: () => {
            setTasks(prevTasks => prevTasks.map(t => {
              if (t.id !== taskId) return t;
              return {
                ...t,
                completed: true,
                completedAt: new Date().toISOString(),
                materialsUsed: (taskMaterials[taskId] || [])
                  .filter(m => m.quantity && !isNaN(Number(m.quantity)))
                  .map(m => ({ materialId: m.materialId, quantity: Number(m.quantity) })),
              };
            }));
            Alert.alert('Task Completed', 'Task marked as complete.');
          }
        }
      ]
    );
  };

  const renderEmployeeTasks = (employeeName: string) => {
    const empTasks = tasks.filter(t => t.assignedTo === employeeName);
    return (
      <View style={styles.empTaskList}>
        {empTasks.length === 0 ? <Text style={styles.noTask}>No tasks assigned.</Text> :
          empTasks.map(task => (
            <TouchableOpacity
              key={task.id}
              style={[styles.task, task.completed && styles.taskCompleted]}
              onPress={() => setSelectedTask(task)}
            >
              <Text style={styles.taskName}>{task.name}</Text>
              <Text style={styles.taskTime}>Start: {task.start} | Due: {task.deadline}</Text>
              <Text style={styles.taskStatus}>{task.completed ? 'Completed' : 'In Progress'}</Text>
              {task.completed && task.completedAt && (
                <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(task.completedAt).toLocaleString()}</Text>
              )}
              {task.completed && task.materialsUsed && task.materialsUsed.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Materials Used:</Text>
                  {task.materialsUsed.map(mu => {
                    const mat = materials.find(m => m.id === mu.materialId);
                    if (!mat) return null;
                    return (
                      <Text key={mat.id} style={{ fontSize: 14 }}>{mat.name}: {mu.quantity} {mat.unit}</Text>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          ))}
      </View>
    );
  };

  // Modal for a specific task (materials + complete)
  const renderTaskModal = () => {
    if (!selectedTask) return null;
    const task = tasks.find(t => t.id === selectedTask.id);
    if (!task) return null;
    return (
      <Modal
        visible={!!selectedTask}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedTask(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}> 
            <Text style={styles.modalTitle}>{task.name}</Text>
            <Text style={styles.taskTime}>Start: {task.start} | Due: {task.deadline}</Text>
            <Text style={styles.taskStatus}>{task.completed ? 'Completed' : 'In Progress'}</Text>
            {task.completed && task.completedAt && (
              <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(task.completedAt).toLocaleString()}</Text>
            )}
            {!task.completed && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Materials Used:</Text>
                {materials.map(mat => (
                  <View key={mat.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>{mat.name} ({mat.unit}):</Text>
                    <TextInput
                      style={{ borderWidth: 1, borderColor: '#bbb', borderRadius: 6, padding: 6, width: 60, marginLeft: 8, backgroundColor: '#fff' }}
                      placeholder="0"
                      keyboardType="numeric"
                      value={taskMaterials[task.id]?.find(m => m.materialId === mat.id)?.quantity || ''}
                      onChangeText={val => {
                        setTaskMaterials(prev => {
                          const prevArr = prev[task.id] || [];
                          const filtered = prevArr.filter(m => m.materialId !== mat.id);
                          return {
                            ...prev,
                            [task.id]: [...filtered, { materialId: mat.id, quantity: val }],
                          };
                        });
                      }}
                    />
                  </View>
                ))}
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1976d2', marginTop: 8, paddingVertical: 10 }]} onPress={() => handleSaveMaterials(task.id)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Save Materials</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#388e3c', marginTop: 8, paddingVertical: 10 }]} onPress={() => handleCompleteTask(task.id)}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Mark Complete</Text>
                </TouchableOpacity>
              </View>
            )}
            {task.completed && task.materialsUsed && task.materialsUsed.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Materials Used:</Text>
                {task.materialsUsed.map(mu => {
                  const mat = materials.find(m => m.id === mu.materialId);
                  if (!mat) return null;
                  return (
                    <Text key={mat.id} style={{ fontSize: 14 }}>{mat.name}: {mu.quantity} {mat.unit}</Text>
                  );
                })}
              </View>
            )}
            <TouchableOpacity style={[styles.closeBtn, { marginTop: 18 }]} onPress={() => setSelectedTask(null)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Theme colors
  const theme = {
    background: isDark ? '#181C24' : '#f8fafd',
    card: isDark ? '#232A36' : '#fff',
    primary: '#1976d2',
    accent: '#388e3c',
    error: '#c62828',
    text: isDark ? '#fff' : '#1a237e',
    subtext: isDark ? '#b0b8c1' : '#263238',
    border: isDark ? '#2c3440' : '#eee',
    shadow: isDark ? '#000' : '#b0b8c1',
  };

  // Handle clock in
  const handleClockIn = async () => {
    if (!employee?.id || !business?.id) return;
    const { data, error } = await supabase
      .from('clock_events')
      .insert({
        employee_id: employee.id,
        business_id: business.id,
        clock_in: new Date().toISOString(),
        clock_out: null,
      })
      .select('*')
      .single();
    if (!error && data) {
      setClockEvents([data, ...clockEvents]);
      setClockedIn(true);
    }
  };

  // Handle clock out
  const handleClockOut = async () => {
    if (!employee?.id || !business?.id) return;
    // Find latest open event
    const openEvent = clockEvents.find(e => !e.clock_out);
    if (!openEvent) return;
    const { data, error } = await supabase
      .from('clock_events')
      .update({ clock_out: new Date().toISOString() })
      .eq('id', openEvent.id)
      .select('*')
      .single();
    if (!error && data) {
      setClockEvents(clockEvents.map(e => e.id === openEvent.id ? data : e));
      setClockedIn(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 16 }]}> 
      {/* Top bar with title and settings icon */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Text style={[styles.title, { color: theme.text, flex: 1 }]}>Employee Dashboard</Text>
        <TouchableOpacity onPress={() => setSettingsVisible(true)} style={{ position: 'absolute', right: 0, padding: 8 }}>
          <FontAwesome5 name="cog" size={28} color={isDark ? '#b3c0e0' : '#1976d2'} />
        </TouchableOpacity>
      </View>
      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: isDark ? '#23263a' : '#fff', borderRadius: 16, padding: 28, width: '90%' }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: isDark ? '#b3c0e0' : '#1976d2', marginBottom: 18 }}>Settings</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 17, color: isDark ? '#b3c0e0' : '#263238', flex: 1 }}>Dark Mode</Text>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                thumbColor={darkMode ? '#1976d2' : '#fff'}
                trackColor={{ false: '#ccc', true: '#1976d2' }}
              />
            </View>
            {biometricSupported && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                <Text style={{ fontSize: 17, color: isDark ? '#b3c0e0' : '#263238', flex: 1 }}>Fingerprint Login</Text>
                <Switch
                  value={biometricEnabled}
                  onValueChange={setBiometricEnabled}
                  thumbColor={biometricEnabled ? '#388e3c' : '#fff'}
                  trackColor={{ false: '#ccc', true: '#388e3c' }}
                />
              </View>
            )}
            {biometricEnabled && !biometricLoggedIn && (
              <TouchableOpacity style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 12, marginBottom: 10 }} onPress={handleBiometricLogin}>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Login with Fingerprint</Text>
              </TouchableOpacity>
            )}
            {biometricEnabled && biometricLoggedIn && (
              <TouchableOpacity style={{ backgroundColor: '#c62828', borderRadius: 8, padding: 12, marginBottom: 10 }} onPress={handleBiometricLogout}>
                <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Logout (Fingerprint)</Text>
              </TouchableOpacity>
            )}
            <View style={{ marginBottom: 18 }}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: isDark ? '#b3c0e0' : '#1976d2', marginBottom: 6 }}>Working Hours</Text>
              <Text style={{ color: isDark ? '#b3c0e0' : '#263238', marginBottom: 2 }}>Start: {workStart}  End: {workEnd}</Text>
              <Text style={{ color: isDark ? '#b3c0e0' : '#263238' }}>Lunch: {lunchStart} - {lunchEnd}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 17, color: isDark ? '#b3c0e0' : '#263238', flex: 1 }}>Enable Notifications</Text>
              <Switch value={true} onValueChange={() => {}} thumbColor={'#1976d2'} trackColor={{ false: '#ccc', true: '#1976d2' }} disabled />
              <Text style={{ color: '#888', fontSize: 12, marginLeft: 6 }}>(Admin controlled)</Text>
            </View>
            <View style={{ marginBottom: 8 }}>
              <Text style={{ color: '#888', fontSize: 13 }}>App Version: 1.0.0</Text>
            </View>
            <TouchableOpacity style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 14, marginTop: 10 }} onPress={() => setSettingsVisible(false)}>
              <Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Welcome Animation */}
      {showWelcome && (
        <Animated.View style={{
          position: 'absolute',
          top: '30%',
          left: 0,
          right: 0,
          alignItems: 'center',
          opacity: welcomeAnim,
          transform: [{ scale: welcomeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          zIndex: 100,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 18, padding: 32, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16, elevation: 8, alignItems: 'center' }}>
            <FontAwesome5 name="smile-beam" size={60} color="#388e3c" style={{ marginBottom: 16 }} />
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1976d2', marginBottom: 8 }}>Welcome{currentEmployee?.name ? `, ${currentEmployee.name}` : ''}!</Text>
            <Text style={{ fontSize: 18, color: '#333' }}>Have a great shift!</Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.buttonCol}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: clockedIn ? theme.error : theme.accent, shadowColor: theme.shadow }]}
          onPress={clockedIn ? handleClockOut : handleClockIn}
        >
          <MaterialIcons name={clockedIn ? 'logout' : 'login'} size={40} color="#fff" style={{ marginBottom: 10 }} />
          <Text style={styles.actionBtnText}>{clockedIn ? 'Clock Out' : 'Clock In'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary, marginTop: 28, shadowColor: theme.shadow }]}
          onPress={() => setModalVisible(true)}
        >
          <FontAwesome5 name="tasks" size={36} color="#fff" style={{ marginBottom: 10 }} />
          <Text style={styles.actionBtnText}>View Tasks &gt;</Text>
        </TouchableOpacity>
      </View>
      {/* Code prompt modal */}
      <Modal
        visible={codePromptVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setCodePromptVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.codeModalContent}>
            <Text style={styles.modalTitle}>Enter Your Employee Code</Text>
            <TextInput
              style={styles.codeInput}
              placeholder="Employee code"
              value={enteredCode}
              onChangeText={setEnteredCode}
              secureTextEntry
              autoFocus
            />
            {biometricSupported && biometricEnabled && (
              <TouchableOpacity style={{ marginTop: 16, backgroundColor: '#1976d2', borderRadius: 8, padding: 12, alignItems: 'center' }} onPress={async () => { const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate with fingerprint' }); if (result.success) { setBiometricLoggedIn(true); Alert.alert('Success', 'Fingerprint authentication successful!'); handleClockAction(); } else { setBiometricLoggedIn(false); Alert.alert('Failed', 'Fingerprint authentication failed.'); } }}>
                <FontAwesome5 name="fingerprint" size={28} color="#fff" style={{ marginBottom: 4 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Login with Fingerprint</Text>
              </TouchableOpacity>
            )}
            <View style={styles.codeBtnRow}>
              <TouchableOpacity style={styles.codeBtn} onPress={() => setCodePromptVisible(false)}>
                <Text style={styles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.codeBtn} onPress={handleCodeSubmit}>
                <Text style={styles.closeBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* Modal for all employees */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>All Employees</Text>
            <FlatList
              data={employees}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.employeeBlock} onPress={() => openEmployeeTasks(item.name)}>
                  <Text style={styles.employeeName}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Full page for selected employee's tasks */}
      {showEmployeeTasksPage && employeeTasksName && (
        <View style={[styles.fullPageOverlay, { backgroundColor: theme.background }]}> 
          <View style={[styles.fullPageContent, { backgroundColor: theme.card, borderRadius: 18, shadowColor: theme.shadow, shadowOpacity: 0.18, shadowRadius: 12, elevation: 8 }]}> 
            <Text style={[styles.modalTitle, { color: theme.primary }]}>{employeeTasksName}&apos;s Tasks</Text>
            <ScrollView>{renderEmployeeTasks(employeeTasksName)}</ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.primary }]} onPress={closeEmployeeTasks}>
              <Text style={styles.closeBtnText}>Back</Text>
            </TouchableOpacity>
          </View>
          {renderTaskModal()}
        </View>
      )}
    {/* Logout button for employee */}
    <TouchableOpacity style={styles.closeBtn} onPress={onLogout}>
      <Text style={styles.closeBtnText}>Logout</Text>
    </TouchableOpacity>
  </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
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
