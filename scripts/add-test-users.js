#!/usr/bin/env node

/**
 * Script to add test users to Supabase database
 * Run with: node scripts/add-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials (same as in app.json)
const supabaseUrl = 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmhrbGlrbWt5ZXFzaXVhcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTgxNTQsImV4cCI6MjA2NzM5NDE1NH0.peZxjF2MbN9kBg4VVpQoSGjQblSTa24z4s0iiWqHfxA';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Test users data
const testUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'Mekaylin',
    email: 'mekaylin@silvertoncc.co.za',
    password: 'SCC1234',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'admin',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    password: 'password123',
    role: 'employee',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: 'Mike Johnson',
    email: 'mike.johnson@example.com',
    password: 'password123',
    role: 'employee',
    created_at: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: 'Sarah Wilson',
    email: 'sarah.wilson@example.com',
    password: 'password123',
    role: 'employee',
    created_at: new Date().toISOString()
  }
];

async function addTestUsers() {
  console.log('🚀 Adding test users to Supabase...\n');

  try {
    // First, let's check if the users table exists and see current data
    console.log('📋 Checking existing users...');
    const { data: existingUsers, error: fetchError } = await supabase
      .from('users')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching existing users:', fetchError.message);
      console.log('\n💡 This might mean the users table doesn\'t exist yet.');
      console.log('   You may need to create the table in your Supabase dashboard first.');
      return;
    }

    console.log(`📊 Found ${existingUsers?.length || 0} existing users`);

    // Add test users
    console.log('\n➕ Adding test users...');
    const { data: newUsers, error: insertError } = await supabase
      .from('users')
      .insert(testUsers)
      .select();

    if (insertError) {
      console.error('❌ Error adding test users:', insertError.message);
      
      // If it's a duplicate key error, try updating instead
      if (insertError.message.includes('duplicate key')) {
        console.log('\n🔄 Trying to update existing users instead...');
        for (const user of testUsers) {
          const { error: updateError } = await supabase
            .from('users')
            .upsert(user, { onConflict: 'id' });
          
          if (updateError) {
            console.error(`❌ Error updating user ${user.name}:`, updateError.message);
          } else {
            console.log(`✅ Updated user: ${user.name}`);
          }
        }
      }
      return;
    }

    console.log('✅ Successfully added test users!');
    console.log('\n📋 New users added:');
    newUsers?.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`);
    });

    // Show all users
    console.log('\n📊 All users in database:');
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .order('id');

    allUsers?.forEach(user => {
      console.log(`   ${user.id}. ${user.name} (${user.email}) - ${user.role}`);
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
addTestUsers(); 