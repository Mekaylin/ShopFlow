import React, { useEffect, useState, useMemo, memo } from 'react';
import { LayoutAnimation, Platform, ScrollView, Text, TouchableOpacity, UIManager, View, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { ClockEvent, Employee } from '../utility/types';
import { Colors } from '../../constants/Colors';

interface ClockEventsTabProps {
  user: any;
  employees: Employee[];
  darkMode: boolean;
}

const ClockEventsTab = ({ user, employees, darkMode }: ClockEventsTabProps) => {
  const themeColors = darkMode ? Colors.dark : Colors.light;
  const [clockEvents, setClockEvents] = useState<ClockEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 50; // Reduce page size for better performance

  // Fetch clock events for all employees in this business with pagination
  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
    }
    
    async function fetchClockEvents() {
      if (!user?.business_id) {
        setInitialLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Get recent events first (last 7 days) for better performance
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const { data, error } = await supabase
          .from('clock_events')
          .select('*')
          .eq('business_id', user.business_id)
          .gte('created_at', sevenDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .limit(pageSize);
          
        if (!error && data) {
          setClockEvents(data);
          setHasMore(data.length === pageSize);
          setError(null);
        } else {
          console.error('Error fetching clock events:', error);
          setError('Failed to load clock events');
          setClockEvents([]);
        }
      } catch (error) {
        console.error('Error fetching clock events:', error);
        setError('Failed to load clock events');
        setClockEvents([]);
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    }
    
    fetchClockEvents();
  }, [user?.business_id]);

  // Helper: group clock events by employee (memoized for performance)
  const clockEventsByEmployee = useMemo(() => {
    return employees.reduce((acc, emp) => {
      acc[emp.id] = clockEvents.filter(ev => ev.employee_id === emp.id);
      return acc;
    }, {} as Record<string, ClockEvent[]>);
  }, [employees, clockEvents]);

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

  // Show loading state while fetching initial data
  if (initialLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={{ color: themeColors.text, marginTop: 16, fontSize: 16 }}>Loading clock events...</Text>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: themeColors.background, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#c62828', fontSize: 16, textAlign: 'center', marginBottom: 16 }}>{error}</Text>
        <TouchableOpacity
          onPress={() => {
            setError(null);
            setInitialLoading(true);
            // Re-trigger the useEffect by changing a dependency
            setPage(prev => prev + 1);
          }}
          style={{ backgroundColor: themeColors.primary, padding: 12, borderRadius: 8 }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: themeColors.background, padding: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.primary }}>
          Clock Events
        </Text>
        {loading && (
          <ActivityIndicator size="small" color={themeColors.primary} />
        )}
      </View>
      
      {clockEvents.length === 0 ? (
        <View style={{ backgroundColor: themeColors.surface, borderRadius: 16, padding: 20, alignItems: 'center' }}>
          <Text style={{ color: themeColors.textSecondary, fontSize: 16, textAlign: 'center' }}>
            No clock events found for the last 7 days
          </Text>
        </View>
      ) : (
        employees.map(emp => {
          const events = clockEventsByEmployee[emp.id] || [];
          const todayEvents = getEventsForDay(events, new Date());
          const weekEvents = getEventsForWeek(events);
          
          // Only show employees with recent events to improve performance
          if (events.length === 0) return null;
          
          return (
          <View key={emp.id} style={{ backgroundColor: themeColors.surface, borderRadius: 16, padding: 20, marginBottom: 18, shadowColor: themeColors.shadow, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 }}>
            <TouchableOpacity onPress={() => handleExpand(emp.id)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: themeColors.primary, marginBottom: 2 }}>{emp.name}</Text>
                <Text style={{ color: themeColors.textSecondary, fontSize: 14, marginBottom: 6 }}>{emp.code}</Text>
              </View>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold', fontSize: 16 }}>{expanded === emp.id ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {/* Today's events */}
            <View style={{ marginTop: 10 }}>
              <Text style={{ fontWeight: 'bold', color: themeColors.text, marginBottom: 4 }}>Today</Text>
              {todayEvents.length === 0 ? (
                <Text style={{ color: themeColors.textSecondary, fontStyle: 'italic', marginBottom: 4 }}>No clock events today</Text>
              ) : (
                todayEvents.map((event: ClockEvent, idx: number) => (
                  <View key={event.id || idx} style={{ backgroundColor: themeColors.background, borderRadius: 8, padding: 10, marginBottom: 4 }}>
                    {event.clock_in && <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Clock In: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.clock_in).toLocaleTimeString()}</Text></Text>}
                    {event.lunch_start && <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>Lunch Start: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.lunch_start).toLocaleTimeString()}</Text></Text>}
                    {event.lunch_end && <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Lunch End: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.lunch_end).toLocaleTimeString()}</Text></Text>}
                    {event.clock_out && <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Clock Out: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.clock_out).toLocaleTimeString()}</Text></Text>}
                  </View>
                ))
              )}
            </View>
            {/* Weekly events (expandable) */}
            {expanded === emp.id && (
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontWeight: 'bold', color: themeColors.text, marginBottom: 4 }}>This Week</Text>
                {weekEvents.length === 0 ? (
                  <Text style={{ color: themeColors.textSecondary, fontStyle: 'italic', marginBottom: 4 }}>No clock events this week</Text>
                ) : (
                  weekEvents.map((event: ClockEvent, idx: number) => (
                    <View key={event.id || idx} style={{ backgroundColor: themeColors.background, borderRadius: 6, padding: 8, marginBottom: 4 }}>
                      {event.clock_in && <Text style={{ color: '#388e3c', fontWeight: 'bold' }}>Clock In: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.clock_in).toLocaleString()}</Text></Text>}
                      {event.lunch_start && <Text style={{ color: '#ff9800', fontWeight: 'bold' }}>Lunch Start: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.lunch_start).toLocaleString()}</Text></Text>}
                      {event.lunch_end && <Text style={{ color: '#1976d2', fontWeight: 'bold' }}>Lunch End: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.lunch_end).toLocaleString()}</Text></Text>}
                      {event.clock_out && <Text style={{ color: '#c62828', fontWeight: 'bold' }}>Clock Out: <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>{new Date(event.clock_out).toLocaleString()}</Text></Text>}
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
          );
        })
      )}
    </ScrollView>
  );
};

export default memo(ClockEventsTab); 