import React, { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ClockEvent, Employee } from '../utility/types';

interface ClockEventsTabProps {
  user: any;
  employees: Employee[];
  darkMode: boolean;
}

const ClockEventsTab: React.FC<ClockEventsTabProps> = ({ user, employees, darkMode }) => {
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);

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
  }, {} as Record<string, ClockEvent[]>);

  // Helper: get employee name by id
  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Unknown';
  };

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
          clockEvents.map((event, index) => {
            // Derive type and timestamp for display
            const type = event.clock_in && !event.clock_out ? 'in' : 'out';
            const timestamp = event.clock_in || event.clock_out || '';
            return (
              <View key={event.id || index} style={{
                backgroundColor: '#f8f9fa',
                borderRadius: 8,
                padding: 12,
                marginBottom: 8,
                borderLeftWidth: 4,
                borderLeftColor: type === 'in' ? '#4CAF50' : '#FF9800'
              }}>
                <Text style={{ fontWeight: 'bold', color: '#333' }}>
                  {getEmployeeName(event.employee_id)}
                </Text>
                <Text style={{ color: '#666', fontSize: 12 }}>
                  {type === 'in' ? 'Clock In' : 'Clock Out'} - {timestamp ? new Date(timestamp).toLocaleString() : ''}
                </Text>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

export default ClockEventsTab; 