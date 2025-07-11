-- ShopFlow Database Schema Analysis Script
-- Run this in Supabase SQL Editor to analyze your database

-- ============================================================================
-- 1. TABLE RELATIONSHIPS ANALYSIS
-- ============================================================================

-- Check all foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- Check for missing foreign key indexes
SELECT 
    t.table_name,
    c.column_name,
    'Missing index on foreign key' as issue
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND c.column_name LIKE '%_id'
    AND c.column_name != 'id'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = t.table_name 
        AND indexdef LIKE '%' || c.column_name || '%'
    );

-- ============================================================================
-- 2. TRIGGERS ANALYSIS
-- ============================================================================

-- List all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Check for auth.uid() usage in triggers
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND pg_get_functiondef(p.oid) LIKE '%auth.uid()%';

-- ============================================================================
-- 3. RLS POLICIES ANALYSIS
-- ============================================================================

-- Check RLS status for all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check for multiple permissive policies
SELECT 
    tablename,
    COUNT(*) as policy_count,
    'Multiple policies on same table' as issue
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 3;

-- Check for auth.uid() usage in policies
SELECT 
    tablename,
    policyname,
    qual,
    'Uses auth.uid()' as auth_check
FROM pg_policies
WHERE schemaname = 'public'
    AND qual LIKE '%auth.uid()%';

-- ============================================================================
-- 4. DATABASE FUNCTIONS ANALYSIS
-- ============================================================================

-- List all functions with security settings
SELECT 
    p.proname as function_name,
    p.prosecdef as security_definer,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Check for SECURITY DEFINER functions
SELECT 
    p.proname as function_name,
    'SECURITY DEFINER function' as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prosecdef = true;

-- ============================================================================
-- 5. INDEXES ANALYSIS
-- ============================================================================

-- List all indexes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check for missing indexes on frequently queried columns
SELECT 
    t.table_name,
    c.column_name,
    'Consider index on business_id' as recommendation
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND c.column_name = 'business_id'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = t.table_name 
        AND indexdef LIKE '%business_id%'
    );

-- Check for duplicate indexes
SELECT 
    tablename,
    indexname,
    indexdef,
    'Potential duplicate' as issue
FROM pg_indexes p1
WHERE schemaname = 'public'
    AND EXISTS (
        SELECT 1 FROM pg_indexes p2
        WHERE p2.schemaname = 'public'
        AND p2.tablename = p1.tablename
        AND p2.indexname != p1.indexname
        AND p2.indexdef = p1.indexdef
    );

-- ============================================================================
-- 6. AUTH SCHEMA INTEGRATION
-- ============================================================================

-- Check auth.users trigger
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
    AND event_object_table = 'users';

-- Check for proper user table linking
SELECT 
    'users table exists' as check_name,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) as exists
UNION ALL
SELECT 
    'users table has auth.uid() link',
    EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND qual LIKE '%auth.uid()%'
    );

-- ============================================================================
-- 7. PERFORMANCE ANALYSIS
-- ============================================================================

-- Check for potential N+1 query patterns
SELECT 
    'Task ratings with employee lookup' as potential_n1,
    'Consider JOIN in RLS policy' as recommendation
WHERE EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'task_ratings' 
    AND qual LIKE '%employees%'
);

-- Check for missing indexes on RLS policy columns
SELECT 
    p.tablename,
    p.policyname,
    'RLS policy uses business_id without index' as issue
FROM pg_policies p
WHERE p.schemaname = 'public'
    AND p.qual LIKE '%business_id%'
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes i
        WHERE i.tablename = p.tablename
        AND i.indexdef LIKE '%business_id%'
    );

-- ============================================================================
-- 8. DATA INTEGRITY CHECKS
-- ============================================================================

-- Check for orphaned records
SELECT 
    'Orphaned task_ratings' as issue,
    COUNT(*) as count
FROM task_ratings tr
LEFT JOIN tasks t ON tr.task_id = t.id
WHERE t.id IS NULL
UNION ALL
SELECT 
    'Orphaned employees',
    COUNT(*)
FROM employees e
LEFT JOIN businesses b ON e.business_id = b.id
WHERE b.id IS NULL
UNION ALL
SELECT 
    'Orphaned tasks',
    COUNT(*)
FROM tasks t
LEFT JOIN businesses b ON t.business_id = b.id
WHERE b.id IS NULL;

-- Check for NULL business_id values
SELECT 
    'Users with NULL business_id' as issue,
    COUNT(*) as count
FROM users
WHERE business_id IS NULL
UNION ALL
SELECT 
    'Employees with NULL business_id',
    COUNT(*)
FROM employees
WHERE business_id IS NULL
UNION ALL
SELECT 
    'Tasks with NULL business_id',
    COUNT(*)
FROM tasks
WHERE business_id IS NULL;

-- ============================================================================
-- 9. RECOMMENDED FIXES
-- ============================================================================

-- Generate recommended indexes
SELECT 
    'CREATE INDEX IF NOT EXISTS idx_' || table_name || '_business_id ON ' || table_name || '(business_id);' as recommended_index
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN ('users', 'employees', 'tasks', 'materials', 'task_ratings', 'performance_metrics')
    AND NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = table_name 
        AND indexdef LIKE '%business_id%'
    );

-- Generate recommended RLS policy improvements
SELECT 
    'Consider adding DELETE policy to ' || tablename as recommendation
FROM pg_tables
WHERE schemaname = 'public'
    AND rowsecurity = true
    AND tablename NOT IN (
        SELECT DISTINCT tablename FROM pg_policies 
        WHERE schemaname = 'public' AND cmd = 'DELETE'
    );

-- ============================================================================
-- 10. SUMMARY REPORT
-- ============================================================================

SELECT 
    'Database Analysis Complete' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as total_indexes,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as total_triggers; 