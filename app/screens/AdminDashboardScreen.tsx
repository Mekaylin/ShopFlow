import { FontAwesome5 } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import ClockEventsTab from '../../components/admin/ClockEventsTab';
import EmployeesTab from '../../components/admin/EmployeesTab';
import ExportModal from '../../components/admin/ExportModal';
import HomeTab from '../../components/admin/HomeTab';
import MaterialsTab from '../../components/admin/MaterialsTab';
import PerformanceTab from '../../components/admin/PerformanceTab';
import SettingsModal from '../../components/admin/SettingsModal';
import TasksTab from '../../components/admin/TasksTab';
import PerformanceManagement from '../../components/PerformanceManagement';
import TaskRatingModal from '../../components/TaskRatingModal';
import { adminStyles, tabButton, tabButtonText } from '../../components/utility/styles';

import type { Business, ClockEvent, Employee, Material, MaterialType, PerformanceSettings, Task, User } from '../../components/utility/types';
import { supabase } from '../../lib/supabase';
// Simple error boundary for dashboard
class DashboardErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    console.error('Dashboard error boundary caught:', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
          <FontAwesome5 name="exclamation-triangle" size={48} color="#c62828" style={{ marginBottom: 18 }} />
          <Text style={{ fontSize: 20, color: '#c62828', marginBottom: 12 }}>Something went wrong.</Text>
          <Text style={{ color: '#c62828', marginBottom: 12 }}>{String(this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}


interface AdminDashboardScreenProps {
  onLogout: () => void;
  user: User | Business;
}


function getBusinessId(user: User | Business): string | undefined {
  if (!user) return undefined;
  if ('business_id' in user && typeof user.business_id === 'string') return user.business_id;
  if ('id' in user && typeof user.id === 'string') return user.id;
  return undefined;
}

function isUser(obj: any): obj is User {
  return obj && typeof obj === 'object' && 'business_id' in obj && 'email' in obj && 'role' in obj;
}

function isBusiness(obj: any): obj is Business {
  return obj && typeof obj === 'object' && 'name' in obj && 'code' in obj && 'created_at' in obj;
}

function AdminDashboardScreen({ onLogout, user }: AdminDashboardScreenProps) {
  // Always use utility for businessId extraction
  const businessId = getBusinessId(user);

  // Fingerprint auth state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoggedIn, setBiometricLoggedIn] = useState(false);

  // Biometric login handler (future: call this on login attempt)
  const handleBiometricLogin = async () => {
    if (!biometricEnabled) return;
    const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Authenticate to access admin dashboard' });
    if (result.success) setBiometricLoggedIn(true);
    else setBiometricLoggedIn(false);
  };

  // Check for biometric support on mount
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnabled(hasHardware && isEnrolled);
    })();
  }, []);



  // Dark mode and settings modal state
  const [darkMode, setDarkMode] = useState(false); // Prepare for toggle
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  // Shared styles for modal overlays and tab bar (future: move to styles file)
  // TODO: Move to global styles file for reuse across screens
  const sharedStyles = {
    tabBar: {
      flexDirection: "row" as const,
      marginBottom: 16,
      marginTop: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    tabButton: (active: boolean, dark: boolean) => ({
      flex: 1,
      paddingVertical: 8,
      backgroundColor: active ? (dark ? '#222b45' : '#1976d2') : (dark ? '#333950' : '#e3f2fd'),
      borderRadius: 8,
      marginHorizontal: 2,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'column' as const,
    }),
    tabButtonText: (active: boolean, dark: boolean) => ({
      color: active ? '#fff' : (dark ? '#b3c0e0' : '#1976d2'),
      fontWeight: 'bold' as const,
      textAlign: 'center' as const,
      fontSize: 11,
    }),
  };

  // Tab state
  const [tab, setTab] = useState<'home' | 'employees' | 'tasks' | 'materials' | 'clock' | 'performance'>('home');

  // Main data state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [materialTypes, setMaterialTypes] = useState<Record<string, MaterialType[]>>({});

  // Performance management state
  const [performanceSettings, setPerformanceSettings] = useState<PerformanceSettings>({
    ratingSystemEnabled: false,
    autoRateCompletedTasks: false,
    defaultRating: 3,
  });
  // Removed unused performanceSettingsLoading
  const [showPerformanceManagement, setShowPerformanceManagement] = useState(false);
  const [selectedTaskForRating, setSelectedTaskForRating] = useState<Task | null>(null);

  // Work hours/lunch settings
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('17:00');
  const [lunchStart, setLunchStart] = useState('12:00');
  const [lunchEnd, setLunchEnd] = useState('12:30');

  // Notification state
  const [lateThreshold, setLateThreshold] = useState(15);
  const [lateTaskNotifiedIds, setLateTaskNotifiedIds] = useState<string[]>([]);

  // Export modal state
  const [exportModalVisible, setExportModalVisible] = useState(false);

  // Initial loading state
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch all initial data in parallel
  useEffect(() => {
    if (!businessId) {
      Alert.alert('Error', 'No business ID found. Please log in again or contact support.');
      setInitialLoading(false);
      return;
    }
    let isMounted = true;
    async function fetchAllInitialData() {
      setInitialLoading(true);
      try {
        const [empRes, taskRes, matRes, deptRes, perfRes, clockRes] = await Promise.all([
          supabase.from('employees').select('*').eq('business_id', businessId),
          supabase.from('tasks').select('*').eq('business_id', businessId),
          supabase.from('materials').select('*').eq('business_id', businessId),
          supabase.from('departments').select('name').eq('business_id', businessId),
          supabase.from('performance_settings').select('*').eq('business_id', businessId).single(),
          supabase.from('clock_events').select('*').eq('business_id', businessId).order('clock_in', { ascending: false }),
        ]);
        if (!isMounted) return;
        if (empRes.error) throw empRes.error;
        if (taskRes.error) throw taskRes.error;
        if (matRes.error) throw matRes.error;
        if (deptRes.error) throw deptRes.error;
        if (perfRes.error) throw perfRes.error;
        if (clockRes.error) throw clockRes.error;
        setEmployees(empRes.data ?? []);
        setTasks(taskRes.data ?? []);
        setMaterials(matRes.data ?? []);
        setDepartments(deptRes.data ? deptRes.data.map((d: any) => d.name) : []);
        setPerformanceSettings({
          ratingSystemEnabled: perfRes.data?.rating_system_enabled ?? false,
          autoRateCompletedTasks: perfRes.data?.auto_rate_completed_tasks ?? false,
          defaultRating: perfRes.data?.default_rating ?? 3,
        });
        setClockEvents(clockRes.data ?? []);
      } catch (err: any) {
        Alert.alert('Error', `Failed to load dashboard data: ${err.message || err}`);
        console.error('Error fetching initial data:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }
    fetchAllInitialData();
    return () => { isMounted = false; };
  }, [businessId]);

  // Check for late tasks and show notifications
  // Late task notification cooldown (avoid repeated alerts)
  const [lateTaskAlertCooldown, setLateTaskAlertCooldown] = useState(false);
  // Utility: handle late task notifications
  function notifyLateTasks(tasks: Task[], notifiedIds: string[], setNotified: (cb: (prev: string[]) => string[]) => void, cooldown: boolean, setCooldown: (b: boolean) => void) {
    if (cooldown) return;
    const now = new Date();
    const lateTasks = tasks.filter(t => {
      if (t.completed || notifiedIds.includes(t.id)) return false;
      const deadline = new Date(t.deadline);
      return now > deadline;
    });
    if (lateTasks.length > 0) {
      Alert.alert('Late Tasks', `${lateTasks.length} task(s) are overdue!`);
      setNotified(prev => Array.from(new Set([...prev, ...lateTasks.map(t => t.id)])));
      setCooldown(true);
      setTimeout(() => setCooldown(false), 60000); // 1 min cooldown
    }
  }

  useEffect(() => {
    // TODO: Replace with a more robust notification system (e.g., push notifications)
    notifyLateTasks(tasks, lateTaskNotifiedIds, setLateTaskNotifiedIds, lateTaskAlertCooldown, setLateTaskAlertCooldown);
  }, [tasks, lateTaskNotifiedIds, lateTaskAlertCooldown]);

  // Helper: group clock events by employee (memoized for performance)
  const clockEventsByEmployee = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = clockEvents.filter(ev => ev.employee_id === emp.id);
      return acc;
    }, {} as Record<string, ClockEvent[]>);
  }, [employees, clockEvents]);

  // Tab bar UI
  // Tab bar config for modularity
  const TAB_CONFIG = [
    { name: 'home', icon: 'home', label: 'Home' },
    { name: 'employees', icon: 'users', label: 'Employees' },
    { name: 'tasks', icon: 'tasks', label: 'Tasks' },
    { name: 'materials', icon: 'boxes', label: 'Materials' },
    { name: 'clock', icon: 'clock', label: 'Clock Events' },
    { name: 'performance', icon: 'chart-line', label: 'Performance' },
  ];
  const renderTabBar = () => (
    <View style={adminStyles.tabBar}>
      {TAB_CONFIG.map(tabObj => (
        <TouchableOpacity
          key={tabObj.name}
          style={tabButton(tab === tabObj.name, darkMode) as import('react-native').ViewStyle}
          onPress={() => setTab(tabObj.name as typeof tab)}
        >
          <FontAwesome5
            name={tabObj.icon}
            size={16}
            color={tab === tabObj.name ? '#fff' : (darkMode ? '#b3c0e0' : '#1976d2')}
            style={adminStyles.tabIcon}
          />
          <Text style={tabButtonText(tab === tabObj.name, darkMode) as import('react-native').TextStyle}>
            {tabObj.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Loading spinner
  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <FontAwesome5 name="tools" size={48} color="#1976d2" style={{ marginBottom: 18 }} />
        <Text style={{ fontSize: 20, color: '#1976d2', marginBottom: 12 }}>Loading your dashboard...</Text>
        <ActivityIndicator size="large" color="#1976d2" />
      </View>
    );
  }

  // Main dashboard render with error boundary and Suspense fallback
  return (
    <DashboardErrorBoundary>
      <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff' }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: darkMode ? '#333950' : '#e3f2fd' }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: darkMode ? '#b3c0e0' : '#1976d2' }}>Admin Dashboard</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Dark mode toggle */}
            <TouchableOpacity onPress={() => setDarkMode((d) => !d)} style={{ padding: 8, marginRight: 8 }}>
              <FontAwesome5 name={darkMode ? 'moon' : 'sun'} size={22} color={darkMode ? '#b3c0e0' : '#1976d2'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{ padding: 8 }}>
              <FontAwesome5 name="cog" size={24} color={darkMode ? '#b3c0e0' : '#1976d2'} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Tab Content - Use FlatList for large lists, memoized tab content, and shared styles */}
        <View style={adminStyles.tabContentContainer}>
          <Suspense fallback={<View style={adminStyles.suspenseFallback}><ActivityIndicator size="large" color="#1976d2" /><Text style={adminStyles.suspenseText}>Loading...</Text></View>}>
            {tab === 'home' && isUser(user) && (
              <HomeTab
                user={user}
                employees={employees}
                tasks={tasks}
                materials={materials}
                materialTypes={materialTypes}
                clockEventsByEmployee={clockEventsByEmployee}
                darkMode={darkMode}
                workStart={workStart}
                workEnd={workEnd}
                lunchStart={lunchStart}
                lunchEnd={lunchEnd}
                onExport={(filteredData) => {
                  // If filtered data is provided, you could store it for the export modal
                  // For now, just open the export modal
                  setExportModalVisible(true);
                }}
              />
            )}
            {tab === 'employees' && isUser(user) && (
              <FlatList
                data={employees}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <EmployeesTab
                    user={user}
                    darkMode={darkMode}
                    employees={[item]}
                    setEmployees={setEmployees}
                    departments={departments}
                    setDepartments={setDepartments}
                    biometricEnabled={biometricEnabled}
                    biometricLoggedIn={biometricLoggedIn}
                  />
                )}
                contentContainerStyle={adminStyles.flatListContent}
                ListEmptyComponent={<Text style={adminStyles.emptyListText}>No employees found.</Text>}
              />
            )}
            {tab === 'tasks' && isUser(user) && (
              <FlatList
                data={tasks}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <TasksTab
                    user={user}
                    employees={employees}
                    materials={materials}
                    materialTypes={materialTypes}
                    darkMode={darkMode}
                    performanceSettings={performanceSettings}
                    tasks={[item]}
                    setTasks={setTasks}
                    lateThreshold={lateThreshold}
                    lateTaskNotifiedIds={lateTaskNotifiedIds}
                    setLateTaskNotifiedIds={setLateTaskNotifiedIds}
                    onRateTask={(task) => setSelectedTaskForRating(task)}
                  />
                )}
                contentContainerStyle={adminStyles.flatListContent}
                ListEmptyComponent={<Text style={adminStyles.emptyListText}>No tasks found.</Text>}
              />
            )}
            {tab === 'materials' && isUser(user) && (
              <FlatList
                data={materials}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <MaterialsTab
                    user={user}
                    materials={[item]}
                    setMaterials={setMaterials}
                    materialTypes={materialTypes}
                    setMaterialTypes={setMaterialTypes}
                    darkMode={darkMode}
                  />
                )}
                contentContainerStyle={adminStyles.flatListContent}
                ListEmptyComponent={<Text style={adminStyles.emptyListText}>No materials found.</Text>}
              />
            )}
            {tab === 'clock' && isUser(user) && (
              <FlatList
                data={employees}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <ClockEventsTab
                    user={user}
                    employees={[item]}
                    darkMode={darkMode}
                  />
                )}
                contentContainerStyle={adminStyles.flatListContent}
                ListEmptyComponent={<Text style={adminStyles.emptyListText}>No clock events found.</Text>}
              />
            )}
            {tab === 'performance' && isUser(user) && (
              <PerformanceTab
                user={user}
                employees={employees}
                tasks={tasks}
                performanceSettings={performanceSettings}
                setPerformanceSettings={setPerformanceSettings}
                darkMode={darkMode}
              />
            )}
          </Suspense>
        </View>


        {/* Settings Modal */}
        <Suspense fallback={<View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator size="large" color="#1976d2" /><Text style={{ marginTop: 12 }}>Loading settings...</Text></View>}>
          {isUser(user) && (
            <SettingsModal
              visible={settingsModalVisible}
              onClose={() => setSettingsModalVisible(false)}
              user={user}
              darkMode={darkMode}
              biometricEnabled={biometricEnabled}
              biometricLoggedIn={biometricLoggedIn}
              workStart={workStart}
              workEnd={workEnd}
              lunchStart={lunchStart}
              lunchEnd={lunchEnd}
              lateThreshold={lateThreshold}
              onLogout={onLogout}
              onUpdateWorkHours={({ start, end, lunchStart: ls, lunchEnd: le }) => {
                setWorkStart(start);
                setWorkEnd(end);
                setLunchStart(ls);
                setLunchEnd(le);
              }}
              onUpdateLateThreshold={setLateThreshold}
            />
          )}
        </Suspense>

        {/* Export Modal */}
        <Suspense fallback={<View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator size="large" color="#1976d2" /><Text style={{ marginTop: 12 }}>Loading export...</Text></View>}>
          {isUser(user) && (
            <ExportModal
              visible={exportModalVisible}
              onClose={() => setExportModalVisible(false)}
              employees={employees}
              tasks={tasks}
              materials={materials}
              clockEvents={clockEvents}
              user={user}
            />
          )}
        </Suspense>

        {/* Task Rating Modal */}
        <Suspense fallback={<View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator size="large" color="#1976d2" /><Text style={{ marginTop: 12 }}>Loading rating...</Text></View>}>
          {selectedTaskForRating && isBusiness(user) && (
            <TaskRatingModal
              visible={!!selectedTaskForRating}
              task={selectedTaskForRating}
              employee={employees.find(e => e.id === selectedTaskForRating.assignedTo) ?? employees[0]}
              business={user}
              onClose={() => setSelectedTaskForRating(null)}
              onRatingSubmitted={() => {
                // Handle task rating submission
                setSelectedTaskForRating(null);
              }}
            />
          )}
        </Suspense>

        {/* Performance Management Modal */}
        <Suspense fallback={<View style={{ padding: 32, alignItems: 'center' }}><ActivityIndicator size="large" color="#1976d2" /><Text style={{ marginTop: 12 }}>Loading performance...</Text></View>}>
          {showPerformanceManagement && isBusiness(user) && (
            <PerformanceManagement
              business={user}
              onClose={() => setShowPerformanceManagement(false)}
            />
          )}
        </Suspense>
      </SafeAreaView>
    </DashboardErrorBoundary>
  );
}

export default AdminDashboardScreen; 