import { FontAwesome5 } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
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
import { ClockEvent, Employee, Material, MaterialType, PerformanceSettings, Task } from '../../components/utility/types';
import { supabase } from '../../lib/supabase';

interface AdminDashboardScreenProps {
  onLogout: () => void;
  user: any;
}

function AdminDashboardScreen({ onLogout, user }: AdminDashboardScreenProps) {
  // Fingerprint auth state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoggedIn] = useState(false);

  // Check for biometric support on mount
  useEffect(() => {
    (async () => {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricEnabled(hasHardware && isEnrolled);
    })();
  }, []);

  // Dark mode and settings modal state
  const [darkMode] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

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
  const [performanceSettingsLoading] = useState(false);
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
    let isMounted = true;
    async function fetchAllInitialData() {
      setInitialLoading(true);
      try {
        const [empRes, taskRes, matRes, deptRes, perfRes, clockRes] = await Promise.all([
          supabase.from('employees').select('*').eq('business_id', user.business_id),
          supabase.from('tasks').select('*').eq('business_id', user.business_id),
          supabase.from('materials').select('*').eq('business_id', user.business_id),
          supabase.from('departments').select('name').eq('business_id', user.business_id),
          supabase.from('performance_settings').select('*').eq('business_id', user.business_id).single(),
          supabase.from('clock_events').select('*').eq('business_id', user.business_id).order('clock_in', { ascending: false }),
        ]);
        if (!isMounted) return;
        if (!empRes.error && empRes.data) setEmployees(empRes.data);
        if (!taskRes.error && taskRes.data) setTasks(taskRes.data);
        if (!matRes.error && matRes.data) setMaterials(matRes.data);
        if (!deptRes.error && deptRes.data) setDepartments(deptRes.data.map(d => d.name));
        if (!perfRes.error && perfRes.data) setPerformanceSettings({
          ratingSystemEnabled: perfRes.data.rating_system_enabled ?? false,
          autoRateCompletedTasks: perfRes.data.auto_rate_completed_tasks ?? false,
          defaultRating: perfRes.data.default_rating ?? 3,
        });
        if (!clockRes.error && clockRes.data) setClockEvents(clockRes.data);
      } catch (err) {
        console.error('Error fetching initial data:', err);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    }
    fetchAllInitialData();
    return () => { isMounted = false; };
  }, [user?.business_id]);

  // Check for late tasks and show notifications
  useEffect(() => {
    const now = new Date();
    const lateTasks = tasks.filter(t => {
      if (t.completed || lateTaskNotifiedIds.includes(t.id)) return false;
      const deadline = new Date(t.deadline);
      return now > deadline;
    });
    if (lateTasks.length > 0) {
      Alert.alert('Late Tasks', `${lateTasks.length} task(s) are overdue!`);
      setLateTaskNotifiedIds(prev => [...prev, ...lateTasks.map(t => t.id)]);
    }
  }, [tasks, lateTaskNotifiedIds]);

  // Helper: group clock events by employee
  const clockEventsByEmployee = employees.reduce((acc, emp) => {
    acc[emp.id] = clockEvents.filter(ev => ev.employee_id === emp.id);
    return acc;
  }, {} as Record<string, ClockEvent[]>);

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

  // Main dashboard render
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff' }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: darkMode ? '#333950' : '#e3f2fd' }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: darkMode ? '#b3c0e0' : '#1976d2' }}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => setSettingsModalVisible(true)} style={{ padding: 8 }}>
          <FontAwesome5 name="cog" size={24} color={darkMode ? '#b3c0e0' : '#1976d2'} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Tab Content */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {tab === 'home' && (
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
            onExport={() => setExportModalVisible(true)}
          />
        )}
        {tab === 'employees' && (
          <EmployeesTab
            user={user}
            darkMode={darkMode}
            employees={employees}
            setEmployees={setEmployees}
            departments={departments}
            setDepartments={setDepartments}
            biometricEnabled={biometricEnabled}
            biometricLoggedIn={biometricLoggedIn}
          />
        )}
        {tab === 'tasks' && (
          <TasksTab
            user={user}
            employees={employees}
            materials={materials}
            materialTypes={materialTypes}
            darkMode={darkMode}
            performanceSettings={performanceSettings}
            tasks={tasks}
            setTasks={setTasks}
            lateThreshold={lateThreshold}
            lateTaskNotifiedIds={lateTaskNotifiedIds}
            setLateTaskNotifiedIds={setLateTaskNotifiedIds}
            onRateTask={(task) => setSelectedTaskForRating(task)}
          />
        )}
        {tab === 'materials' && (
          <MaterialsTab
            user={user}
            materials={materials}
            setMaterials={setMaterials}
            materialTypes={materialTypes}
            setMaterialTypes={setMaterialTypes}
            darkMode={darkMode}
          />
        )}
        {tab === 'clock' && (
          <ClockEventsTab
            user={user}
            employees={employees}
            darkMode={darkMode}
          />
        )}
        {tab === 'performance' && (
          <PerformanceTab
            user={user}
            employees={employees}
            tasks={tasks}
            performanceSettings={performanceSettings}
            setPerformanceSettings={setPerformanceSettings}
            darkMode={darkMode}
          />
        )}
      </View>

      {/* Settings Modal */}
      <Suspense fallback={null}>
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
      </Suspense>

      {/* Export Modal */}
      <Suspense fallback={null}>
        <ExportModal
          visible={exportModalVisible}
          onClose={() => setExportModalVisible(false)}
          employees={employees}
          tasks={tasks}
          materials={materials}
          clockEvents={clockEvents}
          user={user}
        />
      </Suspense>

      {/* Task Rating Modal */}
      <Suspense fallback={null}>
        {selectedTaskForRating && (
          <TaskRatingModal
            visible={!!selectedTaskForRating}
            task={selectedTaskForRating}
            employee={employees.find(e => e.id === selectedTaskForRating.assignedTo)}
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
      <Suspense fallback={null}>
        {showPerformanceManagement && (
          <PerformanceManagement
            business={user}
            onClose={() => setShowPerformanceManagement(false)}
          />
        )}
      </Suspense>
    </SafeAreaView>
  );
}

export default AdminDashboardScreen; 