-- MANUAL FIX FOR SUPABASE - Run this in Supabase SQL Editor
-- This fixes the license scanner database issues

-- STEP 1: Drop existing incorrect policies and view
DROP POLICY IF EXISTS "Users can view vehicle scans from their business" ON public.vehicle_scans;
DROP POLICY IF EXISTS "Users can insert vehicle scans for their business" ON public.vehicle_scans;
DROP POLICY IF EXISTS "Users can update their own scans or admins can update any" ON public.vehicle_scans;
DROP POLICY IF EXISTS "Only admins can delete vehicle scans" ON public.vehicle_scans;
DROP VIEW IF EXISTS public.vehicle_scans_with_user_info;
DROP FUNCTION IF EXISTS get_scan_statistics(UUID);
DROP FUNCTION IF EXISTS check_duplicate_license(VARCHAR(20), UUID, UUID);

-- STEP 2: Create CORRECTED RLS policies using auth.uid()
CREATE POLICY "Users can view vehicle scans from their business" ON public.vehicle_scans
    FOR SELECT
    USING (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid()
        )
    );

CREATE POLICY "Users can insert vehicle scans for their business" ON public.vehicle_scans
    FOR INSERT
    WITH CHECK (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid()
        )
        AND scanned_by = auth.uid()
    );

CREATE POLICY "Users can update their own scans or admins can update any" ON public.vehicle_scans
    FOR UPDATE
    USING (
        scanned_by = auth.uid() 
        OR (
            business_id IN (
                SELECT u.business_id 
                FROM public.users u 
                WHERE u.id = auth.uid() AND u.role = 'admin'
            )
        )
    );

CREATE POLICY "Only admins can delete vehicle scans" ON public.vehicle_scans
    FOR DELETE
    USING (
        business_id IN (
            SELECT u.business_id 
            FROM public.users u 
            WHERE u.id = auth.uid() AND u.role = 'admin'
        )
    );

-- STEP 3: Create the missing view that your service layer needs
CREATE OR REPLACE VIEW public.vehicle_scans_with_user_info AS
SELECT 
    vs.*,
    u.email as scanned_by_email,
    vu.email as verified_by_email,
    b.name as business_name
FROM public.vehicle_scans vs
LEFT JOIN public.users u ON vs.scanned_by = u.id
LEFT JOIN public.users vu ON vs.verified_by = vu.id
LEFT JOIN public.businesses b ON vs.business_id = b.id;

-- STEP 4: Create the statistics function
CREATE OR REPLACE FUNCTION get_scan_statistics(business_uuid UUID)
RETURNS TABLE(
    total_scans BIGINT,
    scans_today BIGINT,
    scans_this_week BIGINT,
    scans_this_month BIGINT,
    unique_scanners BIGINT,
    unique_vehicles BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_scans,
        COUNT(*) FILTER (WHERE DATE(scanned_at) = CURRENT_DATE) as scans_today,
        COUNT(*) FILTER (WHERE scanned_at >= DATE_TRUNC('week', CURRENT_DATE)) as scans_this_week,
        COUNT(*) FILTER (WHERE scanned_at >= DATE_TRUNC('month', CURRENT_DATE)) as scans_this_month,
        COUNT(DISTINCT scanned_by) as unique_scanners,
        COUNT(DISTINCT license_number) as unique_vehicles
    FROM public.vehicle_scans 
    WHERE business_id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 5: Create the duplicate check function
CREATE OR REPLACE FUNCTION check_duplicate_license(
    license_num VARCHAR(20), 
    business_uuid UUID,
    exclude_scan_id UUID DEFAULT NULL
)
RETURNS TABLE(
    scan_id UUID,
    scanned_at TIMESTAMP WITH TIME ZONE,
    scanned_by_email TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        vs.id,
        vs.scanned_at,
        u.email
    FROM public.vehicle_scans vs
    JOIN public.users u ON vs.scanned_by = u.id
    WHERE vs.license_number = license_num 
      AND vs.business_id = business_uuid
      AND (exclude_scan_id IS NULL OR vs.id != exclude_scan_id)
    ORDER BY vs.scanned_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Ensure proper permissions
GRANT SELECT ON public.vehicle_scans_with_user_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_scan_statistics(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_duplicate_license(VARCHAR(20), UUID, UUID) TO authenticated;
