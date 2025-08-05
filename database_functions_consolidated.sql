-- ===========================
-- CONSOLIDATED DATABASE FUNCTIONS
-- This file contains all unique database functions for ShopFlow
-- Replaces scattered duplicate functions across multiple SQL files
-- ===========================

-- 1. PERFORMANCE MANAGEMENT FUNCTIONS
-- ===========================

-- Calculate performance metrics for an employee
CREATE OR REPLACE FUNCTION calculate_performance_metrics(
    emp_id UUID,
    business_uuid UUID,
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    employee_id UUID,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    completion_rate DECIMAL,
    avg_rating DECIMAL,
    total_ratings INTEGER,
    on_time_completions INTEGER,
    late_completions INTEGER,
    punctuality_rate DECIMAL
) 
LANGUAGE plpgsql AS $$
BEGIN
    -- Set default date range if not provided
    IF start_date IS NULL THEN
        start_date := CURRENT_DATE - INTERVAL '30 days';
    END IF;
    
    IF end_date IS NULL THEN
        end_date := CURRENT_DATE;
    END IF;

    RETURN QUERY
    SELECT 
        emp_id as employee_id,
        COUNT(t.id)::INTEGER as total_tasks,
        COUNT(CASE WHEN t.completed THEN 1 END)::INTEGER as completed_tasks,
        CASE 
            WHEN COUNT(t.id) > 0 THEN 
                ROUND((COUNT(CASE WHEN t.completed THEN 1 END)::DECIMAL / COUNT(t.id)::DECIMAL) * 100, 2)
            ELSE 0
        END as completion_rate,
        COALESCE(ROUND(AVG(tr.rating), 2), 0) as avg_rating,
        COUNT(tr.rating)::INTEGER as total_ratings,
        COUNT(CASE WHEN t.completed AND t.completed_at <= t.deadline THEN 1 END)::INTEGER as on_time_completions,
        COUNT(CASE WHEN t.completed AND t.completed_at > t.deadline THEN 1 END)::INTEGER as late_completions,
        CASE 
            WHEN COUNT(CASE WHEN t.completed THEN 1 END) > 0 THEN 
                ROUND((COUNT(CASE WHEN t.completed AND t.completed_at <= t.deadline THEN 1 END)::DECIMAL / 
                       COUNT(CASE WHEN t.completed THEN 1 END)::DECIMAL) * 100, 2)
            ELSE 0
        END as punctuality_rate
    FROM tasks t
    LEFT JOIN task_ratings tr ON t.id = tr.task_id
    WHERE t.assigned_to = emp_id 
        AND t.business_id = business_uuid
        AND DATE(t.created_at) BETWEEN start_date AND end_date;
END;
$$;

-- Auto-rate completed tasks trigger function
CREATE OR REPLACE FUNCTION auto_rate_completed_task()
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
DECLARE
    settings_record RECORD;
    default_rating_val INTEGER;
