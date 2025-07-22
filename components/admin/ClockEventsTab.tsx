import React, { useEffect, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, Text, TouchableOpacity, UIManager, View } from 'react-native';
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
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
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

  // Helper: get today's and this week's events for an employee
  function getEventsForDay(events: ClockEvent[], date: Date): ClockEvent[] {
    return events.filter((ev: ClockEvent) => {
      const ts = ev.clock_in || ev.clock_out || ev.lunch_start || ev.lunch_end;
      if (!ts) return false;
      const d = new Date(ts);
      return d.toDateString() === date.toDateString();
    });
  }
  function getEventsForWeek(events: ClockEvent[]): ClockEvent[] {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    return events.filter((ev: ClockEvent) => {
      const ts = ev.clock_in || ev.clock_out || ev.lunch_start || ev.lunch_end;
      if (!ts) return false;
      const d = new Date(ts);
      return d >= weekAgo && d <= now;
    });
  }

  const [expanded, setExpanded] = useState<string | null>(null);
  const handleExpand = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(expanded === id ? null : id);
  };

  // Helper: get employee name by id
  const getEmployeeName = (id: string) => {
    const emp = employees.find(e => e.id === id);
    return emp ? emp.name : 'Unknown';
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: darkMode ? '#181a20' : '#f5faff', padding: 16 }}>
      {employees.map(emp => {
        const events = clockEventsByEmployee[emp.id] || [];
        const todayEvents = getEventsForDay(events, new Date());
        const weekEvents = getEventsForWeek(events);
        return (
          <View key={emp.id} style={{ backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 }}>
            <TouchableOpacity onPress={() => handleExpand(emp.id)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#1976d2', marginBottom: 2 }}>{emp.name}</Text>
                <Text style={{ color: '#888', fontSize: 14, marginBottom: 6 }}>{emp.code}</Text>
              </View>
              <Text style={{ color: '#1976d2', fontWeight: 'bold', fontSize: 16 }}>{expanded === emp.id ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {/* Today's events */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>Today</Text>
              {todayEvents.length === 0 ? (
                <Text style={{ color: '#aaa', fontStyle: 'italic', marginBottom: 4 }}>No clock events today</Text>
              ) : (
                todayEvents.map((event: ClockEvent, idx: number) => (
                  <View key={event.id || idx} style={{ backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10, marginBottom: 4 }}>
                    {event.clock_in && <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Clock In: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.clock_in).toLocaleTimeString()}</Text></Text>}
                    {event.lunch_start && <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>Lunch Start: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.lunch_start).toLocaleTimeString()}</Text></Text>}
                    {event.lunch_end && <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Lunch End: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.lunch_end).toLocaleTimeString()}</Text></Text>}
                    {event.clock_out && <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Clock Out: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.clock_out).toLocaleTimeString()}</Text></Text>}
                  </View>
                ))
              )}
            </View>
            {/* Weekly events (expandable) */}
            {expanded === emp.id && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', color: '#333', marginBottom: 4 }}>This Week</Text>
                {weekEvents.length === 0 ? (
                  <Text style={{ color: '#aaa', fontStyle: 'italic', marginBottom: 4 }}>No clock events this week</Text>
                ) : (
                  weekEvents.map((event: ClockEvent, idx: number) => (
                    <View key={event.id || idx} style={{ backgroundColor: '#f0f0f0', borderRadius: 6, padding: 8, marginBottom: 4 }}>
                      {event.clock_in && <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Clock In: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.clock_in).toLocaleString()}</Text></Text>}
                      {event.lunch_start && <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>Lunch Start: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.lunch_start).toLocaleString()}</Text></Text>}
                      {event.lunch_end && <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Lunch End: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.lunch_end).toLocaleString()}</Text></Text>}
                      {event.clock_out && <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Clock Out: <Text style={{ color: '#333', fontWeight: 'normal' }}>{new Date(event.clock_out).toLocaleString()}</Text></Text>}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

export default ClockEventsTab; 