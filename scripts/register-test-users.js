#!/usr/bin/env node

/**
 * Script to register test users with Supabase Auth
 * Run with: node scripts/register-test-users.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkZmhrbGlrbWt5ZXFzaXVhcGpnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MTgxNTQsImV4cCI6MjA2NzM5NDE1NH0.peZxjF2MbN9kBg4VVpQoSGjQblSTa24z4s0iiWqHfxA';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const testUsers = [
  { email: 'mekaylin@silvertoncc.co.za', password: 'SCC1234' },
  { email: 'john.doe@example.com', password: 'password123' },
  { email: 'jane.smith@example.com', password: 'password123' },
  { email: 'mike.johnson@example.com', password: 'password123' },
  { email: 'sarah.wilson@example.com', password: 'password123' },
];

async function registerUsers() {
  for (const user of testUsers) {
    console.log(`Registering ${user.email}...`);
    const { data, error } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });
    if (error) {
      if (error.message.includes('User already registered')) {
        console.log(`  - Already registered.`);
      } else {
        console.error(`  - Error: ${error.message}`);
      }
    } else {
      console.log('  - Registered successfully!');
    }
  }
  console.log('\nDone!');
}

registerUsers(); 