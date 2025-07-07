#!/usr/bin/env node

/**
 * Script to setup the users table in Supabase
 * Run with: node scripts/setup-users-table.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (same as in app.json)
const supabaseUrl = 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmhrbGlrbWt5ZXFzaXVhcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTgxNTQsImV4cCI6MjA2NzM5NDE1NH0.peZxjF2MbN9kBg4VVpQoSGjQblSTa24z4s0iiWqHfxA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupUsersTable() {
  console.log('🔍 Checking users table structure...\n');

  try {
    // First, let's try to get the table structure
    console.log('📋 Checking if users table exists...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('❌ Users table might not exist or have different structure');
      console.log('Error:', tableError.message);
      
      console.log('\n💡 You need to create the users table in your Supabase dashboard:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to "Table Editor"');
      console.log('3. Click "Create a new table"');
      console.log('4. Name it "users"');
      console.log('5. Add these columns:');
      console.log('   - id (int8, primary key)');
      console.log('   - name (text)');
      console.log('   - email (text, unique)');
      console.log('   - password (text)');
      console.log('   - role (text)');
      console.log('   - created_at (timestamptz)');
      console.log('6. Save the table');
      console.log('\nThen run this script again.');
      return;
    }

    // If we get here, the table exists, let's see what columns it has
    console.log('✅ Users table exists!');
    console.log('\n📊 Current table structure:');
    
    // Try to insert a test record to see what columns are missing
    const testRecord = {
      id: '550e8400-e29b-41d4-a716-446655440999',
      name: 'Test User',
      email: 'test@example.com',
      password: 'test123',
      role: 'employee',
      created_at: new Date().toISOString()
    };

    const { error: insertError } = await supabase
      .from('users')
      .insert(testRecord);

    if (insertError) {
      console.log('❌ Error inserting test record:', insertError.message);
      console.log('\n💡 The table exists but is missing some columns.');
      console.log('You need to add these columns to your users table:');
      console.log('- name (text)');
      console.log('- email (text)');
      console.log('- password (text)');
      console.log('- role (text)');
      console.log('- created_at (timestamptz)');
    } else {
      console.log('✅ Table structure is correct!');
      
      // Clean up the test record
      await supabase
        .from('users')
        .delete()
        .eq('id', '550e8400-e29b-41d4-a716-446655440999');
      
      console.log('🧹 Cleaned up test record');
      console.log('\n✅ Your users table is ready! You can now run:');
      console.log('   node scripts/add-test-users.js');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
setupUsersTable(); 