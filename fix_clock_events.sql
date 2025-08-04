-- Clock Events Comprehensive Fix
-- This script addresses all clock events loading/storing issues
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: ENSURE CLOCK_EVENTS TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================================================

-- Drop and recreate clock_events table with proper structure
DROP TABLE IF EXISTS clock_events CASCADE;

CREATE TABLE clock_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    
    -- Action type for this clock event
    action VARCHAR(20) NOT NULL CHECK (action IN ('in', 'out', 'lunch', 'lunchBack')),
    
    -- Timestamp columns - use created_at as the main timestamp
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Legacy timestamp columns for backward compatibility (DEPRECATED)
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    lunch_start TIMESTAMP WITH TIME ZONE,
    lunch_end TIMESTAMP WITH TIME ZONE,
    
    -- Additional metadata
    notes TEXT,
    location VARCHAR(255),
    
    -- Audit fields
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 2: CREATE ESSENTIAL INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_clock_events_business_id ON clock_events(business_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_employee_id ON clock_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_created_at ON clock_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clock_events_action ON clock_events(action);
CREATE INDEX IF NOT EXISTS idx_clock_events_business_employee ON clock_events(business_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_employee_created ON clock_events(employee_id, created_at DESC);

-- ============================================================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view clock events for their business" ON clock_events;
DROP POLICY IF EXISTS "Users can insert clock events for their business" ON clock_events;
DROP POLICY IF EXISTS "Users can update clock events for their business" ON clock_events;
DROP POLICY IF EXISTS "Admins can delete clock events for their business" ON clock_events;

-- ============================================================================
-- STEP 4: CREATE PROPER RLS POLICIES
-- ============================================================================

-- Policy: Users can view clock events for their business
CREATE POLICY "Users can view clock events for their business" ON clock_events
    FOR SELECT
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert clock events for their business
CREATE POLICY "Users can insert clock events for their business" ON clock_events
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Users can update clock events for their business
CREATE POLICY "Users can update clock events for their business" ON clock_events
    FOR UPDATE
    USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- Policy: Admins can delete clock events for their business
CREATE POLICY "Admins can delete clock events for their business" ON clock_events
    FOR DELETE
    USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================================
-- STEP 5: CREATE TRIGGER FOR AUTOMATIC TIMESTAMP UPDATES
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_clock_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_clock_events_updated_at ON clock_events;
CREATE TRIGGER trigger_update_clock_events_updated_at
    BEFORE UPDATE ON clock_events
    FOR EACH ROW
    EXECUTE FUNCTION update_clock_events_updated_at();

-- ============================================================================
-- STEP 6: CREATE USEFUL FUNCTIONS FOR CLOCK EVENTS
-- ============================================================================

-- Function to get today's clock events for an employee
CREATE OR REPLACE FUNCTION get_employee_clock_events_today(emp_id UUID)
RETURNS TABLE (
    id UUID,
    action VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ce.id, ce.action, ce.created_at, ce.notes
    FROM clock_events ce
    WHERE ce.employee_id = emp_id
    AND DATE(ce.created_at) = CURRENT_DATE
    ORDER BY ce.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the latest clock event for an employee
CREATE OR REPLACE FUNCTION get_employee_latest_clock_event(emp_id UUID)
RETURNS TABLE (
    id UUID,
    action VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT ce.id, ce.action, ce.created_at, ce.notes
    FROM clock_events ce
    WHERE ce.employee_id = emp_id
    ORDER BY ce.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate work hours for an employee on a specific date
CREATE OR REPLACE FUNCTION calculate_work_hours(emp_id UUID, work_date DATE)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    total_hours DECIMAL(5,2) := 0;
    clock_in_time TIMESTAMP;
    clock_out_time TIMESTAMP;
    lunch_start_time TIMESTAMP;
    lunch_end_time TIMESTAMP;
    work_minutes INTEGER := 0;
    lunch_minutes INTEGER := 0;
BEGIN
    -- Get clock in time
    SELECT created_at INTO clock_in_time
    FROM clock_events
    WHERE employee_id = emp_id
    AND DATE(created_at) = work_date
    AND action = 'in'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Get clock out time
    SELECT created_at INTO clock_out_time
    FROM clock_events
    WHERE employee_id = emp_id
    AND DATE(created_at) = work_date
    AND action = 'out'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Get lunch start time
    SELECT created_at INTO lunch_start_time
    FROM clock_events
    WHERE employee_id = emp_id
    AND DATE(created_at) = work_date
    AND action = 'lunch'
    ORDER BY created_at ASC
    LIMIT 1;

    -- Get lunch end time
    SELECT created_at INTO lunch_end_time
    FROM clock_events
    WHERE employee_id = emp_id
    AND DATE(created_at) = work_date
    AND action = 'lunchBack'
    ORDER BY created_at DESC
    LIMIT 1;

    -- Calculate work time if we have both clock in and out
    IF clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN
        work_minutes := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 60;
        
        -- Subtract lunch time if both lunch times are available
        IF lunch_start_time IS NOT NULL AND lunch_end_time IS NOT NULL THEN
            lunch_minutes := EXTRACT(EPOCH FROM (lunch_end_time - lunch_start_time)) / 60;
            work_minutes := work_minutes - lunch_minutes;
        END IF;
        
        total_hours := work_minutes / 60.0;
    END IF;

    RETURN GREATEST(total_hours, 0); -- Ensure no negative hours
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON clock_events TO authenticated;
GRANT SELECT ON clock_events TO anon;

-- Grant function permissions
GRANT EXECUTE ON FUNCTION get_employee_clock_events_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_latest_clock_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_work_hours(UUID, DATE) TO authenticated;

-- ============================================================================
-- STEP 8: CREATE SAMPLE DATA (OPTIONAL - FOR TESTING)
-- ============================================================================

-- Uncomment the following to insert sample clock events for testing
/*
-- Insert sample clock events (adjust UUIDs as needed)
INSERT INTO clock_events (business_id, employee_id, action, created_at) VALUES
    ('your-business-id', 'your-employee-id', 'in', NOW() - INTERVAL '8 hours'),
    ('your-business-id', 'your-employee-id', 'lunch', NOW() - INTERVAL '4 hours'),
    ('your-business-id', 'your-employee-id', 'lunchBack', NOW() - INTERVAL '3 hours'),
    ('your-business-id', 'your-employee-id', 'out', NOW() - INTERVAL '1 hour');
*/

-- ============================================================================
-- STEP 9: VERIFICATION QUERIES
-- ============================================================================

-- Check table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'clock_events'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'clock_events';

-- Check RLS policies
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'clock_events';

-- Success message
SELECT 'Clock events table has been successfully created and configured!' as status,
       'You can now use the clock events functionality properly.' as message;
