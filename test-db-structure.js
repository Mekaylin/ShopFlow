// Quick test to check current database structure
// Run this in the terminal: node test-db-structure.js

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmhrbGlrbWt5ZXFzaXVhcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTgxNTQsImV4cCI6MjA2NzM5NDE1NH0.peZxjF2MbN9kBg4VVpQoSGjQblSTa24z4s0iiWqHfxA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testDatabaseStructure() {
  console.log('Testing current clock_events database structure...');
  
  try {
    // Test 1: Check if table exists and get sample data
    const { data, error } = await supabase
      .from('clock_events')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching clock_events:', error);
      return;
    }
    
    console.log('Sample clock_events record:');
    console.log(JSON.stringify(data[0], null, 2));
    
    // Test 2: Check table structure by examining column names
    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('Table columns:', columns);
      
      // Check if new schema (action field) or old schema (clock_in, clock_out)
      if (columns.includes('action')) {
        console.log('✅ NEW SCHEMA DETECTED - using action-based structure');
      } else if (columns.includes('clock_in') || columns.includes('clock_out')) {
        console.log('❌ OLD SCHEMA DETECTED - still using legacy column structure');
        console.log('🔧 Need to apply fix_clock_events.sql script in Supabase Dashboard');
      } else {
        console.log('❓ UNKNOWN SCHEMA - unexpected table structure');
      }
    } else {
      console.log('No clock_events records found - checking table structure differently...');
      
      // Get table info from information_schema
      const { data: tableInfo, error: tableError } = await supabase
        .rpc('get_table_columns', { table_name: 'clock_events' });
      
      if (tableError) {
        console.log('Could not determine table structure');
      } else {
        console.log('Table structure:', tableInfo);
      }
    }
    
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testDatabaseStructure();
