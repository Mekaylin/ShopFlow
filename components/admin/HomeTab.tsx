import { FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { Task as BaseTask, Employee, Material, PerformanceMetrics } from '../utility/types';
import {
  getBestPerformers,
  getLateEmployeesByClockEvents,
  getMaterialUsage,
  limitLines
} from '../utility/utils';
// Extend Task type locally to include optional rating property for performance metrics
type Task = BaseTask & { rating?: number };

import type { ClockEvent, MaterialType, User } from '../utility/types';
interface HomeTabProps {
  user: User;
  employees: Employee[];
  tasks: Task[];
  materials: Material[];
  materialTypes: Record<string, MaterialType[]>;
  clockEventsByEmployee: Record<string, ClockEvent[]>;
  darkMode: boolean;
  workStart: string;
  workEnd: string;
  lunchStart: string;
  lunchEnd: string;
  onExport: (filteredData?: {
    dateRange: { startDate: string; endDate: string };
    summaryRange: string;
    summaryDate: string;
    filteredTasks: Task[];
    filteredMaterials: Material[];
    materialsUsed: Record<string, number>;
    bestPerformers: PerformanceMetrics[];
    performanceMetrics: PerformanceMetrics[];
    totalCompletedTasks: number;
    totalRatedTasks: number;
    lateEmployees: string[];
  }) => void;
  refetchDashboardData: () => Promise<void>;
}

const HomeTab: React.FC<HomeTabProps> = ({
  user,
  employees,
  tasks,
  materials,
  materialTypes,
  clockEventsByEmployee,
  darkMode,
  workStart,
  workEnd,
  lunchStart,
  lunchEnd,
  onExport,
  refetchDashboardData,
}) => {
  // --- New feature states ---
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  // Example notifications (replace with real data)
  const notifications = [
    { id: 1, message: 'Task "Inventory Check" overdue.' },
    { id: 2, message: 'Employee John Doe clocked in late.' },
    { id: 3, message: 'New material type added: Cleaning Supplies.' }
  ];
  // Auto-refresh every 5 minutes
  React.useEffect(() => {
    const interval = setInterval(() => {
      refetchDashboardData();
    }, 300000);
    return () => clearInterval(interval);
  }, [refetchDashboardData]);
  // Home tab state
  const [summaryRange, setSummaryRange] = React.useState<'day' | 'week' | 'month'>('day');
  const [summaryDate, setSummaryDate] = React.useState(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [showAllTasksModal, setShowAllTasksModal] = React.useState(false);
  const [showAllLateEmpsModal, setShowAllLateEmpsModal] = React.useState(false);
  const [showAllMaterialsModal, setShowAllMaterialsModal] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  // Helper functions to calculate date ranges
  const getDateRange = (range: 'day' | 'week' | 'month', baseDate: string) => {
    const date = new Date(baseDate);
    let startDate: string;
    let endDate: string;

    switch (range) {
      case 'day':
        startDate = endDate = baseDate;
        break;
      case 'week':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = endOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        startDate = startOfMonth.toISOString().split('T')[0];
        endDate = endOfMonth.toISOString().split('T')[0];
        break;
    }

    return { startDate, endDate };
  };

  // Calculate filtered data based on selected range and date
  const { startDate, endDate } = getDateRange(summaryRange, summaryDate);
  // Use task.deadline for filtering overdue/late tasks
  // Filter tasks by date and search query
  // Show all tasks active on the selected day/range: (start <= rangeEnd && deadline >= rangeStart)
  const filteredTasks = React.useMemo(() =>
    tasks.filter(task => {
      const taskStart = new Date(task.start);
      const taskEnd = new Date(task.deadline);
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);
      const matchesDate = taskStart <= rangeEnd && taskEnd >= rangeStart;
      const matchesSearch = searchQuery.trim() === '' || task.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDate && matchesSearch;
    }), [tasks, startDate, endDate, searchQuery]
  );

  // Materials used: aggregate from all filtered tasks, only count materials with nonzero quantity for the selected day/range
  const materialsUsed = React.useMemo(() => {
    const usage: Record<string, number> = {};
    filteredTasks.forEach(task => {
      if (Array.isArray(task.materials_used)) {
        task.materials_used.forEach((matUsed: any) => {
          if (matUsed && matUsed.materialId && typeof matUsed.quantity === 'number' && matUsed.quantity > 0) {
            usage[matUsed.materialId] = (usage[matUsed.materialId] || 0) + matUsed.quantity;
          }
        });
      }
    });
    return usage;
  }, [filteredTasks]);
  // Helper to get material name by ID using materialTypes (source of truth)
  const getMaterialName = (id: string) => {
    // materialTypes is a Record<string, MaterialType[]>
    // Flatten all arrays and find the matching id
    const allTypes = Object.values(materialTypes).flat();
    const matType = allTypes.find(mt => mt.id === id);
    return matType ? matType.name : id;
  };

  // --- Performance Metrics Calculation ---
  // Calculates per-employee metrics: total, completed, rated tasks, average rating, and performance score
  const performanceMetrics: PerformanceMetrics[] = React.useMemo(() => {
    return employees.map(emp => {
      // All tasks assigned to this employee in the filtered range
      const empTasks = filteredTasks.filter(task => task.assigned_to === emp.id);
      // Tasks marked as completed
      const completedTasks = empTasks.filter(task => task.completed);
      // Completed tasks that have a rating
      const ratedTasks = completedTasks.filter(task => typeof task.rating === 'number');
      // Average rating for completed tasks with a rating
      const average_rating = ratedTasks.length > 0
        ? ratedTasks.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTasks.length
        : 0;
      // Completion percentage
      const performance_score = empTasks.length > 0
        ? (completedTasks.length / empTasks.length) * 100
        : 0;
      return {
        employee_id: emp.id,
        employee_name: emp.name,
        total_tasks: empTasks.length,
        completed_tasks: completedTasks.length,
        rated_tasks: ratedTasks.length,
        average_rating: Math.round(average_rating * 100) / 100,
        performance_score: Math.round(performance_score)
      };
    });
  }, [employees, filteredTasks]);

  // Restore filteredMaterials for export logic
  const filteredMaterials = React.useMemo(() => materials.filter(material => {
    return filteredTasks.some(task =>
      task.materials_used?.some((matUsed: any) => matUsed.materialId === material.id)
    );
  }), [materials, filteredTasks]);
  const bestPerformers = React.useMemo(() => getBestPerformers(performanceMetrics, 5), [performanceMetrics]);

  // --- Aggregate Totals for Export Stats ---
  // Total completed tasks across all employees
  const totalCompletedTasks = React.useMemo(() =>
    performanceMetrics.reduce((sum, emp) => sum + emp.completed_tasks, 0),
    [performanceMetrics]
  );
  // Total rated tasks across all employees
  const totalRatedTasks = React.useMemo(() =>
    performanceMetrics.reduce((sum, emp) => sum + emp.rated_tasks, 0),
    [performanceMetrics]
  );

  // Filter clock events within the date range
  const filteredClockEvents = React.useMemo(() => Object.values(clockEventsByEmployee).flat().filter(event => {
    const eventDate = event.clock_in || event.clock_out;
    if (!eventDate) return false;
    const clockDate = new Date(eventDate).toISOString().split('T')[0];
    return clockDate >= startDate && clockDate <= endDate;
  }), [clockEventsByEmployee, startDate, endDate]);

  // Late employees: use admin-configured workStart and lunchEnd times
  // Returns array of { name, lateForWork, lateFromLunch, clockIn, lunchEnd }
  type LateEmployee = {
    name: string;
    lateForWork: boolean;
    lateFromLunch: boolean;
    clockIn: string | null;
    lunchEnd: string | null;
  };
  const lateEmployeesDetailed: LateEmployee[] = React.useMemo(() => {
    // Helper to parse time string (e.g., '09:00') into a Date object on a given date
    const parseTime = (dateStr: string, timeStr: string): Date => {
      const [h, m] = timeStr.split(':').map(Number);
      const d = new Date(dateStr + 'T' + timeStr.padStart(5, '0'));
      // If timeStr is missing seconds, pad it
      return d;
    };
    // For each employee, check clock_in and lunch_end events
    return employees.map(emp => {
      // Find all clock events for this employee in the filtered range
      const empEvents = Object.values(clockEventsByEmployee).flat().filter(ev => ev.employee_id === emp.id);
      // Find earliest clock_in for the selected day only
      const todaysEvents = empEvents.filter(ev => {
        if (!ev.clock_in) return false;
        const eventDate = new Date(ev.clock_in);
        const eventDay = eventDate.toISOString().split('T')[0];
        return eventDay === startDate;
      });
      const clockInEvent = todaysEvents.sort((a, b) => {
        const aTime = a.clock_in ? new Date(a.clock_in).getTime() : Infinity;
        const bTime = b.clock_in ? new Date(b.clock_in).getTime() : Infinity;
        return aTime - bTime;
      })[0];
      // Find latest lunch_end for the selected day only
      const todaysLunchEvents = empEvents.filter(ev => {
        if (!ev.lunch_end) return false;
        const eventDate = new Date(ev.lunch_end);
        const eventDay = eventDate.toISOString().split('T')[0];
        return eventDay === startDate;
      });
      const lunchEndEvent = todaysLunchEvents.sort((a, b) => {
        const aTime = a.lunch_end ? new Date(a.lunch_end).getTime() : -Infinity;
        const bTime = b.lunch_end ? new Date(b.lunch_end).getTime() : -Infinity;
        return bTime - aTime;
      })[0];
      // Parse admin-configured times for today
      const today = startDate;
      const workStartTime = parseTime(today, workStart);
      const lunchEndTime = parseTime(today, lunchEnd);
      // Determine lateness
      let lateForWork = false;
      if (clockInEvent && clockInEvent.clock_in) {
        const clockInDate = new Date(clockInEvent.clock_in);
        lateForWork = clockInDate > workStartTime;
        // Debug output
        if (typeof window !== 'undefined' && window.console) {
          // @ts-ignore
          window.console.log(`DEBUG: ${emp.name} clocked in at ${clockInDate.toLocaleTimeString()} (workStart: ${workStartTime.toLocaleTimeString()}) => late: ${lateForWork}`);
        }
      }
      let lateFromLunch = false;
      if (lunchEndEvent && lunchEndEvent.lunch_end) {
        const lunchEndDate = new Date(lunchEndEvent.lunch_end);
        lateFromLunch = lunchEndDate > lunchEndTime;
      }
      return {
        name: emp.name,
        lateForWork,
        lateFromLunch,
        clockIn: clockInEvent && clockInEvent.clock_in ? clockInEvent.clock_in : null,
        lunchEnd: lunchEndEvent && lunchEndEvent.lunch_end ? lunchEndEvent.lunch_end : null,
      };
    }).filter(e => e.lateForWork || e.lateFromLunch);
  }, [employees, clockEventsByEmployee, workStart, lunchEnd, startDate]);

  const canExpand = (arr: any[]) => arr.length > 10;

  // Debug info for troubleshooting data issues
  const debugInfo = [
    `Employees: ${employees.length}`,
    `Tasks: ${tasks.length}`,
    `Materials: ${materials.length}`,
    `ClockEvents: ${Object.values(clockEventsByEmployee).flat().length}`,
    `FilteredTasks: ${filteredTasks.length}`,
    `LateEmployees: ${lateEmployeesDetailed.length}`,
    `MaterialsUsed: ${Object.keys(materialsUsed).length}`,
    `BestPerformers: ${bestPerformers.length}`
  ];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
      {/* Top Bar: Refresh, Notifications, Role Indicator */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, justifyContent: 'space-between' }}>
        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', borderRadius: 8, padding: 8, marginRight: 8 }}
          onPress={async () => {
            setLoading(true);
            await refetchDashboardData();
            setLoading(false);
          }}
        >
          <MaterialIcons name={loading ? 'autorenew' : 'refresh'} size={22} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: '#fff', borderRadius: 8, padding: 8, marginRight: 8, borderWidth: 1, borderColor: '#1976d2' }}
          onPress={() => setShowNotifications(true)}
        >
          <FontAwesome5 name="bell" size={20} color="#1976d2" />
        </TouchableOpacity>
        <View style={{ backgroundColor: '#e3f2fd', borderRadius: 8, padding: 8 }}>
          <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>{user.role ? user.role.toUpperCase() : 'ADMIN'}</Text>
        </View>
      </View>
      {/* Search Bar for Tasks */}
      <View style={{ marginBottom: 12 }}>
        <TextInput
          style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, fontSize: 16 }}
          placeholder="Search tasks..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {/* DEBUG INFO - REMOVE IN PRODUCTION */}
      <View style={{ backgroundColor: darkMode ? '#232a36' : '#fffbe6', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: darkMode ? '#333950' : '#ffe082' }}>
        <Text style={{ color: '#c62828', fontWeight: 'bold', marginBottom: 4 }}>DATA COUNTS</Text>
        {debugInfo.map((line, idx) => (
          <Text key={idx} style={{ color: '#333', fontSize: 13 }}>{line}</Text>
        ))}
      </View>
      {/* Range Selector */}
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        {(['day', 'week', 'month'] as const).map(range => (
          <TouchableOpacity
            key={range}
            style={{
              flex: 1,
              paddingVertical: 8,
              backgroundColor: summaryRange === range ? '#1976d2' : '#e3f2fd',
              borderRadius: 8,
              marginHorizontal: 2,
              alignItems: 'center',
            }}
            onPress={() => {
              setSummaryRange(range);
              // Reset to today when changing ranges
              setSummaryDate(new Date().toISOString().split('T')[0]);
            }}
          >
            <Text style={{ color: summaryRange === range ? '#fff' : '#1976d2', fontWeight: 'bold' }}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Date Picker Row */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 8, padding: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>
            {summaryRange === 'day' ? `Date: ${summaryDate}` : 
             summaryRange === 'week' ? `Week of: ${summaryDate}` : 
             `Month of: ${summaryDate}`}
          </Text>
          <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
            {summaryRange === 'day' ? 'Single day view' :
             summaryRange === 'week' ? `${startDate} to ${endDate}` :
             `${startDate} to ${endDate}`}
          </Text>
        </View>
        <TouchableOpacity
          style={{ backgroundColor: '#1976d2', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 }}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={{ color: '#fff', fontSize: 14 }}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Tasks Card */}
      <TouchableOpacity
        activeOpacity={canExpand(filteredTasks) ? 0.7 : 1}
        onPress={() => canExpand(filteredTasks) && setShowAllTasksModal(true)}
        style={{ backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: darkMode ? '#000' : '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Tasks</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>
            {filteredTasks.length} total, {filteredTasks.filter(t => t.completed).length} completed
          </Text>
        </View>
        {filteredTasks.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No tasks found for this {summaryRange}
          </Text>
        ) : (
          <>
            {limitLines(filteredTasks, 10).map((t, idx) => {
              const isLate = !t.completed && t.deadline && new Date(t.deadline) < new Date();
              return (
                <Text key={t.id} style={{ color: t.completed ? '#388e3c' : isLate ? '#c62828' : '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                  {idx + 1}. {t.name} {t.completed ? '(Completed)' : isLate ? '(Late)' : ''}
                </Text>
              );
            })}
            {filteredTasks.length > 10 && (
              <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{filteredTasks.length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>
      {/* Late Employees Card */}
      <TouchableOpacity
        activeOpacity={canExpand(lateEmployeesDetailed) ? 0.7 : 1}
        onPress={() => canExpand(lateEmployeesDetailed) && setShowAllLateEmpsModal(true)}
        style={{ backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: darkMode ? '#000' : '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#c62828' }}>Late Employees</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{lateEmployeesDetailed.length} employees</Text>
        </View>
        {lateEmployeesDetailed.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No late employees for this {summaryRange}
          </Text>
        ) : (
          <>
            {limitLines(lateEmployeesDetailed, 10).map((emp, idx) => (
              <Text key={emp.name} style={{ color: '#c62828', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                {idx + 1}. {emp.name}
              </Text>
            ))}
            {lateEmployeesDetailed.length > 10 && (
              <Text style={{ color: '#c62828', fontWeight: 'bold', marginTop: 4 }}>+{lateEmployeesDetailed.length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>
      {/* Materials Used Card */}
      <TouchableOpacity
        activeOpacity={canExpand(Object.entries(materialsUsed)) ? 0.7 : 1}
        onPress={() => canExpand(Object.entries(materialsUsed)) && setShowAllMaterialsModal(true)}
        style={{ backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: darkMode ? '#000' : '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Materials Used</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>{Object.keys(materialsUsed).length} materials</Text>
        </View>
        {Object.keys(materialsUsed).length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No materials used for this {summaryRange}
          </Text>
        ) : (
          <>
            {Object.entries(materialsUsed).slice(0, 10).map(([matId, qty], idx) => (
              <Text key={matId} style={{ color: '#263238', fontSize: 15 }} numberOfLines={1} ellipsizeMode="tail">
                {idx + 1}. {getMaterialName(matId)}: {qty}
              </Text>
            ))}
            {Object.keys(materialsUsed).length > 10 && (
              <Text style={{ color: '#1976d2', fontWeight: 'bold', marginTop: 4 }}>+{Object.keys(materialsUsed).length - 10} more...</Text>
            )}
          </>
        )}
      </TouchableOpacity>
      {/* Best Performers Card */}
      <View style={{ backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 16, padding: 18, marginBottom: 8, shadowColor: darkMode ? '#000' : '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2' }}>Best Performers</Text>
          <Text style={{ fontSize: 14, color: '#666' }}>Top 5</Text>
        </View>
        {bestPerformers.length === 0 ? (
          <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
            No performance data available for this {summaryRange}
          </Text>
        ) : (
          bestPerformers.slice(0, 5).map((emp, idx) => (
            <Text key={emp.employee_id} style={{ color: '#263238', fontSize: 15 }} numberOfLines={2} ellipsizeMode="tail">
              {idx + 1}. {emp.employee_name} ({emp.performance_score}% completion - {emp.completed_tasks}/{emp.total_tasks} tasks, {emp.rated_tasks} rated, Avg Rating: {emp.average_rating})
            </Text>
          ))
        )}
      </View>
      {/* Export Section with Date Filter */}
      <View style={{ marginTop: 16, backgroundColor: darkMode ? '#232a36' : '#fff', borderRadius: 16, padding: 18, shadowColor: darkMode ? '#000' : '#1976d2', shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 18, color: '#1976d2', marginBottom: 12 }}>Export Data</Text>
        {/* Current Filter Display */}
        <View style={{ backgroundColor: '#f5f9ff', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <Text style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Current Filter:</Text>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#1976d2' }}>
            {summaryRange.charAt(0).toUpperCase() + summaryRange.slice(1)} - {summaryDate}
          </Text>
          {summaryRange !== 'day' && (
            <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              From {startDate} to {endDate}
            </Text>
          )}
        </View>
        {/* Export Stats Preview */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#4CAF50' }}>{filteredTasks.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Tasks</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#2196F3' }}>{Object.keys(materialsUsed).length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Materials</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#FF9800' }}>{bestPerformers.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Performers</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#9C27B0' }}>{lateEmployeesDetailed.length}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Late</Text>
          </View>
        </View>
        {/* Completed/Rated Tasks Summary */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#388e3c' }}>{totalCompletedTasks}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Completed Tasks</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1976d2' }}>{totalRatedTasks}</Text>
            <Text style={{ fontSize: 12, color: '#666' }}>Rated Tasks</Text>
          </View>
        </View>
        {/* Quick Filter Actions */}
        <View style={{ flexDirection: 'row', marginBottom: 12 }}>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: summaryRange === 'day' && summaryDate === new Date().toISOString().split('T')[0] ? '#1976d2' : '#e3f2fd',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              alignItems: 'center',
              marginRight: 4,
              borderWidth: summaryRange === 'day' && summaryDate === new Date().toISOString().split('T')[0] ? 2 : 1,
              borderColor: summaryRange === 'day' && summaryDate === new Date().toISOString().split('T')[0] ? '#1976d2' : '#ddd'
            }}
            onPress={() => {
              setSummaryRange('day');
              setSummaryDate(new Date().toISOString().split('T')[0]);
            }}
          >
            <Text style={{ color: '#1976d2', fontSize: 12, fontWeight: '600' }}>Today</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: summaryRange === 'week' ? '#4CAF50' : '#e8f5e9',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              alignItems: 'center',
              marginHorizontal: 4,
              borderWidth: summaryRange === 'week' ? 2 : 1,
              borderColor: summaryRange === 'week' ? '#4CAF50' : '#ddd'
            }}
            onPress={() => setSummaryRange('week')}
          >
            <Text style={{ color: '#4CAF50', fontSize: 12, fontWeight: '600' }}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: summaryRange === 'month' ? '#FF9800' : '#fff3e0',
              borderRadius: 8,
              paddingVertical: 12,
              paddingHorizontal: 20,
              alignItems: 'center',
              marginLeft: 4,
              borderWidth: summaryRange === 'month' ? 2 : 1,
              borderColor: summaryRange === 'month' ? '#FF9800' : '#ddd'
            }}
            onPress={() => setSummaryRange('month')}
          >
            <Text style={{ color: '#FF9800', fontSize: 12, fontWeight: '600' }}>This Month</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={{
            backgroundColor: exporting ? '#A5D6A7' : '#4CAF50',
            borderRadius: 8,
            paddingVertical: 12,
            paddingHorizontal: 20,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            opacity: exporting ? 0.7 : 1,
          }}
          onPress={async () => {
            setExporting(true);
            try {
              // Pass filtered data and date range to export function
              await Promise.resolve(onExport({
                dateRange: { startDate, endDate },
                summaryRange,
                summaryDate,
                filteredTasks,
                filteredMaterials,
                materialsUsed,
                bestPerformers,
                performanceMetrics,
                totalCompletedTasks,
                totalRatedTasks,
                lateEmployees: lateEmployeesDetailed.map(e => e.name)
              }));
              // Optionally show a success message
              // Alert.alert('Export', 'Data export started.');
            } catch (err: any) {
              if (err?.message) {
                alert('Export failed: ' + err.message);
              } else {
                alert('Export failed.');
              }
            } finally {
              setExporting(false);
            }
          }}
          disabled={exporting}
        >
          {exporting ? (
            <FontAwesome5 name="spinner" size={16} color="#fff" style={{ marginRight: 8 }} spin />
          ) : (
            <FontAwesome5 name="download" size={16} color="#fff" style={{ marginRight: 8 }} />
          )}
          <Text style={{ color: '#fff', fontWeight: '600' }}>
            {exporting ? 'Exporting...' : `Export ${summaryRange.charAt(0).toUpperCase() + summaryRange.slice(1)} Data`}
          </Text>
        </TouchableOpacity>
      </View>
      {/* All Tasks Modal */}
      <Modal visible={showAllTasksModal} transparent animationType="slide" onRequestClose={() => setShowAllTasksModal(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>All Tasks</Text>
            <ScrollView>
              {filteredTasks.map((task, idx) => {
                const isLate = !task.completed && task.deadline && new Date(task.deadline) < new Date();
                return (
                  <Text key={task.id} style={[adminStyles.taskListText, task.completed ? adminStyles.textSuccess : isLate ? adminStyles.textError : adminStyles.textPrimary]}>
                    {idx + 1}. {task.name} {task.completed ? '(Completed)' : isLate ? '(Late)' : ''}
                  </Text>
                );
              })}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllTasksModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* All Late Employees Modal - Shows late for work and late from lunch */}
      <Modal visible={showAllLateEmpsModal} transparent animationType="slide" onRequestClose={() => setShowAllLateEmpsModal(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={[adminStyles.modalTitle, adminStyles.textError]}>All Late Employees</Text>
            <ScrollView>
              {lateEmployeesDetailed.length === 0 ? (
                <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
                  No late employees for this {summaryRange}
                </Text>
              ) : (
                lateEmployeesDetailed.map((emp, idx) => (
                  <View key={emp.name} style={{ marginBottom: 16 }}>
                    <Text style={[adminStyles.taskListText, adminStyles.textError, { fontWeight: 'bold', fontSize: 16 }]}>
                      {idx + 1}. {emp.name}
                    </Text>
                    {emp.lateForWork && (
                      <Text style={{ color: '#c62828', fontSize: 13, marginLeft: 8 }}>
                        Late for work. Clocked in: {emp.clockIn ? new Date(emp.clockIn).toLocaleTimeString() : 'N/A'} (Expected: {workStart})
                      </Text>
                    )}
                    {emp.lateFromLunch && (
                      <Text style={{ color: '#c62828', fontSize: 13, marginLeft: 8 }}>
                        Late from lunch. Returned: {emp.lunchEnd ? new Date(emp.lunchEnd).toLocaleTimeString() : 'N/A'} (Expected: {lunchEnd})
                      </Text>
                    )}
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllLateEmpsModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* All Materials Modal */}
      <Modal visible={showAllMaterialsModal} transparent animationType="slide" onRequestClose={() => setShowAllMaterialsModal(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>All Materials Used</Text>
            <ScrollView>
              {Object.entries(materialsUsed).map(([matId, qty], idx) => (
                <Text key={matId} style={adminStyles.taskListText}>
                  {idx + 1}. {getMaterialName(matId)}: {qty}
                </Text>
              ))}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowAllMaterialsModal(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Notifications Modal */}
      <Modal visible={showNotifications} transparent animationType="slide" onRequestClose={() => setShowNotifications(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>Notifications</Text>
            <ScrollView>
              {notifications.length === 0 ? (
                <Text style={{ color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 }}>
                  No notifications
                </Text>
              ) : (
                notifications.map(n => (
                  <Text key={n.id} style={{ color: '#1976d2', fontSize: 15, marginBottom: 8 }}>{n.message}</Text>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={() => setShowNotifications(false)}>
              <Text style={adminStyles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Date Picker Modal */}
      <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
        <View style={adminStyles.modalOverlay}>
          <View style={adminStyles.modalContent}>
            <Text style={adminStyles.modalTitle}>
              Select {summaryRange === 'day' ? 'Date' : summaryRange === 'week' ? 'Week Start Date' : 'Month Date'}
            </Text>
            <Text style={{ color: '#666', marginBottom: 16, textAlign: 'center' }}>
              {summaryRange === 'day' ? 'Choose a specific date' :
               summaryRange === 'week' ? 'Choose any date in the week' :
               'Choose any date in the month'}
            </Text>
            <TextInput
              accessibilityLabel="HomeTab Search"
              testID="hometab-search-input"
              style={{
                borderWidth: 1,
                borderColor: '#ddd',
                borderRadius: 8,
                padding: 12,
                marginVertical: 16,
                fontSize: 16,
                textAlign: 'center',
              }}
              value={summaryDate}
              onChangeText={(text) => {
                // Basic date validation
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (dateRegex.test(text) || text === '') {
                  setSummaryDate(text);
                }
              }}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
              maxLength={10}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { backgroundColor: '#e0e0e0', flex: 0.3 }]}
                onPress={() => setSummaryDate(new Date().toISOString().split('T')[0])}
              >
                <Text style={[adminStyles.closeBtnText, { color: '#333' }]}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { backgroundColor: '#666', flex: 0.3 }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={adminStyles.closeBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[adminStyles.closeBtn, { flex: 0.3 }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={adminStyles.closeBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

export default HomeTab;