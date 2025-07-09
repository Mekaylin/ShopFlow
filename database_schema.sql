-- Task Ratings and Performance Management System

-- 1. Task Ratings Table
CREATE TABLE IF NOT EXISTS task_ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    rated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE
);

-- 2. Performance Settings Table
CREATE TABLE IF NOT EXISTS performance_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE UNIQUE,
    rating_system_enabled BOOLEAN DEFAULT true,
    auto_rate_completed_tasks BOOLEAN DEFAULT false,
    default_rating INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Performance Metrics Table (for caching calculated metrics)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    period_type TEXT CHECK (period_type IN ('day', 'week', 'month')),
    period_start DATE,
    period_end DATE,
    tasks_completed INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0,
    total_rating INTEGER DEFAULT 0,
    tasks_rated INTEGER DEFAULT 0,
    performance_score DECIMAL(5,2) DEFAULT 0,
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, business_id, period_type, period_start)
);

-- Departments table for business-linked departments
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business_id uuid references businesses(id) on delete cascade not null,
  inserted_at timestamp with time zone default timezone('utc', now()),
  unique (business_id, name)
);

-- 4. RLS Policies for Task Ratings
ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ratings for their business" ON task_ratings
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert ratings for their business" ON task_ratings
    FOR INSERT WITH CHECK (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update ratings for their business" ON task_ratings
    FOR UPDATE USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. RLS Policies for Performance Settings
ALTER TABLE performance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance settings for their business" ON performance_settings
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage performance settings for their business" ON performance_settings
    FOR ALL USING (
        business_id IN (
            SELECT business_id FROM users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 6. RLS Policies for Performance Metrics
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view performance metrics for their business" ON performance_metrics
    FOR SELECT USING (
        business_id IN (
            SELECT business_id FROM users WHERE id = auth.uid()
        )
    );

-- 7. Function to calculate performance metrics
CREATE OR REPLACE FUNCTION calculate_performance_metrics(
    p_employee_id UUID,
    p_business_id UUID,
    p_period_type TEXT,
    p_start_date DATE,
    p_end_date DATE
) RETURNS VOID AS $$
DECLARE
    v_tasks_completed INTEGER;
    v_average_rating DECIMAL(3,2);
    v_total_rating INTEGER;
    v_tasks_rated INTEGER;
    v_performance_score DECIMAL(5,2);
BEGIN
    -- Count completed tasks in period
    SELECT COUNT(*)
    INTO v_tasks_completed
    FROM tasks t
    WHERE t.assigned_to = (SELECT name FROM employees WHERE id = p_employee_id)
    AND t.completed = true
    AND t.completed_at::date BETWEEN p_start_date AND p_end_date
    AND t.business_id = p_business_id;

    -- Calculate average rating
    SELECT 
        COALESCE(AVG(tr.rating), 0),
        COALESCE(SUM(tr.rating), 0),
        COUNT(tr.rating)
    INTO v_average_rating, v_total_rating, v_tasks_rated
    FROM task_ratings tr
    WHERE tr.employee_id = p_employee_id
    AND tr.business_id = p_business_id
    AND tr.rated_at::date BETWEEN p_start_date AND p_end_date;

    -- Calculate performance score (weighted: 70% tasks completed, 30% average rating)
    v_performance_score = (v_tasks_completed * 0.7) + (v_average_rating * 0.3);

    -- Insert or update performance metrics
    INSERT INTO performance_metrics (
        employee_id, business_id, period_type, period_start, period_end,
        tasks_completed, average_rating, total_rating, tasks_rated, performance_score, last_calculated
    ) VALUES (
        p_employee_id, p_business_id, p_period_type, p_start_date, p_end_date,
        v_tasks_completed, v_average_rating, v_total_rating, v_tasks_rated, v_performance_score, NOW()
    )
    ON CONFLICT (employee_id, business_id, period_type, period_start)
    DO UPDATE SET
        tasks_completed = EXCLUDED.tasks_completed,
        average_rating = EXCLUDED.average_rating,
        total_rating = EXCLUDED.total_rating,
        tasks_rated = EXCLUDED.tasks_rated,
        performance_score = EXCLUDED.performance_score,
        last_calculated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to auto-rate completed tasks (if enabled)
CREATE OR REPLACE FUNCTION auto_rate_completed_task()
RETURNS TRIGGER AS $$
DECLARE
    v_business_id UUID;
    v_default_rating INTEGER;
    v_auto_rate_enabled BOOLEAN;
BEGIN
    -- Only trigger on task completion
    IF NEW.completed = true AND OLD.completed = false THEN
        -- Get business ID and settings
        SELECT t.business_id, ps.auto_rate_completed_tasks, ps.default_rating
        INTO v_business_id, v_auto_rate_enabled, v_default_rating
        FROM tasks t
        LEFT JOIN performance_settings ps ON ps.business_id = t.business_id
        WHERE t.id = NEW.id;

        -- Auto-rate if enabled
        IF v_auto_rate_enabled = true THEN
            INSERT INTO task_ratings (task_id, employee_id, admin_id, rating, business_id)
            SELECT 
                NEW.id,
                e.id,
                u.id,
                v_default_rating,
                v_business_id
            FROM employees e
            CROSS JOIN users u
            WHERE e.name = NEW.assigned_to
            AND e.business_id = v_business_id
            AND u.business_id = v_business_id
            AND u.role = 'admin'
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER trigger_auto_rate_completed_task
    AFTER UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION auto_rate_completed_task();

-- 9. Insert default performance settings for existing businesses
INSERT INTO performance_settings (business_id, rating_system_enabled, auto_rate_completed_tasks, default_rating)
SELECT id, true, false, 3
FROM businesses
ON CONFLICT (business_id) DO NOTHING; 