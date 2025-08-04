import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useState } from 'react';
import { Modal, Platform, Text, TouchableOpacity, View } from 'react-native';
import { adminStyles } from '../utility/styles';
import { Employee, Task } from '../utility/types';

import type { ClockEvent, Material, User } from '../utility/types';
interface ExportModalProps {
  visible: boolean;
  onClose: () => void;
  employees: Employee[];
  tasks: Task[];
  materials: Material[];
  clockEvents: ClockEvent[];
  user: User;
}

const ExportModal: React.FC<ExportModalProps> = ({
  visible,
  onClose,
  employees,
  tasks,
  materials,
  clockEvents,
  user,
}) => {
  const [exportType, setExportType] = useState<'tasks' | 'materials' | 'employees' | 'attendance' | 'all'>('all');
  const [metricsTab, setMetricsTab] = useState<'day' | 'week' | 'month'>('day');
  
  // Calculate date range based on tab selection
  const getDateRange = (tab: 'day' | 'week' | 'month') => {
    const today = new Date();
    let startDate = today.toISOString().split('T')[0];
    let endDate = today.toISOString().split('T')[0];
    
    if (tab === 'week') {
      const first = new Date(today);
      first.setDate(today.getDate() - today.getDay()); // Sunday
      startDate = first.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    } else if (tab === 'month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      startDate = first.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
    }
    
    return { startDate, endDate };
  };
  
  const { startDate, endDate } = getDateRange(metricsTab);

  const handleExport = async () => {
    let data = '';
    let filename = '';

    // Parse startDate and endDate as Date objects for proper comparison
    const start = new Date(startDate + 'T00:00:00.000Z');
    const end = new Date(endDate + 'T23:59:59.999Z');
    
    // Helper function to check if date is in range
    const inRange = (dateStr: string | null | undefined) => {
      if (!dateStr) return false;
      const date = new Date(dateStr);
      return date >= start && date <= end;
    };

    if (exportType === 'tasks' || exportType === 'all') {
      // Filter tasks based on completion date or start date if not completed
      const filtered = tasks.filter(t => {
        const relevantDate = t.completed ? t.completed_at : t.start;
        return inRange(relevantDate);
      });
      data += 'Task Name,Assigned To,Department,Start Date,Deadline,Status,Completed At,Materials Used\n';
      filtered.forEach(t => {
        const status = t.completed ? 'Completed' : (new Date(t.deadline) < new Date() ? 'Overdue' : 'In Progress');
        const assignedEmployee = employees.find(e => e.name === t.assigned_to || e.id === t.assigned_to);
        const department = assignedEmployee?.department || '';
        const materialsUsed = t.materials_used ? t.materials_used.map(m => `${m.materialId}:${m.quantity}`).join(';') : '';
        data += `"${(t.name || '').replace(/"/g, '""')}","${assignedEmployee?.name || t.assigned_to || ''}","${department}","${t.start || ''}","${t.deadline || ''}","${status}","${t.completed_at || ''}","${materialsUsed}"\n`;
      });
      filename = `tasks_${startDate}_to_${endDate}.csv`;
    }
    
    if (exportType === 'materials' || exportType === 'all') {
      if (data) data += '\n';
      data += 'Material Name,Type,Unit,Quantity\n';
      materials.forEach(m => {
        data += `"${(m.name || '').replace(/"/g, '""')}","${m.type || ''}","${m.unit || ''}","${m.quantity || 0}"\n`;
      });
      if (exportType === 'materials') filename = `materials_${startDate}_to_${endDate}.csv`;
    }
    
    if (exportType === 'employees' || exportType === 'all') {
      if (data) data += '\n';
      data += 'Employee Name,Department,Lunch Start,Lunch End,Photo URI\n';
      employees.forEach(e => {
        data += `"${(e.name || '').replace(/"/g, '""')}","${e.department || ''}","${e.lunchStart || ''}","${e.lunchEnd || ''}","${e.photoUri || ''}"\n`;
      });
      if (exportType === 'employees') filename = `employees_${startDate}_to_${endDate}.csv`;
    }
    
    if (exportType === 'attendance' || exportType === 'all') {
      if (data) data += '\n';
      data += 'Employee Name,Date,Clock In,Clock Out,Lunch Start,Lunch End,Total Hours\n';
      // Group events by employee
      const filteredEvents = clockEvents.filter(ev => inRange(ev.clock_in));
      const eventsByEmployee: { [employeeId: string]: typeof filteredEvents } = {};
      filteredEvents.forEach(ev => {
        if (!eventsByEmployee[ev.employee_id]) eventsByEmployee[ev.employee_id] = [];
        eventsByEmployee[ev.employee_id].push(ev);
      });
      // For each employee, group by period (day/week/month)
      Object.entries(eventsByEmployee).forEach(([employeeId, events]) => {
        const employee = employees.find(emp => emp.id === employeeId);
        const employeeName = employee?.name || 'Unknown Employee';
        // Group by date string (YYYY-MM-DD)
        const eventsByDate: { [date: string]: typeof events } = {};
        events.forEach(ev => {
          const dateStr = ev.clock_in ? new Date(ev.clock_in).toISOString().split('T')[0] : 'Unknown Date';
          if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
          eventsByDate[dateStr].push(ev);
        });
        Object.entries(eventsByDate).forEach(([date, dayEvents]) => {
          dayEvents.forEach(ev => {
            const clockIn = ev.clock_in ? new Date(ev.clock_in).toLocaleTimeString() : '';
            const clockOut = ev.clock_out ? new Date(ev.clock_out).toLocaleTimeString() : '';
            const lunchStart = ev.lunch_start ? new Date(ev.lunch_start).toLocaleTimeString() : '';
            const lunchEnd = ev.lunch_end ? new Date(ev.lunch_end).toLocaleTimeString() : '';
            let totalHours = 0;
            if (ev.clock_in && ev.clock_out) {
              const hoursWorked = (new Date(ev.clock_out).getTime() - new Date(ev.clock_in).getTime()) / (1000 * 60 * 60);
              totalHours = Math.round(hoursWorked * 100) / 100;
            }
            data += `"${employeeName}","${date}","${clockIn}","${clockOut}","${lunchStart}","${lunchEnd}","${totalHours}"\n`;
          });
        });
      });
      if (exportType === 'attendance') filename = `attendance_${startDate}_to_${endDate}.csv`;
    }
    
    if (exportType === 'all') filename = `shopflow_export_${startDate}_to_${endDate}.csv`;

    // Add summary information at the top for 'all' export
    if (exportType === 'all') {
      const summaryData = `ShopFlow Data Export - ${startDate} to ${endDate}\n` +
        `Generated on: ${new Date().toLocaleString()}\n` +
        `Total Employees: ${employees.length}\n` +
        `Total Tasks in Range: ${tasks.filter(t => inRange(t.completed ? t.completed_at : t.start)).length}\n` +
        `Total Materials: ${materials.length}\n` +
        `Total Clock Events in Range: ${clockEvents.filter(ev => inRange(ev.clock_in)).length}\n\n`;
      data = summaryData + data;
    }

    if (Platform.OS === 'web') {
      try {
        const blob = new Blob([data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        onClose();
      } catch (err: any) {
        alert('Export failed: ' + (err && err.message ? err.message : String(err)));
      }
    } else {
      // Native: use FileSystem and Sharing
      const fileUri = FileSystem.cacheDirectory + filename;
      await FileSystem.writeAsStringAsync(fileUri, data, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri);
      onClose();
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 10, width: '98%', marginHorizontal: 2, minWidth: 0, maxWidth: '100%' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1976d2' }}>Export Data</Text>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#333' }}>Export Type:</Text>
          {/* Export Type Selection */}
          {(['tasks', 'materials', 'employees', 'attendance', 'all'] as const).map(type => (
            <TouchableOpacity
              key={type}
              style={{
                backgroundColor: exportType === type ? '#1976d2' : '#e3f2fd',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                alignItems: 'center',
              }}
              onPress={() => setExportType(type)}
            >
              <Text style={{ color: exportType === type ? '#fff' : '#1976d2', fontWeight: 'bold' }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {/* Metrics Tab Selection */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', marginVertical: 10 }}>
            {(['day', 'week', 'month'] as const).map(tab => (
              <TouchableOpacity
                key={tab}
                style={{
                  backgroundColor: metricsTab === tab ? '#1976d2' : '#e3f2fd',
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 18,
                  marginHorizontal: 4,
                }}
                onPress={() => setMetricsTab(tab)}
              >
                <Text style={{ color: metricsTab === tab ? '#fff' : '#1976d2', fontWeight: 'bold' }}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TouchableOpacity style={adminStyles.addBtn} onPress={handleExport}>
              <Text style={adminStyles.addBtnText}>Export</Text>
            </TouchableOpacity>
            <TouchableOpacity style={adminStyles.closeBtn} onPress={onClose}>
              <Text style={adminStyles.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ExportModal; 