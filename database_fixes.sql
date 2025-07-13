-- ShopFlow Database Fixes and Optimizations
-- Run this in Supabase SQL Editor

-- Fix 1: Add missing RPC function for calculating performance metrics for all employees
CREATE OR REPLACE FUNCTION calculate_performance_metrics(
    business_id_param UUID
) RETURNS JSON AS $$
DECLARE
    v_employee RECORD;
    v_result JSON;
    v_metrics JSON[] := '{}';
BEGIN
    -- Loop through all employees in the business
    FOR v_employee IN 
        SELECT id, name 
        FROM employees 
        WHERE business_id = business_id_param
    LOOP
        -- Calculate metrics for each employee
        SELECT json_build_object(
            'employee_id', v_employee.id,
            'employee_name', v_employee.name,
            'tasks_completed', COALESCE((
                SELECT COUNT(*) 
                FROM tasks t 
                WHERE t.assigned_to = v_employee.name 
                AND t.completed = true 
                AND t.business_id = business_id_param
            ), 0),
            'average_rating', COALESCE((
                SELECT AVG(tr.rating) 
                FROM task_ratings tr 
                WHERE tr.employee_id = v_employee.id 
                AND tr.business_id = business_id_param
            ), 0),
            'tasks_rated', COALESCE((
                SELECT COUNT(*) 
                FROM task_ratings tr 
                WHERE tr.employee_id = v_employee.id 
                AND tr.business_id = business_id_param
            ), 0)
        ) INTO v_result;
        
        v_metrics := array_append(v_metrics, v_result);
    END LOOP;
    
    RETURN json_build_object('employees', v_metrics);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 2: Add missing RPC function for bulk performance calculation
CREATE OR REPLACE FUNCTION calculate_bulk_performance_metrics(
    business_id_param UUID,
    period_type_param TEXT DEFAULT 'day'
) RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_employee RECORD;
    v_result JSON;
    v_metrics JSON[] := '{}';
BEGIN
    -- Calculate date range based on period type
    CASE period_type_param
        WHEN 'day' THEN
            v_start_date := CURRENT_DATE;
            v_end_date := CURRENT_DATE;
        WHEN 'week' THEN
            v_start_date := CURRENT_DATE - INTERVAL '6 days';
            v_end_date := CURRENT_DATE;
        WHEN 'month' THEN
            v_start_date := DATE_TRUNC('month', CURRENT_DATE);
            v_end_date := CURRENT_DATE;
        ELSE
            v_start_date := CURRENT_DATE;
            v_end_date := CURRENT_DATE;
    END CASE;
    
    -- Loop through all employees in the business
    FOR v_employee IN 
        SELECT id, name 
        FROM employees 
        WHERE business_id = business_id_param
    LOOP
        -- Calculate metrics for each employee in the period
        SELECT json_build_object(
            'employee_id', v_employee.id,
            'employee_name', v_employee.name,
            'period_type', period_type_param,
            'period_start', v_start_date,
            'period_end', v_end_date,
            'tasks_completed', COALESCE((
                SELECT COUNT(*) 
                FROM tasks t 
                WHERE t.assigned_to = v_employee.name 
                AND t.completed = true 
                AND t.completed_at::date BETWEEN v_start_date AND v_end_date
                AND t.business_id = business_id_param
            ), 0),
            'average_rating', COALESCE((
                SELECT AVG(tr.rating) 
                FROM task_ratings tr 
                WHERE tr.employee_id = v_employee.id 
                AND tr.rated_at::date BETWEEN v_start_date AND v_end_date
                AND tr.business_id = business_id_param
            ), 0),
            'tasks_rated', COALESCE((
                SELECT COUNT(*) 
                FROM task_ratings tr 
                WHERE tr.employee_id = v_employee.id 
                AND tr.rated_at::date BETWEEN v_start_date AND v_end_date
                AND tr.business_id = business_id_param
            ), 0)
        ) INTO v_result;
        
        v_metrics := array_append(v_metrics, v_result);
    END LOOP;
    
    RETURN json_build_object('employees', v_metrics);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 3: Add missing RPC function for getting employee performance summary