BEGIN
    -- Only proceed if task was just completed
    IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
        
        -- Get performance settings for this business
        SELECT * INTO settings_record 
        FROM performance_settings 
        WHERE business_id = NEW.business_id;
        
        -- Check if auto-rating is enabled
        IF settings_record.auto_rate_completed_tasks = true THEN
            default_rating_val := COALESCE(settings_record.default_rating, 3);
            
            -- Insert auto-rating
            INSERT INTO task_ratings (
                task_id, 
                employee_id, 
                rating, 
                feedback, 
                business_id,
                rated_at
            ) VALUES (
                NEW.id,
                NEW.assigned_to::UUID,
                default_rating_val,
                'Auto-rated upon completion',
                NEW.business_id,
                NOW()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 2. VEHICLE SCAN FUNCTIONS
-- ===========================

-- Auto-update updated_at timestamp for vehicle scans
CREATE OR REPLACE FUNCTION update_vehicle_scans_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Get scan statistics for a business
CREATE OR REPLACE FUNCTION get_scan_statistics(business_uuid UUID)
RETURNS TABLE (
    total_scans BIGINT,
    scans_today BIGINT,
    scans_this_week BIGINT,
    scans_this_month BIGINT,
    unique_licenses BIGINT,
    duplicate_scans BIGINT
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as scans_today,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('week', CURRENT_DATE)) as scans_this_week,
        COUNT(*) FILTER (WHERE created_at >= date_trunc('month', CURRENT_DATE)) as scans_this_month,
        COUNT(DISTINCT license_number) as unique_licenses,
        COUNT(*) - COUNT(DISTINCT license_number) as duplicate_scans
    FROM vehicle_scans 
    WHERE business_id = business_uuid;
END;
$$;

-- Check for duplicate license within business
CREATE OR REPLACE FUNCTION check_duplicate_license(
    license_num VARCHAR(20), 
    business_uuid UUID, 
    exclude_scan_id UUID DEFAULT NULL
)
RETURNS TABLE (
    is_duplicate BOOLEAN,
    existing_scan_id UUID,
    existing_scan_date TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        EXISTS(
            SELECT 1 FROM vehicle_scans 
            WHERE license_number = license_num 
                AND business_id = business_uuid 
                AND (exclude_scan_id IS NULL OR id != exclude_scan_id)
        ) as is_duplicate,
        (SELECT id FROM vehicle_scans 
         WHERE license_number = license_num 
             AND business_id = business_uuid 
             AND (exclude_scan_id IS NULL OR id != exclude_scan_id) 
         LIMIT 1) as existing_scan_id,
        (SELECT created_at FROM vehicle_scans 
         WHERE license_number = license_num 
             AND business_id = business_uuid 
             AND (exclude_scan_id IS NULL OR id != exclude_scan_id) 
         LIMIT 1) as existing_scan_date;
END;
$$;

-- 3. CLOCK EVENT FUNCTIONS
-- ===========================

-- Auto-update updated_at timestamp for clock events
CREATE OR REPLACE FUNCTION update_clock_events_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Get employee clock events for today
CREATE OR REPLACE FUNCTION get_employee_clock_events_today(emp_id UUID)
RETURNS TABLE (
    id UUID,
    action VARCHAR(20),
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT ce.id, ce.action, ce.clock_in, ce.clock_out, ce.created_at
    FROM clock_events ce
    WHERE ce.employee_id = emp_id 
        AND DATE(ce.created_at) = CURRENT_DATE
    ORDER BY ce.created_at DESC;
END;
$$;

-- Get employee's latest clock event
CREATE OR REPLACE FUNCTION get_employee_latest_clock_event(emp_id UUID)
RETURNS TABLE (
    id UUID,
    action VARCHAR(20),
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT ce.id, ce.action, ce.clock_in, ce.clock_out, ce.created_at
    FROM clock_events ce
    WHERE ce.employee_id = emp_id
    ORDER BY ce.created_at DESC
    LIMIT 1;
END;
$$;

-- Calculate work hours for an employee on a specific date
CREATE OR REPLACE FUNCTION calculate_work_hours(emp_id UUID, work_date DATE)
RETURNS DECIMAL 
LANGUAGE plpgsql AS $$
DECLARE
    total_hours DECIMAL := 0;
    clock_in_time TIMESTAMP WITH TIME ZONE;
    clock_out_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get the clock in and clock out times for the specified date
    SELECT 
        MIN(CASE WHEN action = 'in' THEN created_at END),
        MAX(CASE WHEN action = 'out' THEN created_at END)
    INTO clock_in_time, clock_out_time
    FROM clock_events
    WHERE employee_id = emp_id 
        AND DATE(created_at) = work_date;
    
    -- Calculate hours if both times exist
    IF clock_in_time IS NOT NULL AND clock_out_time IS NOT NULL THEN
        total_hours := EXTRACT(EPOCH FROM (clock_out_time - clock_in_time)) / 3600;
    END IF;
    
    RETURN COALESCE(total_hours, 0);
END;
$$;

-- ===========================
-- FUNCTION GRANTS
-- ===========================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_performance_metrics(UUID, UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION auto_rate_completed_task() TO authenticated;
GRANT EXECUTE ON FUNCTION update_vehicle_scans_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_license(VARCHAR(20), UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_clock_events_updated_at() TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_clock_events_today(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_latest_clock_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_work_hours(UUID, DATE) TO authenticated;

-- ===========================
-- TRIGGERS
-- ===========================

-- Create triggers for auto-rating completed tasks
DROP TRIGGER IF EXISTS trigger_auto_rate_completed_task ON tasks;
CREATE TRIGGER trigger_auto_rate_completed_task
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION auto_rate_completed_task();

-- Create triggers for vehicle scans updated_at
DROP TRIGGER IF EXISTS trigger_update_vehicle_scans_updated_at ON vehicle_scans;
CREATE TRIGGER trigger_update_vehicle_scans_updated_at
    BEFORE UPDATE ON vehicle_scans
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicle_scans_updated_at();

-- Create triggers for clock events updated_at
DROP TRIGGER IF EXISTS trigger_update_clock_events_updated_at ON clock_events;
CREATE TRIGGER trigger_update_clock_events_updated_at
    BEFORE UPDATE ON clock_events
    FOR EACH ROW
    EXECUTE FUNCTION update_clock_events_updated_at();
