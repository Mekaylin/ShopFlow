const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://qdfhklikmkyeqsiuapjg.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTestBusinesses() {
  try {
    console.log('Adding test businesses...');

    // Add test businesses
    const testBusinesses = [
      {
        id: 'test-business-1',
        name: 'Test Business 1',
        code: 'TEST1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'test-business-2', 
        name: 'Test Business 2',
        code: 'TEST2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-business',
        name: 'Demo Business',
        code: 'DEMO',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    for (const business of testBusinesses) {
      const { data, error } = await supabase
        .from('businesses')
        .upsert(business, { onConflict: 'id' });

      if (error) {
        console.error(`Error adding business ${business.code}:`, error);
      } else {
        console.log(`✅ Added business: ${business.name} (${business.code})`);
      }
    }

    console.log('\n🎉 Test businesses added successfully!');
    console.log('\nYou can now test the app with:');
    console.log('- Business Code: TEST1, User Code: admin123');
    console.log('- Business Code: TEST1, User Code: emp123');
    console.log('- Business Code: TEST2, User Code: admin123');
    console.log('- Business Code: DEMO, User Code: admin123');

  } catch (error) {
    console.error('Error adding test businesses:', error);
  }
}

addTestBusinesses(); 