CREATE OR REPLACE FUNCTION get_employee_performance_summary(
    business_id_param UUID
) RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    average_rating DECIMAL(3,2),
    performance_score DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.name,
        COALESCE(task_counts.total_tasks, 0)::INTEGER,
        COALESCE(task_counts.completed_tasks, 0)::INTEGER,
        COALESCE(rating_stats.average_rating, 0)::DECIMAL(3,2),
        COALESCE(
            (task_counts.completed_tasks * 0.7) + (rating_stats.average_rating * 0.3), 
            0
        )::DECIMAL(5,2) as performance_score
    FROM employees e
    LEFT JOIN (
        SELECT 
            assigned_to,
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE completed = true) as completed_tasks
        FROM tasks 
        WHERE business_id = business_id_param
        GROUP BY assigned_to
    ) task_counts ON task_counts.assigned_to = e.name
    LEFT JOIN (
        SELECT 
            employee_id,
            AVG(rating) as average_rating
        FROM task_ratings 
        WHERE business_id = business_id_param
        GROUP BY employee_id
    ) rating_stats ON rating_stats.employee_id = e.id
    WHERE e.business_id = business_id_param
    ORDER BY performance_score DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 4: Add missing RPC function for getting business statistics
CREATE OR REPLACE FUNCTION get_business_statistics(
    business_id_param UUID
) RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_employees', (SELECT COUNT(*) FROM employees WHERE business_id = business_id_param),
        'total_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param),
        'completed_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND completed = true),
        'total_materials', (SELECT COUNT(*) FROM materials WHERE business_id = business_id_param),
        'average_rating', COALESCE((
            SELECT AVG(rating) 
            FROM task_ratings 
            WHERE business_id = business_id_param
        ), 0),
        'total_ratings', (SELECT COUNT(*) FROM task_ratings WHERE business_id = business_id_param)
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 5: Add missing RPC function for getting late tasks
CREATE OR REPLACE FUNCTION get_late_tasks(
    business_id_param UUID,
    threshold_minutes INTEGER DEFAULT 15
) RETURNS TABLE (
    task_id UUID,
    task_name TEXT,
    assigned_to TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    minutes_late INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.assigned_to,
        t.deadline,
        EXTRACT(EPOCH FROM (NOW() - t.deadline)) / 60::INTEGER as minutes_late
    FROM tasks t
    WHERE t.business_id = business_id_param
    AND t.completed = false
    AND t.deadline < NOW()
    AND EXTRACT(EPOCH FROM (NOW() - t.deadline)) / 60 > threshold_minutes
    ORDER BY t.deadline ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 6: Add missing RPC function for getting employee attendance
CREATE OR REPLACE FUNCTION get_employee_attendance(
    business_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    employee_id UUID,
    employee_name TEXT,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    hours_worked DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ce.employee_id,
        e.name,
        ce.clock_in,
        ce.clock_out,
        CASE 
            WHEN ce.clock_out IS NOT NULL THEN
                EXTRACT(EPOCH FROM (ce.clock_out - ce.clock_in)) / 3600
            ELSE 0
        END::DECIMAL(5,2) as hours_worked
    FROM clock_events ce
    JOIN employees e ON e.id = ce.employee_id
    WHERE ce.business_id = business_id_param
    AND ce.clock_in::date BETWEEN start_date AND end_date
    ORDER BY ce.clock_in DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 7: Add missing RPC function for getting material usage
CREATE OR REPLACE FUNCTION get_material_usage(
    business_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS TABLE (
    material_id UUID,
    material_name TEXT,
    total_quantity DECIMAL(10,2),
    unit TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        COALESCE(SUM(mu.quantity), 0)::DECIMAL(10,2) as total_quantity,
        m.unit
    FROM materials m
    LEFT JOIN (
        SELECT 
            t.business_id,
            (jsonb_array_elements(t.materials_used)->>'materialId')::UUID as material_id,
            (jsonb_array_elements(t.materials_used)->>'quantity')::DECIMAL as quantity
        FROM tasks t
        WHERE t.completed = true
        AND t.completed_at::date BETWEEN start_date AND end_date
    ) mu ON mu.material_id = m.id AND mu.business_id = m.business_id
    WHERE m.business_id = business_id_param
    GROUP BY m.id, m.name, m.unit
    ORDER BY total_quantity DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 8: Add missing RPC function for getting task statistics
CREATE OR REPLACE FUNCTION get_task_statistics(
    business_id_param UUID,
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    SELECT json_build_object(
        'total_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND start::date BETWEEN start_date AND end_date),
        'completed_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND completed = true AND completed_at::date BETWEEN start_date AND end_date),
        'late_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND completed = false AND deadline < NOW()),
        'average_completion_time', COALESCE((
            SELECT AVG(EXTRACT(EPOCH FROM (completed_at - start)) / 3600)
            FROM tasks 
            WHERE business_id = business_id_param 
            AND completed = true 
            AND completed_at IS NOT NULL
            AND start::date BETWEEN start_date AND end_date
        ), 0),
        'tasks_by_employee', (
            SELECT json_object_agg(assigned_to, task_count)
            FROM (
                SELECT assigned_to, COUNT(*) as task_count
                FROM tasks 
                WHERE business_id = business_id_param 
                AND start::date BETWEEN start_date AND end_date
                GROUP BY assigned_to
            ) t
        )
    ) INTO v_stats;
    
    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 9: Add missing RPC function for getting department statistics
CREATE OR REPLACE FUNCTION get_department_statistics(
    business_id_param UUID
) RETURNS TABLE (
    department_name TEXT,
    employee_count INTEGER,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    average_rating DECIMAL(3,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(e.department, 'No Department') as department_name,
        COUNT(DISTINCT e.id)::INTEGER as employee_count,
        COALESCE(task_stats.total_tasks, 0)::INTEGER as total_tasks,
        COALESCE(task_stats.completed_tasks, 0)::INTEGER as completed_tasks,
        COALESCE(rating_stats.average_rating, 0)::DECIMAL(3,2) as average_rating
    FROM employees e
    LEFT JOIN (
        SELECT 
            assigned_to,
            COUNT(*) as total_tasks,
            COUNT(*) FILTER (WHERE completed = true) as completed_tasks
        FROM tasks 
        WHERE business_id = business_id_param
        GROUP BY assigned_to
    ) task_stats ON task_stats.assigned_to = e.name
    LEFT JOIN (
        SELECT 
            employee_id,
            AVG(rating) as average_rating
        FROM task_ratings 
        WHERE business_id = business_id_param
        GROUP BY employee_id
    ) rating_stats ON rating_stats.employee_id = e.id
    WHERE e.business_id = business_id_param
    GROUP BY e.department, task_stats.total_tasks, task_stats.completed_tasks, rating_stats.average_rating
    ORDER BY employee_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix 10: Add missing RPC function for getting business dashboard data
CREATE OR REPLACE FUNCTION get_business_dashboard_data(
    business_id_param UUID,
    period_type TEXT DEFAULT 'day'
) RETURNS JSON AS $$
DECLARE
    v_start_date DATE;
    v_end_date DATE;
    v_dashboard_data JSON;
BEGIN
    -- Calculate date range based on period type
    CASE period_type
        WHEN 'day' THEN
            v_start_date := CURRENT_DATE;
            v_end_date := CURRENT_DATE;
        WHEN 'week' THEN
            v_start_date := CURRENT_DATE - INTERVAL '6 days';
            v_end_date := CURRENT_DATE;
        WHEN 'month' THEN
            v_start_date := DATE_TRUNC('month', CURRENT_DATE);
            v_end_date := CURRENT_DATE;
        ELSE
            v_start_date := CURRENT_DATE;
            v_end_date := CURRENT_DATE;
    END CASE;
    
    SELECT json_build_object(
        'period_type', period_type,
        'period_start', v_start_date,
        'period_end', v_end_date,
        'statistics', (
            SELECT json_build_object(
                'total_employees', (SELECT COUNT(*) FROM employees WHERE business_id = business_id_param),
                'total_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND start::date BETWEEN v_start_date AND v_end_date),
                'completed_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND completed = true AND completed_at::date BETWEEN v_start_date AND v_end_date),
                'late_tasks', (SELECT COUNT(*) FROM tasks WHERE business_id = business_id_param AND completed = false AND deadline < NOW()),
                'total_materials', (SELECT COUNT(*) FROM materials WHERE business_id = business_id_param),
                'average_rating', COALESCE((SELECT AVG(rating) FROM task_ratings WHERE business_id = business_id_param AND rated_at::date BETWEEN v_start_date AND v_end_date), 0)
            )
        ),
        'top_performers', (
            SELECT json_agg(json_build_object(
                'employee_id', e.id,
                'employee_name', e.name,
                'tasks_completed', COALESCE(task_counts.completed_tasks, 0),
                'average_rating', COALESCE(rating_stats.average_rating, 0)
            ))
            FROM employees e
            LEFT JOIN (
                SELECT 
                    assigned_to,
                    COUNT(*) FILTER (WHERE completed = true) as completed_tasks
                FROM tasks 
                WHERE business_id = business_id_param
                AND completed_at::date BETWEEN v_start_date AND v_end_date
                GROUP BY assigned_to
            ) task_counts ON task_counts.assigned_to = e.name
            LEFT JOIN (
                SELECT 
                    employee_id,
                    AVG(rating) as average_rating
                FROM task_ratings 
                WHERE business_id = business_id_param
                AND rated_at::date BETWEEN v_start_date AND v_end_date
                GROUP BY employee_id
            ) rating_stats ON rating_stats.employee_id = e.id
            WHERE e.business_id = business_id_param
            ORDER BY COALESCE(task_counts.completed_tasks, 0) DESC, COALESCE(rating_stats.average_rating, 0) DESC
            LIMIT 5
        ),
        'recent_tasks', (
            SELECT json_agg(json_build_object(
                'id', t.id,
                'name', t.name,
                'assigned_to', t.assigned_to,
                'completed', t.completed,
                'deadline', t.deadline,
                'completed_at', t.completed_at
            ))
            FROM tasks t
            WHERE t.business_id = business_id_param
            AND t.start::date BETWEEN v_start_date AND v_end_date
            ORDER BY t.start DESC
            LIMIT 10
        )
    ) INTO v_dashboard_data;
    
    RETURN v_dashboard_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on all RPC functions
GRANT EXECUTE ON FUNCTION calculate_performance_metrics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_bulk_performance_metrics(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_performance_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_late_tasks(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_employee_attendance(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_material_usage(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_task_statistics(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_department_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_dashboard_data(UUID, TEXT) TO authenticated;

-- ============================================================================
-- MISSING RLS POLICIES FOR CORE TABLES
-- ============================================================================

-- Enable RLS on core tables if not already enabled
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Materials table RLS policies
CREATE POLICY "Users can view materials for their business" ON materials
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert materials for their business" ON materials
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update materials for their business" ON materials
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete materials for their business" ON materials
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Employees table RLS policies
CREATE POLICY "Users can view employees for their business" ON employees
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert employees for their business" ON employees
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update employees for their business" ON employees
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete employees for their business" ON employees
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Departments table RLS policies
CREATE POLICY "Users can view departments for their business" ON departments
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert departments for their business" ON departments
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update departments for their business" ON departments
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete departments for their business" ON departments
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Tasks table RLS policies
CREATE POLICY "Users can view tasks for their business" ON tasks
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert tasks for their business" ON tasks
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update tasks for their business" ON tasks
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can delete tasks for their business" ON tasks
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Clock events table RLS policies
CREATE POLICY "Users can view clock events for their business" ON clock_events
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can insert clock events for their business" ON clock_events
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update clock events for their business" ON clock_events
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete clock events for their business" ON clock_events
    FOR DELETE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users table RLS policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- ============================================================================
-- CRITICAL PERFORMANCE INDEXES
-- ============================================================================

-- Add indexes on business_id columns for performance
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_employees_business_id ON employees(business_id);
CREATE INDEX IF NOT EXISTS idx_tasks_business_id ON tasks(business_id);
CREATE INDEX IF NOT EXISTS idx_materials_business_id ON materials(business_id);
CREATE INDEX IF NOT EXISTS idx_departments_business_id ON departments(business_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_business_id ON clock_events(business_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_business_id ON task_ratings(business_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_business_id ON performance_metrics(business_id);

-- Add indexes on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_task_ratings_employee_id ON task_ratings(employee_id);
CREATE INDEX IF NOT EXISTS idx_task_ratings_task_id ON task_ratings(task_id);
CREATE INDEX IF NOT EXISTS idx_clock_events_employee_id ON clock_events(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees(name);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

SELECT 'All database fixes applied successfully! RLS policies and indexes created.' as status; 