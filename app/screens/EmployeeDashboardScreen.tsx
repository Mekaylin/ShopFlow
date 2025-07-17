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

function EmployeeDashboardScreen({ onLogout, user: passedUser }: EmployeeDashboardScreenProps) {
  // Business code entry state
  const [businessCode, setBusinessCode] = useState('');
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [businessCodeError, setBusinessCodeError] = useState('');
  const [businessIdError, setBusinessIdError] = useState('');
  const [user, setUser] = useState<any | null>(passedUser || null);
  // Notification panel state
  const [notificationPanelVisible, setNotificationPanelVisible] = useState(false);
  // Notifications: show clock events as notifications (demo)
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const colorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState(colorScheme === 'dark');
  const isDark = darkMode;
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoggedIn, setBiometricLoggedIn] = useState(false);

  // Check for biometric support on mount
  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setBiometricSupported(compatible);
    })();
  }, []);

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
  const [clockedIn, setClockedIn] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // Shared-tablet state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [codePromptVisible, setCodePromptVisible] = useState(false);
  const [enteredCode, setEnteredCode] = useState('');
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  // Fetch employees for the current business when businessId is set
  // On mount, check if businessId is stored in AsyncStorage or set from admin user
  useEffect(() => {
    if (passedUser) {
      // If admin, set businessId and currentEmployee for bypass
      if (passedUser.role === 'admin' && passedUser.business_id) {
        setBusinessId(passedUser.business_id);
        setCurrentEmployee({
          id: 'admin',
          name: passedUser.name || 'Admin',
          code: '',
          business_id: passedUser.business_id,
        });
        return;
      }
      // If employee, set businessId but do not bypass selection
      if (passedUser.role === 'employee' && passedUser.business_id) {
        setBusinessId(passedUser.business_id);
      }
      setUser(passedUser);
      return;
    }
    // Fallback: fetch user as before
    const businessIdTimeoutRef = { current: null as any };
    (async () => {
      try {
        // Fetch current user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError || !authUser) {
          setBusinessIdError('No authenticated user. Please log in again.');
          return;
        }
        setUser(authUser);
        // Fetch user record from users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        if (userError || !userRecord) {
          setBusinessIdError('User not found. Please log in again.');
          return;
        }
        // If admin, set businessId from user record
        if (userRecord.role === 'admin' && userRecord.business_id) {
          setBusinessId(userRecord.business_id);
          await AsyncStorage.setItem('business_id', userRecord.business_id);
          setCurrentEmployee({
            id: 'admin',
            name: userRecord.name || 'Admin',
            code: '',
            business_id: userRecord.business_id,
          });
          return;
        }
        // Otherwise, check AsyncStorage as before
        const stored = await AsyncStorage.getItem('business_id');
        if (stored) setBusinessId(stored);
        else setBusinessIdError('No business ID found. Please log in again.');
      } catch (err) {
        console.error('[EmployeeDashboard] Error loading business_id from AsyncStorage or user:', err);
        setBusinessIdError('Error loading business ID.');
      }
    })();
    // Add a timeout failsafe: if businessId is not set after 5 seconds, show error
    businessIdTimeoutRef.current = setTimeout(() => {
      setBusinessIdError('Business ID not found. Please log in again.');
    }, 5000);
    return () => {
      if (businessIdTimeoutRef.current) clearTimeout(businessIdTimeoutRef.current);
    };
  }, [passedUser]);

  useEffect(() => {
    if (!businessId) return;
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        let query = supabase.from('employees').select('id, name, code, business_id');
        query = query.eq('business_id', businessId);
        const { data, error } = await query;
        if (error) {
          console.error('Error fetching employees:', error);
          Alert.alert('Error', 'Could not fetch employees. Please check your connection.');
        }
        if (data) {
          setEmployees(data);
        }
      } catch (e) {
        console.error('Unexpected error fetching employees:', e);
        Alert.alert('Error', 'Unexpected error fetching employees.');
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, [businessId]);

  // Handler for business code submit (unchanged)
  const handleBusinessCodeSubmit = async () => {
    setBusinessCodeError('');
    if (!businessCode.trim()) {
      setBusinessCodeError('Please enter a business code.');
      return;
    }
    // Look up business by code
    try {
      const { data, error } = await supabase.from('businesses').select('id').eq('code', businessCode.trim()).single();
      if (error || !data) {
        setBusinessCodeError('Invalid business code.');
        return;
      }
      setBusinessId(data.id);
      await AsyncStorage.setItem('business_id', data.id);
    } catch (e) {
      setBusinessCodeError('Error verifying business code.');
    }
  };
  const [showEmployeeTasksPage, setShowEmployeeTasksPage] = useState(false);
  const [employeeTasksId, setEmployeeTasksId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [materials, setMaterials] = useState<Material[]>(initialMaterials); // get from admin
  // taskMaterials: { [taskId]: { materialId, quantity }[] }
  const [taskMaterials, setTaskMaterials] = useState<{ [taskId: string]: { materialId: string; quantity: string }[] }>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Animation state
  const [showWelcome, setShowWelcome] = useState(false);
  const welcomeAnim = useRef(new Animated.Value(0)).current;

  // Removed auto-logout logic for all-day running app
  const userAction = (fn: () => void) => fn;

  // Working hours and lunch times (should be fetched from admin, here as demo)
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('12:30');
  // Auto-detect clock action
  const [lastAction, setLastAction] = useState<'in' | 'lunch' | 'lunchBack' | 'out' | null>(null);
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
  const handleClockInOutPress = userAction(() => {
    setCodePromptVisible(true);
    setEnteredCode('');
  });

  // Log clock event to the database, with offline queue, and add notification
  const logClockEvent = async (action: 'in' | 'out' | 'lunch' | 'lunchBack') => {
    if (!currentEmployee) {
      console.error('logClockEvent: No currentEmployee set');
      Alert.alert('Error', 'No employee selected for clock event.');
      return;
    }
    const event = {
      employee_id: currentEmployee.id,
      business_id: currentEmployee.business_id,
      action,
      timestamp: new Date().toISOString(),
    };
    try {
      const { error } = await supabase.from('clock_events').insert(event);
      if (error) {
        console.error('logClockEvent: Supabase insert error:', error);
        await queueClockEvent(event);
        Alert.alert('Offline', 'Clock event saved locally and will sync when online.');
      } else {
        await syncClockEvents();
      }
    } catch (err) {
      console.error('logClockEvent: Exception during insert:', err);
      await queueClockEvent(event);
      Alert.alert('Offline', 'Clock event saved locally and will sync when online.');
    }
    // Add notification (demo)
    setNotifications(prev => [
      {
        id: Math.random().toString(36).slice(2),
        message: `Clock ${action === 'in' ? 'In' : action === 'out' ? 'Out' : action === 'lunch' ? 'Lunch Start' : 'Lunch End'} for ${currentEmployee.name}`,
        timestamp: new Date().toISOString(),
        type: action === 'in' || action === 'out' ? 'info' : 'late',
      },
      ...prev.slice(0, 19), // keep max 20
    ]);
  };
  // On mount, try to sync any offline clock events
  useEffect(() => {
    syncClockEvents();
  }, []);

  // Handle clock action (in, lunch, lunchBack, out) and log event
  const handleClockAction = async () => {
    try {
      const action = getNextClockAction();
      setLastAction(action);
      if (action === 'in') {
        setClockedIn(true);
        setOnLunch(false);
        setShowWelcome(true);
        Animated.timing(welcomeAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }).start(() => {
          setTimeout(() => {
            Animated.timing(welcomeAnim, {
              toValue: 0,
              duration: 500,
              useNativeDriver: true,
            }).start(() => setShowWelcome(false));
          }, 1800);
        });
        Alert.alert('Clocked In', 'You are clocked in.');
        await logClockEvent('in');
      } else if (action === 'lunch') {
        setOnLunch(true);
        Alert.alert('Lunch Break', 'You are clocked out for lunch.');
        await logClockEvent('lunch');
      } else if (action === 'lunchBack') {
        setOnLunch(false);
        Alert.alert('Back from Lunch', 'You are clocked in from lunch.');
        await logClockEvent('lunchBack');
      } else if (action === 'out') {
        setClockedIn(false);
        setOnLunch(false);
        Alert.alert('Clocked Out', 'You have clocked out for the day.');
        await logClockEvent('out');
      }
      setCodePromptVisible(false);
    } catch (err) {
      console.error('handleClockAction: Exception:', err);
      Alert.alert('Error', 'An error occurred during clock action.');
    }
  };

  // For clock in/out, use the selected employee's code
  const handleCodeSubmit = async () => {
    if (!selectedEmployee) {
      Alert.alert('Error', 'No employee selected.');
      return;
    }
    if (enteredCode.trim() !== selectedEmployee.code) {
      Alert.alert('Invalid Code', 'Please enter the correct code to continue.');
      return;
    }
    setCurrentEmployee(selectedEmployee);
    setCodePromptVisible(false);
    setEnteredCode('');
    // Optionally, reset clockedIn state here if you want a fresh session
  };

  // Remove selectedEmployee modal and use full page view instead
  // Modal for viewing all employees
  const openEmployeeTasks = (employeeId: string) => {
    setEmployeeTasksId(employeeId);
    setShowEmployeeTasksPage(true);
    setModalVisible(false);
  };
  const closeEmployeeTasks = () => {
    setShowEmployeeTasksPage(false);
    setEmployeeTasksId(null);
  };

  // Render tasks for a specific employee
  const handleSaveMaterials = (taskId: string) => {
    setTasks(prevTasks => prevTasks.map(t => {
      if (t.id !== taskId) return t;
      // Save materials_used as numbers
      return {
        ...t,
        materials_used: (taskMaterials[taskId] || [])
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
                completed_at: new Date().toISOString(),
                materials_used: (taskMaterials[taskId] || [])
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
    const empTasks = tasks.filter(t => t.assigned_to === employeeName);
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
            {task.completed && task.completed_at && (
              <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(task.completed_at).toLocaleString()}</Text>
            )}
            {task.completed && task.materials_used && task.materials_used.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Materials Used:</Text>
                {task.materials_used.map(mu => {
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
            {task.completed && task.completed_at && (
              <Text style={{ color: '#888', fontSize: 13, marginBottom: 4 }}>Completed at: {new Date(task.completed_at).toLocaleString()}</Text>
            )}
            {!task.completed && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Materials Used:</Text>
                {materials.map(mat => (
                  <View key={mat.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ flex: 1 }}>{mat.name} ({mat.unit}):</Text>
                    <TextInput
                      accessibilityLabel="Employee Code Entry"
                      testID="employee-code-entry-input"
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
            {task.completed && task.materials_used && task.materials_used.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontWeight: 'bold', marginBottom: 2 }}>Materials Used:</Text>
                {task.materials_used.map(mu => {
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

  // Business code entry screen
  if (!businessId) {
    return (
      <View style={[styles.container, { backgroundColor: '#f8fafd', justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1976d2', textAlign: 'center', marginBottom: 18 }}>Enter Business Code</Text>
        <TextInput
          accessibilityLabel="Employee Dashboard Search"
          testID="employee-dashboard-search-input"
          style={[styles.codeInput, { marginBottom: 10, width: 260 }]}
          placeholder="Business code"
          value={businessCode}
          onChangeText={setBusinessCode}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {businessCodeError ? <Text style={{ color: '#c62828', marginBottom: 10 }}>{businessCodeError}</Text> : null}
        <TouchableOpacity style={[styles.codeBtn, { width: 120, marginBottom: 20 }]} onPress={handleBusinessCodeSubmit}>
          <Text style={styles.closeBtnText}>Submit</Text>
        </TouchableOpacity>
        {/* Optionally, allow admin to log in or go back */}
      </View>
    );
  }

  // Shared-tablet flow: If no employee is selected, show employee picker
  if (!currentEmployee) {
    return (
      <View style={[styles.container, { backgroundColor: '#f8fafd', justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#1976d2', textAlign: 'center', marginBottom: 8 }}>Select Your Name</Text>
        {loadingEmployees ? (
          <ActivityIndicator size="large" color="#1976d2" />
        ) : (
          <FlatList
            data={employees}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.employeeBlock, { minWidth: 220, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, marginBottom: 18, padding: 18, borderWidth: 1, borderColor: '#e3e3e3' }]}
                onPress={() => { setSelectedEmployee(item); setCodePromptVisible(true); }}
              >
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2' }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
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
                accessibilityLabel="Employee Dashboard Task Input"
                testID="employee-dashboard-task-input"
                style={styles.codeInput}
                placeholder="Employee code"
                value={enteredCode}
                onChangeText={setEnteredCode}
                secureTextEntry
                autoFocus
              />
              <View style={styles.codeBtnRow}>
                <TouchableOpacity style={styles.codeBtn} onPress={() => { setCodePromptVisible(false); setEnteredCode(''); setSelectedEmployee(null); }}>
                  <Text style={styles.closeBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.codeBtn} onPress={handleCodeSubmit}>
                  <Text style={styles.closeBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
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

  // After successful code entry, show the dashboard for the current employee
  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + 16, paddingHorizontal: 8 }]}> 
      {/* ...existing dashboard code... */}
    </View>
  );
}

export default EmployeeDashboardScreen;

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
