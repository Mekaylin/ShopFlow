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
  const [startDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate] = useState(new Date().toISOString().split('T')[0]);

  const handleExport = async () => {
    let data = '';
    let filename = '';

    // Parse startDate and endDate as Date objects
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Helper function to check if date is in range
    const inRange = (date: Date) => {
      return date >= start && date <= end;
    };

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
        const events = (clockEvents || []).filter(ev => ev.employee_id === emp.id && inRange(new Date(ev.clock_in)));
        events.forEach(ev => {
          const clockIn = ev.clock_in ? new Date(ev.clock_in).toLocaleString() : '';
          const clockOut = ev.clock_out ? new Date(ev.clock_out).toLocaleString() : '';
          data += `${emp.name},${clockIn},${clockOut}\n`;
        });
      });
      filename = 'attendance.csv';
    }
    if (exportType === 'all') filename = 'all_data.csv';

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
        <View style={{ backgroundColor: '#fff', borderRadius: 14, padding: 24, width: '90%' }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1976d2' }}>Export Data</Text>
          <Text style={{ fontWeight: 'bold', marginBottom: 8, color: '#333' }}>Export Type:</Text>
          
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