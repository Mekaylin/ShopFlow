import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Colors } from '../../constants/Colors';
import { supabase } from '../../lib/supabase';
import { createShadowStyle, shadowPresets } from '../../utils/shadowUtils';
import { ClockEvent, Employee } from '../utility/types';

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

  // Web-compatible animation setup
  useEffect(() => {
    // Only enable layout animation on native platforms
    if (Platform.OS === 'android') {
      try {
        const { UIManager } = require('react-native');
        if (UIManager?.setLayoutAnimationEnabledExperimental) {
          UIManager.setLayoutAnimationEnabledExperimental(true);
        }
      } catch (e) {
        // Silently fail on web
        console.log('Layout animation not available on this platform');
      }
    }
  }, []);

  // Fetch clock events for all employees in this business with pagination
  useEffect(() => {
    async function fetchClockEvents() {
      if (!user?.business_id) {
        setInitialLoading(false);
        setError('No business ID found');
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        console.log('Fetching clock events for business:', user.business_id);
        
        // Get recent events first (last 30 days) for better performance on web
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data, error } = await supabase
          .from('clock_events')
          .select('*')
          .eq('business_id', user.business_id)
          .gte('created_at', thirtyDaysAgo.toISOString())
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
      const eventDate = new Date(ev.created_at);
      
      // Debug logging
      console.log(`[ClockEvents] Comparing event date ${eventDate.toDateString()} with target date ${date.toDateString()}`);
      console.log(`[ClockEvents] Event created_at: ${ev.created_at}, Parsed: ${eventDate.toString()}`);
      
      // Use date string comparison to avoid timezone issues
      const eventDateStr = eventDate.toDateString();
      const targetDateStr = date.toDateString();
      
      return eventDateStr === targetDateStr;
    });
  }
  
  function getEventsForWeek(events: ClockEvent[]): ClockEvent[] {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(now.getDate() - 6);
    return events.filter((ev: ClockEvent) => {
      const eventDate = new Date(ev.created_at);
      return eventDate >= weekAgo && eventDate <= now;
    });
  }

  const [expanded, setExpanded] = useState<string | null>(null);
  const handleExpand = (id: string) => {
    // Use web-compatible animation
    if (Platform.OS !== 'web') {
      try {
        const { LayoutAnimation } = require('react-native');
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (e) {
        // Silently fail if LayoutAnimation is not available
      }
    }
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
          
          // Debug logging for clock events
          if (events.length > 0) {
            console.log(`[ClockEvents] Employee ${emp.name} has ${events.length} total events`);
            console.log(`[ClockEvents] Today events for ${emp.name}:`, todayEvents.length, todayEvents);
            console.log(`[ClockEvents] Sample event structure:`, events[0]);
          }
          
          // Only show employees with recent events to improve performance
          if (events.length === 0) return null;
          
          return (
          <View key={emp.id} style={{
            backgroundColor: themeColors.surface,
            borderRadius: 16,
            padding: 20,
            marginBottom: 18,
            ...createShadowStyle(shadowPresets.card)
          }}>
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
                    <Text style={{ 
                      color: event.action === 'in' ? '#388e3c' : 
                             event.action === 'out' ? '#c62828' : 
                             event.action === 'lunch' ? '#ff9800' : 
                             event.action === 'lunchBack' ? '#1976d2' : themeColors.text, 
                      fontWeight: 'bold' 
                    }}>
                      {event.action === 'in' ? 'Clock In' :
                       event.action === 'out' ? 'Clock Out' :
                       event.action === 'lunch' ? 'Lunch Start' :
                       event.action === 'lunchBack' ? 'Lunch End' : event.action}: {' '}
                      <Text style={{ color: themeColors.text, fontWeight: 'normal' }}>
                        {new Date(event.created_at).toLocaleTimeString()}
                      </Text>
                    </Text>
                    {event.notes && (
                      <Text style={{ color: themeColors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {event.notes}
                      </Text>
                    )}
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