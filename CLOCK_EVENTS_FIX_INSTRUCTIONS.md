# Clock Events Fix Instructions

## Problem Identified
The clock events functionality is not working correctly due to:
1. **Database Schema Issues**: Outdated table structure
2. **Column Mismatches**: Application expecting different column names than database
3. **RLS Policy Issues**: Missing or incorrect Row Level Security policies
4. **Query Problems**: Inconsistent timestamp column usage

## Solution Overview
I've created a comprehensive fix that:
- ✅ Recreates the clock_events table with proper structure
- ✅ Updates application code to use simplified schema
- ✅ Adds proper RLS policies and indexes
- ✅ Creates utility functions for clock event management

## Step 1: Apply Database Fixes

**IMPORTANT**: This will recreate your clock_events table. Any existing data will be lost.

1. **Go to your Supabase Dashboard**
2. **Navigate to SQL Editor**
3. **Copy the entire contents of `fix_clock_events.sql`**
4. **Paste and run the SQL script**

The script will:
- Drop and recreate the clock_events table with correct structure
- Add proper indexes for performance
- Create RLS policies for security
- Add utility functions for clock event management

## Step 2: Verify the Fix

After running the SQL script, check:

### 2.1 Table Structure
```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'clock_events' 
ORDER BY ordinal_position;
```

Expected columns:
- `id` (UUID, Primary Key)
- `business_id` (UUID, Foreign Key)
- `employee_id` (UUID, Foreign Key)
- `action` (VARCHAR - 'in', 'out', 'lunch', 'lunchBack')
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `notes` (TEXT, Optional)
- `location` (VARCHAR, Optional)
- `updated_at` (TIMESTAMP WITH TIME ZONE)

### 2.2 Indexes
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'clock_events';
```

### 2.3 RLS Policies
```sql
SELECT policyname FROM pg_policies WHERE tablename = 'clock_events';
```

## Step 3: Test the Application

1. **Restart your Expo development server**:
   ```bash
   npx expo start --clear
   ```

2. **Test Clock Events**:
   - Try clocking in/out as an employee
   - Check admin dashboard clock events tab
   - Verify events are stored and displayed correctly

## New Clock Events Schema

### Simple Structure
Each clock event is now a single record with:
- `action`: What type of event ('in', 'out', 'lunch', 'lunchBack')
- `created_at`: When the event occurred
- `employee_id`: Who performed the action
- `business_id`: Which business this belongs to

### Example Data
```sql
-- Clock in
INSERT INTO clock_events (business_id, employee_id, action) 
VALUES ('business-uuid', 'employee-uuid', 'in');

-- Clock out  
INSERT INTO clock_events (business_id, employee_id, action) 
VALUES ('business-uuid', 'employee-uuid', 'out');
```

## Updated Application Code

The following files have been updated:
- ✅ `services/cloud.js` - Updated logClockEvent function
- ✅ `app/screens/EmployeeDashboardScreen.tsx` - Simplified clock event insertion
- ✅ `components/admin/ClockEventsTab.tsx` - Updated to use created_at column
- ✅ `components/utility/types.ts` - Updated ClockEvent interface

## Troubleshooting

### Issue: "Column doesn't exist" errors
**Solution**: Make sure you ran the SQL script completely. The table structure needs to be recreated.

### Issue: "Permission denied" errors  
**Solution**: Check that RLS policies were created properly:
```sql
SELECT * FROM pg_policies WHERE tablename = 'clock_events';
```

### Issue: Clock events not appearing
**Solution**: 
1. Check browser console for errors
2. Verify your user has the correct business_id
3. Check that employees exist in the database

### Issue: Duplicate prevention not working
**Solution**: The application includes 1-minute duplicate prevention. This is working as designed.

## Status After Fix

**Expected Results**:
- ✅ Clock events load properly in admin dashboard
- ✅ Employees can clock in/out successfully  
- ✅ Events are stored with correct timestamps
- ✅ No more "column doesn't exist" errors
- ✅ Proper data filtering by business
- ✅ Performance improvements with proper indexing

## Next Steps

After confirming the fix works:

1. **Monitor Performance**: The new indexes should improve query speed
2. **Test All Scenarios**: Try different clock event combinations
3. **Check Reporting**: Ensure any time tracking reports still work
4. **Backup Strategy**: Consider regular backups now that the schema is stable

---

**Need Help?** If you encounter any issues, check:
1. Supabase logs in the dashboard
2. Browser console for JavaScript errors  
3. Network tab to see if API calls are failing
